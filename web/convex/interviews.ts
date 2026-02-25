import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import {
  hasInterviewAccess,
  requireAdmin,
  requireInterviewAccess,
  requireInterviewByCallId,
  requireViewer,
} from "./lib/authz";

const interviewType = v.union(
  v.literal("technical"),
  v.literal("behavioral"),
  v.literal("system-design"),
  v.literal("full")
);

function randomToken(prefix: string) {
  const entropy = Math.random().toString(36).slice(2, 12);
  return `${prefix}-${Date.now().toString(36)}-${entropy}`;
}

export const createInvite = mutation({
  args: {
    type: interviewType,
    candidateEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireViewer(ctx);
    const callId = randomToken("interview");
    const inviteToken = randomToken("invite");
    const createdAt = Date.now();

    const interviewId = await ctx.db.insert("interviews", {
      callId,
      inviteToken,
      createdBy: user._id,
      candidateEmail: args.candidateEmail?.trim().toLowerCase(),
      type: args.type,
      status: "waiting",
      createdAt,
    });

    return {
      interviewId,
      callId,
      inviteToken,
    };
  },
});

export const ensureForCall = mutation({
  args: {
    callId: v.string(),
    type: v.optional(interviewType),
    inviteToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireViewer(ctx);
    const interview = await ctx.db
      .query("interviews")
      .withIndex("by_call_id", (q) => q.eq("callId", args.callId))
      .first();

    const now = Date.now();

    if (!interview) {
      const interviewId = await ctx.db.insert("interviews", {
        callId: args.callId,
        inviteToken: args.inviteToken ?? randomToken("invite"),
        createdBy: user._id,
        candidateUserId: user._id,
        candidateEmail: user.email ?? undefined,
        type: args.type ?? "full",
        status: "active",
        createdAt: now,
        startedAt: now,
      });
      return interviewId;
    }

    const canAccessWithoutInvite = hasInterviewAccess(user, interview);
    if (!canAccessWithoutInvite) {
      if (!args.inviteToken || args.inviteToken !== interview.inviteToken) {
        throw new ConvexError("Invalid interview invite");
      }
      if (interview.candidateUserId && interview.candidateUserId !== user._id) {
        throw new ConvexError("Invite already claimed by another candidate");
      }
      await ctx.db.patch(interview._id, {
        candidateUserId: user._id,
        candidateEmail: user.email ?? interview.candidateEmail,
      });
    }

    if (interview.status === "waiting") {
      await ctx.db.patch(interview._id, {
        status: "active",
        startedAt: interview.startedAt ?? now,
      });
    }

    return interview._id;
  },
});

export const get = query({
  args: {
    interviewId: v.id("interviews"),
  },
  handler: async (ctx, args) => {
    const interview = await ctx.db.get(args.interviewId);
    if (!interview) return null;
    await requireInterviewAccess(ctx, interview);
    return interview;
  },
});

export const getByCallId = query({
  args: {
    callId: v.string(),
  },
  handler: async (ctx, args) => {
    const interview = await requireInterviewByCallId(ctx, args.callId);
    await requireInterviewAccess(ctx, interview);
    return interview;
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireViewer(ctx);

    if (user.role === "admin") {
      return await ctx.db.query("interviews").order("desc").take(200);
    }

    const [created, participated] = await Promise.all([
      ctx.db
        .query("interviews")
        .withIndex("by_creator", (q) => q.eq("createdBy", user._id))
        .collect(),
      ctx.db
        .query("interviews")
        .withIndex("by_candidate", (q) => q.eq("candidateUserId", user._id))
        .collect(),
    ]);

    const all = [...created, ...participated];
    const deduped = Array.from(new Map(all.map((row) => [row._id, row])).values());
    deduped.sort((a, b) => b.createdAt - a.createdAt);
    return deduped;
  },
});

export const adminOverview = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const interviews = await ctx.db
      .query("interviews")
      .order("desc")
      .take(Math.min(args.limit ?? 100, 250));

    const rows = await Promise.all(
      interviews.map(async (interview) => {
        const [creator, candidate, incidents, report] = await Promise.all([
          ctx.db.get(interview.createdBy),
          interview.candidateUserId ? ctx.db.get(interview.candidateUserId) : null,
          ctx.db
            .query("cheatingIncidents")
            .withIndex("by_interview_timestamp", (q) =>
              q.eq("interviewId", interview._id)
            )
            .order("desc")
            .collect(),
          ctx.db
            .query("reports")
            .withIndex("by_interview", (q) => q.eq("interviewId", interview._id))
            .first(),
        ]);

        return {
          interview,
          creator: creator
            ? {
                _id: creator._id,
                email: creator.email ?? null,
                name: creator.name ?? null,
              }
            : null,
          candidate: candidate
            ? {
                _id: candidate._id,
                email: candidate.email ?? null,
                name: candidate.name ?? null,
              }
            : null,
          incidentCount: incidents.length,
          latestIncident: incidents[0] ?? null,
          hasReport: !!report,
        };
      })
    );

    const totalInterviews = rows.length;
    const totalIncidents = rows.reduce((sum, row) => sum + row.incidentCount, 0);
    const activeInterviews = rows.filter(
      (row) => row.interview.status === "active"
    ).length;

    return {
      stats: {
        totalInterviews,
        totalIncidents,
        activeInterviews,
      },
      rows,
    };
  },
});

export const updateStatus = mutation({
  args: {
    interviewId: v.id("interviews"),
    status: v.union(
      v.literal("waiting"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    const interview = await ctx.db.get(args.interviewId);
    if (!interview) throw new ConvexError("Interview not found");
    await requireInterviewAccess(ctx, interview);

    const now = Date.now();
    const updates: Record<string, unknown> = { status: args.status };
    if (args.status === "active" && !interview.startedAt) {
      updates.startedAt = now;
    }
    if (args.status === "completed" || args.status === "cancelled") {
      updates.endedAt = now;
    }
    await ctx.db.patch(args.interviewId, updates);
  },
});

export const updatePhase = mutation({
  args: {
    interviewId: v.id("interviews"),
    phase: v.string(),
  },
  handler: async (ctx, args) => {
    const interview = await ctx.db.get(args.interviewId);
    if (!interview) throw new ConvexError("Interview not found");
    await requireInterviewAccess(ctx, interview);
    await ctx.db.patch(args.interviewId, { phase: args.phase });
  },
});

export const setRecordingUrl = mutation({
  args: {
    interviewId: v.id("interviews"),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const interview = await ctx.db.get(args.interviewId);
    if (!interview) throw new ConvexError("Interview not found");
    await requireInterviewAccess(ctx, interview);
    await ctx.db.patch(args.interviewId, { recordingUrl: args.url });
  },
});
