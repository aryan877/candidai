import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  findInterviewByCallId,
  requireInterviewAccess,
} from "./lib/authz";

export const add = mutation({
  args: {
    interviewId: v.id("interviews"),
    postureScore: v.number(),
    fidgetingLevel: v.number(),
    eyeContactScore: v.number(),
    isSuspicious: v.boolean(),
    notes: v.optional(v.string()),
    timestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const interview = await ctx.db.get(args.interviewId);
    if (!interview) {
      throw new Error("Interview not found");
    }
    await requireInterviewAccess(ctx, interview);

    return await ctx.db.insert("bodyLanguageSnapshots", {
      interviewId: args.interviewId,
      postureScore: args.postureScore,
      fidgetingLevel: args.fidgetingLevel,
      eyeContactScore: args.eyeContactScore,
      isSuspicious: args.isSuspicious,
      notes: args.notes,
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
      .query("bodyLanguageSnapshots")
      .withIndex("by_interview_timestamp", (q) =>
        q.eq("interviewId", args.interviewId)
      )
      .order("asc")
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
      .query("bodyLanguageSnapshots")
      .withIndex("by_interview_timestamp", (q) =>
        q.eq("interviewId", interview._id)
      )
      .order("asc")
      .collect();
  },
});
