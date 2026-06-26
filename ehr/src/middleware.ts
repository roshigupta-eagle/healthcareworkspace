import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow the root landing page to be public (restore intro/first page)
  if (pathname === "/") {
    return NextResponse.next();
  }

  // Public routes
  const publicRoutes = ["/login", "/register", "/api/auth", "/api/register"];
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow Playwright-driven tests to bypass auth in non-production environments.
  // Tests should set the `x-playwright: 1` header when navigating.
  if (process.env.NODE_ENV !== 'production') {
    if (req.headers.get('x-playwright') === '1') return NextResponse.next();
    if (req.nextUrl.searchParams.get('playwright') === '1') return NextResponse.next();
  }

  // Check authentication
  if (!req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Role-based route protection
  const role = req.auth.user?.role;

  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  if (pathname.startsWith("/doctor") && role !== "DOCTOR" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
