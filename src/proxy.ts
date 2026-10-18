import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PREFIXES = [
  "/api/auth",
  "/_next",
  "/favicon",
  "/apple-touch-icon",
  "/android-chrome",
  "/mstile",
  "/site.webmanifest",
  "/browserconfig.xml",
  "/robots.txt",
  "/sitemap.xml",
  "/images",
  "/icons",
  "/fonts",
];

// Public pages that do not require authentication
const PUBLIC_PAGES = ["/", "/signin", "/singin"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Always allow static assets, favicon/manifest files, API auth endpoints, and fonts
  if (
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    /\.(ico|png|jpg|jpeg|svg|webp|webmanifest|xml|txt)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  // 2. Read JWT session token
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  });

  // 3. If an authenticated user visits /signin or /singin, redirect them to dashboard
  if (pathname === "/signin" || pathname === "/singin") {
    if (token) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // 4. Allow public landing pages
  if (PUBLIC_PAGES.includes(pathname)) {
    return NextResponse.next();
  }

  // 5. Protected routes require an active session
  if (!token) {
    const signInUrl = new URL("/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest|xml|txt)$).*)",
  ],
};
