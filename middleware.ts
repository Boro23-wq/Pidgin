import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/waitlist(.*)",
  "/accept-invite(.*)",
  "/api/waitlist(.*)",
  "/api/invite/(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Gate /sign-up — requires a valid invite_code cookie set by /api/invite/validate
  if (req.nextUrl.pathname.startsWith("/sign-up")) {
    const inviteCookie = req.cookies.get("invite_code");
    if (!inviteCookie) {
      return NextResponse.redirect(new URL("/waitlist", req.url));
    }
  }

  if (!isPublicRoute(req)) {
    await auth.protect({
      unauthenticatedUrl: new URL("/sign-in", req.url).toString(),
    });
  }
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
