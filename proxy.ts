import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

/**
 * Public routes: home (landing or gated in page), auth UI, unauthorized screen.
 * All other routes require a Clerk session at the edge.
 */
const isPublicRoute = createRouteMatcher([
  "/",
  "/unauthorized(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/sso-callback(.*)",
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
