import { convexAuth } from "@convex-dev/auth/server";
import authConfig from "./authOptions";

export const { auth, signIn, signOut, store, isAuthenticated } =
  convexAuth(authConfig);
