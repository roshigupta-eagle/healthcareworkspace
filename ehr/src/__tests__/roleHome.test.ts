import { describe, expect, it } from 'vitest';
import { homePathForRole, postLoginPath, safeReturnTo } from '@/lib/roleHome';

describe('post-login routing by role', () => {
  it('sends each role to its own home page', () => {
    expect(homePathForRole('ADMIN')).toBe('/admin');
    expect(homePathForRole('DOCTOR')).toBe('/doctor');
    expect(homePathForRole('PATIENT')).toBe('/patient/dashboard');
    expect(homePathForRole('PENDING')).toBe('/pending-approval');
    expect(homePathForRole('RECEPTIONIST')).toBe('/schedule/today');
    expect(homePathForRole('doctor')).toBe('/doctor');
  });

  it('sends roles without a permitted page to the public home page', () => {
    expect(homePathForRole('BILLING')).toBe('/');
    expect(homePathForRole('PCA')).toBe('/');
    expect(homePathForRole(undefined)).toBe('/');
  });

  it('honours a same-origin returnTo and rejects everything else', () => {
    expect(postLoginPath('DOCTOR', '/dashboard/encounters?x=1')).toBe('/dashboard/encounters?x=1');
    for (const unsafe of ['https://evil.example', '//evil.example', '/\\evil.example', 'dashboard', '/login', '/register?a=1', '']) {
      expect(safeReturnTo(unsafe)).toBeNull();
      expect(postLoginPath('PATIENT', unsafe)).toBe('/patient/dashboard');
    }
  });
});
