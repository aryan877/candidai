import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  findInterviewByCallId,
  requireAdmin,
  requireInterviewAccess,
  requireViewer,
} from "./lib/authz";

export const add = mutation({
  args: {
    interviewId: v.id("interviews"),
    category: v.string(),
    severity: v.number(),
    description: v.string(),
    transcriptSnippet: v.optional(v.string()),
    postureScore: v.optional(v.number()),
    fidgetingLevel: v.optional(v.number()),
    eyeContactScore: v.optional(v.number()),
    phase: v.optional(v.string()),
    timestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const interview = await ctx.db.get(args.interviewId);
    if (!interview) {
      throw new Error("Interview not found");
    }
    await requireInterviewAccess(ctx, interview);

    return await ctx.db.insert("cheatingIncidents", {
      interviewId: args.interviewId,
      category: args.category,
      severity: Math.max(1, Math.min(10, Math.round(args.severity))),
      description: args.description,
      transcriptSnippet: args.transcriptSnippet,
      postureScore: args.postureScore,
      fidgetingLevel: args.fidgetingLevel,
      eyeContactScore: args.eyeContactScore,
      phase: args.phase,
      reviewed: false,
      timestamp: args.timestamp ?? Date.now(),
    });
  },
});

export const getByInterview = query({
  args: {
    interviewId: v.id("interviews"),
  },
  handler: async (ctx, args) => {
    const interview = await ctx.db.get(args.interviewId);
    if (!interview) return [];
    await requireInterviewAccess(ctx, interview);

    return await ctx.db
      .query("cheatingIncidents")
      .withIndex("by_interview_timestamp", (q) =>
        q.eq("interviewId", args.interviewId)
      )
      .order("desc")
      .collect();
  },
});

export const getByCallId = query({
  args: {
    callId: v.string(),
  },
  handler: async (ctx, args) => {
    const interview = await findInterviewByCallId(ctx, args.callId);
    if (!interview) return [];
    await requireInterviewAccess(ctx, interview);

    return await ctx.db
      .query("cheatingIncidents")
      .withIndex("by_interview_timestamp", (q) =>
        q.eq("interviewId", interview._id)
      )
      .order("desc")
      .collect();
  },
});

export const markReviewed = mutation({
  args: {
    incidentId: v.id("cheatingIncidents"),
    reviewed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    await ctx.db.patch(args.incidentId, {
      reviewed: args.reviewed,
      reviewedBy: args.reviewed ? admin._id : undefined,
    });
  },
});

export const myOpenIncidents = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireViewer(ctx);
    const interviews = await (async () => {
      if (user.role === "admin") return await ctx.db.query("interviews").collect();
      const [created, joined] = await Promise.all([
        ctx.db
          .query("interviews")
          .withIndex("by_creator", (q) => q.eq("createdBy", user._id))
          .collect(),
        ctx.db
          .query("interviews")
          .withIndex("by_candidate", (q) => q.eq("candidateUserId", user._id))
          .collect(),
      ]);
      return Array.from(
        new Map([...created, ...joined].map((doc) => [doc._id, doc])).values()
      );
    })();

    const incidents = await Promise.all(
      interviews.map((interview) =>
        ctx.db
          .query("cheatingIncidents")
          .withIndex("by_interview_reviewed", (q) =>
            q.eq("interviewId", interview._id).eq("reviewed", false)
          )
          .collect()
      )
    );

    return incidents.flat();
  },
});
