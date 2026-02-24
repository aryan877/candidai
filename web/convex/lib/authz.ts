import { ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type Ctx = QueryCtx | MutationCtx;

export async function requireViewer(ctx: Ctx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new ConvexError("Unauthorized");
  }

  const user = await ctx.db.get(userId);
  if (!user) {
    throw new ConvexError("User not found");
  }

  return user;
}

export async function requireAdmin(ctx: Ctx) {
  const user = await requireViewer(ctx);
  if (user.role !== "admin") {
    throw new ConvexError("Forbidden");
  }
  return user;
}

export function hasInterviewAccess(user: Doc<"users">, interview: Doc<"interviews">) {
  if (user.role === "admin") return true;
  if (interview.createdBy === user._id) return true;
  if (interview.candidateUserId === user._id) return true;
  return false;
}

export async function requireInterviewAccess(
  ctx: Ctx,
  interview: Doc<"interviews">
) {
  const user = await requireViewer(ctx);
  if (!hasInterviewAccess(user, interview)) {
    throw new ConvexError("Forbidden");
  }
  return user;
}

export async function requireInterviewByCallId(ctx: Ctx, callId: string) {
  const interview = await findInterviewByCallId(ctx, callId);
  if (!interview) {
    throw new ConvexError("Interview not found");
  }
  return interview;
}

export async function findInterviewByCallId(ctx: Ctx, callId: string) {
  const interview = await ctx.db
    .query("interviews")
    .withIndex("by_call_id", (q) => q.eq("callId", callId))
    .first();
  return interview;
}
