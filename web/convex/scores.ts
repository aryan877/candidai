import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  findInterviewByCallId,
  requireInterviewAccess,
} from "./lib/authz";

export const add = mutation({
  args: {
    interviewId: v.id("interviews"),
    dimension: v.string(),
    score: v.number(),
    feedback: v.string(),
    questionText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const interview = await ctx.db.get(args.interviewId);
    if (!interview) {
      throw new Error("Interview not found");
    }
    await requireInterviewAccess(ctx, interview);

    const id = await ctx.db.insert("scores", {
      interviewId: args.interviewId,
      dimension: args.dimension,
      score: args.score,
      feedback: args.feedback,
      questionText: args.questionText,
      createdAt: Date.now(),
    });
    return id;
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
      .query("scores")
      .withIndex("by_interview", (q) => q.eq("interviewId", args.interviewId))
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
      .query("scores")
      .withIndex("by_interview", (q) => q.eq("interviewId", interview._id))
      .collect();
  },
});
