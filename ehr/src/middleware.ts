import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const searchParams = req.nextUrl.searchParams;
  const previewActor = process.env.NODE_ENV !== 'production' && (['1', 'true'].includes(searchParams.get('noauth') || '') || searchParams.get('asUser') === 'dev' || searchParams.get('asUser') === 'dev-doctor');

  // Allow dev bypass for doctor view when ?noauth=1 is present
  if (pathname.startsWith('/doctor') && previewActor) {
    return NextResponse.next();
  }

  const previewWorkspacePaths = ['/dashboard/tasks', '/dashboard/messages', '/dashboard/documents'];
  if (previewActor && previewWorkspacePaths.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return NextResponse.next();
  }

  const previewClinicalPaths = ['/dashboard/appointments', '/dashboard/encounters', '/dashboard/records', '/dashboard/orders', '/dashboard/patients', '/schedule/today', '/communication'];
  if (previewActor && previewClinicalPaths.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return NextResponse.next();
  }

  const previewWorkspaceApiPaths = ['/api/doctor-view', '/api/doctor-work-summary', '/api/doctor/work', '/api/doctor/messages', '/api/doctor/documents', '/api/alerts/acknowledge', '/api/health-records', '/api/scheduling', '/api/communication', '/api/tasks', '/api/patients'];
  if (previewActor && previewWorkspaceApiPaths.some((route) => pathname === route || pathname.startsWith(`${route}/`)) && !req.auth) {
    return NextResponse.next();
  }

  // Public — no auth required
  if (pathname === "/") return NextResponse.next();
  const publicRoutes = ["/login", "/register", "/api/auth", "/api/register", "/scheduling", "/docs", "/debug"];

  // Redirect login/register to doctor view (dev convenience)
  if (pathname === '/login' || pathname === '/register') {
    return NextResponse.redirect(new URL('/doctor?noauth=1', req.url));
  }

  if (publicRoutes.some((r) => pathname.startsWith(r))) return NextResponse.next();

  // Playwright / E2E bypass is gated behind explicit env enable + allowlist
  const enableE2EBypass = process.env.ENABLE_E2E_BYPASS === "true";
  const bypassAllowlist = (process.env.E2E_BYPASS_ALLOWLIST || "").split(",").map(s => s.trim()).filter(Boolean);

  if (process.env.NODE_ENV !== "production" && enableE2EBypass) {
    if (req.headers.get("x-playwright") === "1") return NextResponse.next();
    if (req.nextUrl.searchParams.get("playwright") === "1") return NextResponse.next();
    const asUser = req.nextUrl.searchParams.get("asUser");
    if (asUser && bypassAllowlist.includes(asUser)) return NextResponse.next();

    const allowedPaths = bypassAllowlist.filter(p => p.startsWith("/"));
    const devAllowed = allowedPaths.length ? allowedPaths : ["/dashboard/encounters", "/dashboard/appointments", "/dashboard/records", "/dashboard"];
    if (devAllowed.some((r) => req.nextUrl.pathname.startsWith(r))) return NextResponse.next();
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
