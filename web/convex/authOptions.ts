import { Password } from "@convex-dev/auth/providers/Password";

const DEFAULT_ADMIN_EMAIL = "admin@candidai.dev";

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : undefined;
}

function deriveName(email: string, value: unknown) {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return email.split("@")[0];
}

export default {
  providers: [
    Password({
      profile(params) {
        const email = normalizeEmail(params.email);
        if (!email) {
          throw new Error("Email is required");
        }
        return {
          email,
          name: deriveName(email, params.name),
        };
      },
    }),
  ],
  callbacks: {
    async createOrUpdateUser(ctx: any, args: any) {
      const email = normalizeEmail(args.profile.email);
      if (!email) {
        throw new Error("Email is required");
      }

      const adminEmail = (
        process.env.CANDIDAI_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL
      ).toLowerCase();
      const role = email === adminEmail ? "admin" : "candidate";
      const now = Date.now();

      if (args.existingUserId) {
        await ctx.db.patch(args.existingUserId, {
          email,
          image:
            typeof args.profile.image === "string" ? args.profile.image : undefined,
          lastSeenAt: now,
          name: deriveName(email, args.profile.name),
          role,
        });
        return args.existingUserId;
      }

      return await ctx.db.insert("users", {
        createdAt: now,
        email,
        image:
          typeof args.profile.image === "string" ? args.profile.image : undefined,
        name: deriveName(email, args.profile.name),
        role,
      });
    },
  },
};
