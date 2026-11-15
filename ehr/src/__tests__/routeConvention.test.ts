import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { audienceOf, checkConvention, collectRoutes, renderCatalog } from './support/routeInventory';

const routes = collectRoutes(fileURLToPath(new URL('../app', import.meta.url)));

describe('EHR URL convention (docs/api/url-conventions.md)', () => {
  it('discovers pages and API routes', () => {
    expect(routes.some((route) => route.kind === 'page')).toBe(true);
    expect(routes.some((route) => route.kind === 'route' && route.url.startsWith('/api/'))).toBe(true);
  });

  it('has no violations outside the documented legacy exceptions', () => {
    const unexpected = checkConvention(routes).unexpected.map((v) => `${v.route.url}: ${v.rule} - ${v.message}`);
    expect(unexpected).toEqual([]);
  });

  it('has no stale legacy exceptions', () => {
    expect(checkConvention(routes).staleExceptions.map((entry) => entry.pattern.source)).toEqual([]);
  });

  it('places the portal, doctor, admin, pharmacy and laboratory URLs in their sections', () => {
    const audienceFor = (url: string) => audienceOf({ kind: 'page', url, methods: [] });
    expect(audienceFor('/patient/dashboard')).toBe('Patient');
    expect(audienceFor('/patients/[patientId]/documents')).toBe('Clinical workspace');
    expect(audienceFor('/doctor/encounters/[encounterId]')).toBe('Doctor');
    expect(audienceFor('/api/doctor-view')).toBe('Doctor');
    expect(audienceFor('/admin/users')).toBe('Admin');
    expect(audienceFor('/api/admin/users')).toBe('Admin');
    expect(audienceFor('/dashboard/medications')).toBe('Pharmacy');
    expect(audienceFor('/dashboard/laboratory')).toBe('Laboratory');
  });

  it('keeps docs/api/url-catalog.md in sync (run `npm --prefix ehr run docs:routes` to update)', async () => {
    await expect(renderCatalog(routes)).toMatchFileSnapshot('../../../docs/api/url-catalog.md');
  });
});
