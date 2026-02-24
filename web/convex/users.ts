import { mutation, query } from "./_generated/server";
import { requireAdmin, requireViewer } from "./lib/authz";

function streamIdFromUserId(userId: string) {
  return `user_${userId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    return await requireViewer(ctx);
  },
});

export const viewerOptional = query({
  args: {},
  handler: async (ctx) => {
    try {
      return await requireViewer(ctx);
    } catch {
      return null;
    }
  },
});

export const ensureStreamIdentity = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireViewer(ctx);
    const streamUserId = user.streamUserId ?? streamIdFromUserId(user._id);

    if (!user.streamUserId) {
      await ctx.db.patch(user._id, {
        streamUserId,
        lastSeenAt: Date.now(),
      });
    }

    return {
      email: user.email ?? null,
      name: user.name ?? user.email?.split("@")[0] ?? "Candidate",
      role: user.role,
      streamUserId,
      userId: user._id,
    };
  },
});

export const listCandidates = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "candidate"))
      .collect();
  },
});
