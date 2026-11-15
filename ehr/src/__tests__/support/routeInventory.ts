import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, relative, sep } from 'node:path';
import { homePathForRole } from '../../lib/roleHome';

export type RouteKind = 'page' | 'route';
export type ConventionRule = 'segment-case' | 'param-name' | 'route-location';
export type Audience = 'Patient' | 'Doctor' | 'Admin' | 'Pharmacy' | 'Laboratory' | 'Clinical workspace' | 'Public & platform';

export type Route = {
  readonly kind: RouteKind;
  readonly url: string;
  readonly methods: readonly string[];
};

export type Violation = { readonly rule: ConventionRule; readonly route: Route; readonly message: string };
export type LegacyException = { readonly rule: ConventionRule; readonly pattern: RegExp; readonly reason: string };

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;
const PAGE_FILES = new Set(['page.tsx', 'page.ts', 'page.jsx', 'page.js']);
const ROUTE_FILES = new Set(['route.ts', 'route.js']);
const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ENTITY_PARAM = /^\[[a-z][a-zA-Z0-9]*Id\]$/;

// Existing URLs that predate the convention. Each entry must still match a real
// route (the test fails on stale entries), so this list can only shrink.
export const LEGACY_EXCEPTIONS: readonly LegacyException[] = [
  { rule: 'param-name', pattern: /^\/dashboard\/records\/\[id\](\/|$)/, reason: 'Patient record pages use [id]; target [patientId].' },
  { rule: 'param-name', pattern: /^\/admin\/users\/\[id\]$/, reason: 'Target [userId].' },
  { rule: 'param-name', pattern: /^\/api\/tasks\/\[id\]$/, reason: 'Target [taskId].' },
  { rule: 'param-name', pattern: /^\/api\/labs\/\[id\]\/\[labId\]\/pdf(\/html)?$/, reason: 'Target /api/patients/[patientId]/labs/[labId]/pdf.' },
];

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function detectMethods(source: string): string[] {
  const found = new Set<string>();
  for (const method of HTTP_METHODS) {
    if (new RegExp(`export\\s+(?:async\\s+)?(?:function|const)\\s+${method}\\b`).test(source)) found.add(method);
  }
  for (const list of source.matchAll(/export\s+(?:const\s*)?\{([^}]*)\}/g)) {
    for (const method of HTTP_METHODS) {
      if (new RegExp(`\\b${method}\\b`).test(list[1])) found.add(method);
    }
  }
  return HTTP_METHODS.filter((method) => found.has(method));
}

export function collectRoutes(appDir: string): Route[] {
  const routes: Route[] = [];
  for (const file of walk(appDir)) {
    const name = basename(file);
    const kind: RouteKind | undefined = PAGE_FILES.has(name) ? 'page' : ROUTE_FILES.has(name) ? 'route' : undefined;
    if (!kind) continue;

    const segments = relative(appDir, dirname(file)).split(sep).filter(Boolean);
    if (segments.some((segment) => segment.startsWith('_'))) continue;
    const routable = segments.filter((segment) => !/^\(.*\)$/.test(segment) && !segment.startsWith('@'));
    const methods = kind === 'route' ? detectMethods(readFileSync(file, 'utf8')) : [];
    routes.push({ kind, url: '/' + routable.join('/'), methods });
  }
  return routes.sort((a, b) => (a.url === b.url ? (a.kind < b.kind ? -1 : 1) : a.url < b.url ? -1 : 1));
}

export function violationsFor(route: Route): Violation[] {
  const violations: Violation[] = [];
  const segments = route.url.split('/').filter(Boolean);

  for (const segment of segments) {
    if (segment.startsWith('[')) {
      const catchAll = segment.startsWith('[...') || segment.startsWith('[[...');
      if (!catchAll && !ENTITY_PARAM.test(segment)) {
        violations.push({ rule: 'param-name', route, message: `${segment} must be named after its entity, e.g. [patientId]` });
      }
    } else if (!KEBAB_CASE.test(segment)) {
      violations.push({ rule: 'segment-case', route, message: `"${segment}" must be lowercase kebab-case` });
    }
  }

  const underApi = route.url === '/api' || route.url.startsWith('/api/');
  if (route.kind === 'route' && !underApi) violations.push({ rule: 'route-location', route, message: 'route handlers must live under /api' });
  if (route.kind === 'page' && underApi) violations.push({ rule: 'route-location', route, message: 'pages must not live under /api' });
  return violations;
}

const isLegacy = (violation: Violation) =>
  LEGACY_EXCEPTIONS.some((entry) => entry.rule === violation.rule && entry.pattern.test(violation.route.url));

export function checkConvention(routes: readonly Route[]) {
  const all = routes.flatMap(violationsFor);
  return {
    unexpected: all.filter((violation) => !isLegacy(violation)),
    legacy: all.filter(isLegacy),
    staleExceptions: LEGACY_EXCEPTIONS.filter(
      (entry) => !all.some((violation) => violation.rule === entry.rule && entry.pattern.test(violation.route.url)),
    ),
  };
}

const AUDIENCE_RULES: readonly (readonly [Audience, RegExp])[] = [
  ['Patient', /^\/patient(\/|$)/],
  ['Admin', /^\/(api\/)?admin(\/|$)/],
  ['Doctor', /^\/(api\/)?(dashboard\/)?doctor(-[a-z-]+)?(\/|$)/],
  ['Laboratory', /^\/(dashboard\/(laboratory|orders\/labs|records\/labs)|dashboard\/records\/\[id\]\/(labs|lab-results|upcoming-tests)|api\/(labs|lab-alerts|laboratory|orders\/labs|patients\/\[patientId\]\/(labs|lab-comparator)))(\/|$)/],
  ['Pharmacy', /^\/(dashboard\/(medications|prescriptions)|dashboard\/records\/\[id\]\/medications|api\/patients\/\[patientId\]\/medication(s|-reconciliation)?)(\/|$)/],
  ['Public & platform', /^\/($|login|register|signup|pending-approval|unauthorized|book-demo|features|debug|api\/(auth|register|debug))(\/|$)/],
];

export function audienceOf(route: Route): Audience {
  return AUDIENCE_RULES.find(([, pattern]) => pattern.test(route.url))?.[0] ?? 'Clinical workspace';
}

export const BASE_URL = 'http://localhost:3000';

const SECTIONS: readonly (readonly [Audience, string])[] = [
  ['Patient', `Patient portal. Role \`PATIENT\`; signs in to \`${BASE_URL}${homePathForRole('PATIENT')}\`.`],
  ['Doctor', `Doctor workspace. Role \`DOCTOR\`; signs in to \`${BASE_URL}${homePathForRole('DOCTOR')}\`.`],
  ['Admin', `Administration console. Role \`ADMIN\`; signs in to \`${BASE_URL}${homePathForRole('ADMIN')}\`.`],
  ['Pharmacy', 'Medication and prescribing screens and their EHR routes. Dispensing runs in the PharmacyMS service (see [url-conventions.md](./url-conventions.md#3-backend-services)). A pharmacist signs in to the shared dashboard; there is no dedicated pharmacy home page yet.'],
  ['Laboratory', 'Lab orders, results and review screens and their EHR routes. Orders and results are stored in the LIMS service (see [url-conventions.md](./url-conventions.md#3-backend-services)). A lab technician signs in to the shared dashboard; there is no dedicated lab home page yet.'],
  ['Clinical workspace', 'Shared screens and APIs used by clinical staff, including patient-scoped record APIs under `/api/patients/[patientId]`.'],
  ['Public & platform', 'Public pages, authentication and development-only routes (`/debug`, `/api/debug`).'],
];

export function renderCatalog(routes: readonly Route[]): string {
  const pageCount = routes.filter((route) => route.kind === 'page').length;
  const apiCount = routes.length - pageCount;
  const lines: string[] = [
    '# EHR URL catalog',
    '',
    'Generated from `ehr/src/app` by `npm --prefix ehr run docs:routes`; do not edit by hand.',
    'The unit test `routeConvention.test.ts` fails when this file is out of date.',
    'Naming rules, backend service endpoints and sign-in accounts: [url-conventions.md](./url-conventions.md).',
    '',
    `Total: ${pageCount} pages and ${apiCount} API routes. All URLs are absolute for the local server \`${BASE_URL}\`; \`[name]\` marks a path parameter to replace with a real identifier.`,
    '',
  ];

  for (const [audience, description] of SECTIONS) {
    const rows = routes.filter((route) => audienceOf(route) === audience);
    lines.push(`## ${audience} (${rows.length})`, '', description, '');
    if (rows.length === 0) {
      lines.push('_No routes._', '');
      continue;
    }
    lines.push('| Type | URL | Methods | Convention |', '|---|---|---|---|');
    for (const route of rows) {
      const found = violationsFor(route);
      const status = found.length === 0 ? 'OK' : found.map((v) => `${isLegacy(v) ? 'Legacy' : 'Violation'}: ${v.rule}`).join('; ');
      const url = route.url === '/' ? BASE_URL + '/' : BASE_URL + route.url;
      lines.push(`| ${route.kind === 'page' ? 'Page' : 'API'} | \`${url}\` | ${route.methods.join(', ') || '-'} | ${status} |`);
    }
    lines.push('');
  }
  return lines.join('\n');
}
