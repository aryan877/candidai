import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  findInterviewByCallId,
  requireInterviewAccess,
} from "./lib/authz";

export const add = mutation({
  args: {
    interviewId: v.id("interviews"),
    challengeTitle: v.string(),
    language: v.string(),
    code: v.string(),
    output: v.optional(v.string()),
    passed: v.optional(v.boolean()),
    feedback: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const interview = await ctx.db.get(args.interviewId);
    if (!interview) {
      throw new Error("Interview not found");
    }
    await requireInterviewAccess(ctx, interview);

    const id = await ctx.db.insert("codeSubmissions", {
      interviewId: args.interviewId,
      challengeTitle: args.challengeTitle,
      language: args.language,
      code: args.code,
      output: args.output,
      passed: args.passed,
      feedback: args.feedback,
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
      .query("codeSubmissions")
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
      .query("codeSubmissions")
      .withIndex("by_interview", (q) => q.eq("interviewId", interview._id))
      .collect();
  },
});
