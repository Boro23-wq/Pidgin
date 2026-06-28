import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)", "/waitlist(.*)", "/api/waitlist(.*)"]);

const SIGN_IN_URL = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ?? "http://localhost:3000/sign-in";

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect({ unauthenticatedUrl: SIGN_IN_URL });
  }
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
