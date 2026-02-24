import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/interview(.*)",
  "/report(.*)",
  "/admin(.*)",
]);
const isAuthRoute = createRouteMatcher("/sign-in(.*)");

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const isAuthenticated = await convexAuth.isAuthenticated();

  if (isProtectedRoute(request) && !isAuthenticated) {
    const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    return nextjsMiddlewareRedirect(
      request,
      `/sign-in?next=${encodeURIComponent(nextPath)}`
    );
  }

  if (isAuthRoute(request) && isAuthenticated) {
    return nextjsMiddlewareRedirect(request, "/dashboard");
  }
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
