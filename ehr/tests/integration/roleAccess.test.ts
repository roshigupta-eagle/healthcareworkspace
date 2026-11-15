import { describe, expect, it } from 'vitest';
import { DEV_ACCOUNTS, type DevAccount } from '@/lib/devAccounts';
import { homePathForRole } from '@/lib/roleHome';

// Live check against a running EHR (default http://localhost:3000).
// Run with: npm --prefix ehr run test:roles   (start the dev server first).
const BASE_URL = process.env.EHR_BASE_URL ?? 'http://localhost:3000';
const TIMEOUT = 240_000;

type Outcome = 'allowed' | 'login' | 'denied' | 'error';

async function serverIsUp() {
  try {
    await fetch(`${BASE_URL}/login`, { redirect: 'manual', signal: AbortSignal.timeout(120_000) });
    return true;
  } catch {
    return false;
  }
}

class Client {
  private cookies = new Map<string, string>();

  private store(response: Response) {
    for (const line of response.headers.getSetCookie()) {
      const [pair] = line.split(';');
      const index = pair.indexOf('=');
      const name = pair.slice(0, index);
      const value = pair.slice(index + 1);
      if (value) this.cookies.set(name, value);
      else this.cookies.delete(name);
    }
  }

  async request(path: string, init: RequestInit = {}) {
    const cookie = [...this.cookies].map(([name, value]) => `${name}=${value}`).join('; ');
    const response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      redirect: 'manual',
      headers: { ...(init.headers as Record<string, string>), ...(cookie ? { cookie } : {}) },
      signal: AbortSignal.timeout(TIMEOUT),
    });
    this.store(response);
    return response;
  }

  async signIn(account: Pick<DevAccount, 'email' | 'password'>) {
    const { csrfToken } = (await (await this.request('/api/auth/csrf')).json()) as { csrfToken: string };
    await this.request('/api/auth/callback/credentials', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ csrfToken, email: account.email, password: account.password, json: 'true' }),
    });
    const session = (await (await this.request('/api/auth/session')).json()) as { user?: { role?: string } } | null;
    return session?.user?.role;
  }

  async outcome(path: string): Promise<Outcome> {
    const response = await this.request(path);
    const location = response.headers.get('location') ?? '';
    if (response.status === 401 || location.includes('/login')) return 'login';
    if (response.status === 403 || location.includes('/unauthorized') || location.includes('/pending-approval')) return 'denied';
    // Past the access gate. A 4xx such as 400/404 for missing parameters is still "allowed"; a 5xx is a bug.
    return response.status >= 500 ? 'error' : 'allowed';
  }
}

const STAFF = ['DOCTOR', 'NURSE'];

// Which roles may open each URL. Roles not listed must be turned away.
// patient-001 has the seeded doctor and nurse on its care team; patient-002 has neither.
const ACCESS: readonly (readonly [string, readonly string[]])[] = [
  ['/admin', ['ADMIN']],
  ['/admin/users', ['ADMIN']],
  ['/api/admin/users', ['ADMIN']],
  ['/doctor', ['DOCTOR']],
  ['/triage', STAFF],
  ['/patient/dashboard', ['PATIENT']],
  ['/patient/results', ['PATIENT']],
  ['/dashboard', [...STAFF, 'PHARMACIST', 'LAB_TECH']],
  ['/dashboard/laboratory', [...STAFF, 'LAB_TECH']],
  ['/api/laboratory/dashboard', [...STAFF, 'LAB_TECH']],
  ['/dashboard/medications', [...STAFF, 'PHARMACIST']],
  ['/schedule/today', [...STAFF, 'RECEPTIONIST', 'ADMIN']],
  ['/scheduling', [...STAFF, 'RECEPTIONIST', 'ADMIN']],
  ['/cardiology', [...STAFF, 'ADMIN']],
  ['/api/cardiology/users', [...STAFF, 'ADMIN']],
  ['/api/search?q=sarah', [...STAFF, 'ADMIN']],
  // Patient-scoped data: role, section and record-level rules
  ['/api/patients/patient-001/allergies', [...STAFF, 'PHARMACIST', 'PATIENT']],
  ['/api/patients/patient-001/medications', [...STAFF, 'PHARMACIST', 'PATIENT']],
  ['/api/patients/patient-001/immunizations', [...STAFF, 'PATIENT']],
  ['/api/patients/patient-001/lab-comparator', [...STAFF, 'LAB_TECH']],
  ['/api/patients/patient-001/care-team', STAFF],
  ['/api/patients/patient-001/timeline', STAFF],
  ['/api/patients/patient-002/allergies', ['PHARMACIST']],
  ['/api/patients/patient-002/immunizations', []],
  ['/api/patients/patient-002/care-team', []],
  ['/dashboard/records/patient-001', STAFF],
  ['/dashboard/records/patient-002', []],
];

describe.skipIf(!(await serverIsUp()))(`role access against ${BASE_URL}`, () => {
  it('rejects wrong passwords, unknown users and pending accounts', async () => {
    const anyAccount = DEV_ACCOUNTS[0];
    expect(await new Client().signIn({ email: anyAccount.email, password: 'wrong-password' })).toBeUndefined();
    expect(await new Client().signIn({ email: 'nobody@example.com', password: 'Nobody#Local2026' })).toBeUndefined();
    const pending = DEV_ACCOUNTS.find((account) => account.role === 'PENDING')!;
    expect(await new Client().signIn(pending)).toBeUndefined();
  }, TIMEOUT);

  it('turns away anonymous visitors from every protected URL', async () => {
    const client = new Client();
    for (const [path] of ACCESS) expect(await client.outcome(path), path).toBe('login');
  }, TIMEOUT);

  for (const account of DEV_ACCOUNTS.filter((entry) => entry.role !== 'PENDING')) {
    it(`${account.role} (${account.email}) signs in and reaches only its own areas`, async () => {
      const client = new Client();
      expect(await client.signIn(account)).toBe(account.role);

      const home = homePathForRole(account.role);
      expect(await client.outcome(home), `home page ${home}`).toBe('allowed');

      for (const [path, roles] of ACCESS) {
        const expected: Outcome = roles.includes(account.role) ? 'allowed' : 'denied';
        expect(await client.outcome(path), `${account.role} -> ${path}`).toBe(expected);
      }
    }, TIMEOUT);
  }
});
