import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { SIGN_IN_PATHS, homePathForRole } from '@/lib/roleHome';
import { authorizePatientApi, parsePatientScopedPath } from '@/lib/patientAccessPolicy';
import { canAccessPatientRecord } from '@/lib/patientCareTeam';

// Runs on the Node.js runtime (Next.js 16 "proxy"), which is what lets the record-level check read patient data.
export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Generic educational reference assets carry no patient data. Permit only
  // their read-only delivery so browser-side WebGL loaders never receive a
  // login document in place of a GLB file. Patient images remain protected.
  if (pathname === '/skeleton-reference.png' && ['GET', 'HEAD'].includes(req.method)) {
    return NextResponse.next();
  }
  if (pathname.startsWith('/models/hubmap/') && ['GET', 'HEAD'].includes(req.method)) {
    return NextResponse.next();
  }

  // Public — no auth required
  if (pathname === '/') return NextResponse.next();
  const publicRoutes = ['/login', '/register', '/api/auth', '/api/register', '/scheduling', '/docs', '/debug'];

  // Signed-in users skip the sign-in pages and land on their role's home page
  if (SIGN_IN_PATHS.includes(pathname)) {
    if (req.auth) return NextResponse.redirect(new URL(homePathForRole(req.auth.user?.role as string | undefined), req.url));
    return NextResponse.next();
  }

  if (publicRoutes.some((r) => pathname.startsWith(r))) return NextResponse.next();

  // Playwright / E2E bypass is gated behind explicit env enable + allowlist
  const enableE2EBypass = process.env.ENABLE_E2E_BYPASS === 'true';
  const bypassAllowlist = (process.env.E2E_BYPASS_ALLOWLIST || '').split(',').map(s => s.trim()).filter(Boolean);

  if (process.env.NODE_ENV !== 'production' && enableE2EBypass) {
    if (req.headers.get('x-playwright') === '1') return NextResponse.next();
    if (req.nextUrl.searchParams.get('playwright') === '1') return NextResponse.next();

    const allowedPaths = bypassAllowlist.filter(p => p.startsWith('/'));
    const devAllowed = allowedPaths.length ? allowedPaths : ['/dashboard/encounters', '/dashboard/appointments', '/dashboard/records', '/dashboard'];
    if (devAllowed.some((r) => req.nextUrl.pathname.startsWith(r))) return NextResponse.next();
  }

  // Must be authenticated
  if (!req.auth) return NextResponse.redirect(new URL('/login', req.url));

  const role = req.auth.user?.role as string | undefined;

  // EPIC-SEC-02: PENDING users cannot access any protected route
  if (role === 'PENDING') {
    return NextResponse.redirect(new URL('/pending-approval', req.url));
  }

  // Admin-only routes
  if (pathname.startsWith('/admin') && role !== 'ADMIN') {
    return denied(req, pathname);
  }

  // Doctor workspace. Administrators manage the system and do not read clinical data.
  if (pathname.startsWith('/doctor') && role !== 'DOCTOR') {
    return denied(req, pathname);
  }

  // Triage — nurses and doctors
  if (pathname.startsWith('/triage') && !['NURSE', 'DOCTOR'].includes(role ?? '')) {
    return denied(req, pathname);
  }

  // Cardiology workflow and queue assignment — clinical staff, plus administrators who assign work
  const cardiologyPath = pathname === '/cardiology' || pathname.startsWith('/cardiology/') || pathname.startsWith('/api/cardiology') || pathname === '/api/assign';
  if (cardiologyPath && !['DOCTOR', 'NURSE', 'CLINICIAN', 'PRACTITIONER', 'ADMIN'].includes(role ?? '')) {
    return denied(req, pathname);
  }

  // Patient portal — only the patient's own account may enter
  if ((pathname === '/patient' || pathname.startsWith('/patient/')) && role !== 'PATIENT') {
    return denied(req, pathname);
  }

  // Patient-scoped data: role, section and record-level access (see lib/patientAccessPolicy.ts)
  const scoped = parsePatientScopedPath(pathname);
  if (scoped) {
    const user = req.auth.user as { id?: string; name?: string | null; patientId?: string } | undefined;
    const decision = authorizePatientApi({
      role,
      method: req.method,
      patientId: scoped.patientId,
      section: scoped.section,
      ownPatientId: user?.patientId,
      canAccessRecord: () => canAccessPatientRecord(scoped.patientId, { id: user?.id ?? '', name: user?.name ?? '', role: role ?? '' }),
    });
    if (!decision.ok) return denied(req, pathname, decision.error);
  }

  return NextResponse.next();
});

function denied(req: { url: string }, pathname: string, error = 'You do not have access to this resource.') {
  if (pathname.startsWith('/api/')) return NextResponse.json({ error }, { status: 403 });
  return NextResponse.redirect(new URL('/unauthorized', req.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};
