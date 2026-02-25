import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  findInterviewByCallId,
  requireInterviewAccess,
} from "./lib/authz";

export const add = mutation({
  args: {
    interviewId: v.id("interviews"),
    speaker: v.string(),
    content: v.string(),
    phase: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const interview = await ctx.db.get(args.interviewId);
    if (!interview) {
      throw new Error("Interview not found");
    }
    await requireInterviewAccess(ctx, interview);

    const id = await ctx.db.insert("transcripts", {
      interviewId: args.interviewId,
      speaker: args.speaker,
      content: args.content,
      phase: args.phase,
      timestamp: Date.now(),
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
      .query("transcripts")
      .withIndex("by_interview", (q) => q.eq("interviewId", args.interviewId))
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
      .query("transcripts")
      .withIndex("by_interview", (q) => q.eq("interviewId", interview._id))
      .order("asc")
      .collect();
  },
});
