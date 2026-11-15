const ROLE_HOME: Readonly<Record<string, string>> = {
  ADMIN: '/admin',
  DOCTOR: '/doctor',
  PATIENT: '/patient/dashboard',
  PENDING: '/pending-approval',
  NURSE: '/dashboard',
  RECEPTIONIST: '/schedule/today',
  CLINICIAN: '/dashboard',
  PRACTITIONER: '/dashboard',
  PHARMACIST: '/dashboard',
  LAB_TECH: '/dashboard',
};

export const SIGN_IN_PATHS: readonly string[] = ['/login', '/register'];

// Roles without an entry have no page they are permitted to open, so they go to the public home page.
export function homePathForRole(role: string | undefined | null): string {
  return ROLE_HOME[String(role ?? '').toUpperCase()] ?? '/';
}

// Accepts only same-origin paths so a crafted returnTo cannot send the user to another site.
export function safeReturnTo(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\') || value.includes('://')) return null;
  const pathname = value.split(/[?#]/)[0];
  return SIGN_IN_PATHS.includes(pathname) ? null : value;
}

export function postLoginPath(role: string | undefined | null, returnTo?: string | null): string {
  return safeReturnTo(returnTo) ?? homePathForRole(role);
}

export function roleHomeEntries(): readonly (readonly [string, string])[] {
  return Object.entries(ROLE_HOME);
}
