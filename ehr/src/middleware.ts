import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Public — no auth required
  if (pathname === "/") return NextResponse.next();
  const publicRoutes = ["/login", "/register", "/api/auth", "/api/register", "/scheduling", "/docs"];
  if (publicRoutes.some((r) => pathname.startsWith(r))) return NextResponse.next();

  // Playwright E2E bypass (non-production only)
  if (process.env.NODE_ENV !== "production") {
    if (req.headers.get("x-playwright") === "1") return NextResponse.next();
    if (req.nextUrl.searchParams.get("playwright") === "1") return NextResponse.next();
    // Dev preview shortcut: allow ?asUser=USER_ID to bypass auth for local testing
    if (req.nextUrl.searchParams.get("asUser")) return NextResponse.next();
  }

  // Must be authenticated
  if (!req.auth) return NextResponse.redirect(new URL("/login", req.url));

  const role = req.auth.user?.role as string | undefined;

  // EPIC-SEC-02: PENDING users cannot access any protected route
  if (role === "PENDING") {
    return NextResponse.redirect(new URL("/pending-approval", req.url));
  }

  // Admin-only routes
  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  // Doctor / clinical routes
  if (pathname.startsWith("/doctor") && role !== "DOCTOR" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  // Triage — nurses and doctors
  if (pathname.startsWith("/triage") && !["NURSE","DOCTOR","ADMIN"].includes(role ?? "")) {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};