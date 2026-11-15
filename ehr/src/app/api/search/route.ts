import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { mockVisits, mockUsers, mockQueueItems } from '@/cardiology/services/api.mock';

const CLINICAL_SEARCH_ROLES = new Set(['DOCTOR', 'NURSE', 'CLINICIAN', 'PRACTITIONER']);

export async function GET(req: Request) {
  try {
    const session = await auth().catch(() => null);
    const role = String((session?.user as { role?: string } | undefined)?.role ?? '').toUpperCase();
    const searchesUsers = role === 'ADMIN';
    const searchesPatients = CLINICAL_SEARCH_ROLES.has(role);
    if (!session?.user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    if (!searchesUsers && !searchesPatients) return NextResponse.json({ error: 'Search is not available for this role.' }, { status: 403 });

    const url = new URL(req.url);
    const q = (url.searchParams.get('q') || '').trim();
    if (!q) return NextResponse.json({ results: [] });

    const ql = q.toLowerCase();
    const results: Array<Record<string, any>> = [];

    // Users: administrators only
    if (searchesUsers) Object.values(mockUsers).forEach((u: any) => {
      const hay = [u.name, u.email, u.department, u.role].filter(Boolean).join(' ').toLowerCase();
      if (hay.includes(ql)) {
        results.push({ id: u.id, type: 'user', title: u.name, subtitle: u.email || '', href: `/admin/users/${u.id}` });
      }
    });

    // Visits / patients and queue items: clinical staff only
    if (searchesPatients) for (const v of mockVisits) {
      const hay = [v.patientName, v.mrn, v.id, v.chiefComplaint].filter(Boolean).join(' ').toLowerCase();
      if (hay.includes(ql)) {
        results.push({ id: v.id, type: 'visit', title: v.patientName, subtitle: `${v.mrn || ''} • ${v.currentState}`, href: `/dashboard/encounters/${v.id}` });
      }
    }

    if (searchesPatients) for (const qi of mockQueueItems) {
      const hay = [qi.patientName, qi.visitId, qi.id, qi.queueName].filter(Boolean).join(' ').toLowerCase();
      if (hay.includes(ql)) {
        results.push({ id: qi.id, type: 'queue', title: qi.patientName, subtitle: qi.queueName, href: `/dashboard/encounters/${qi.visitId}` });
      }
    }

    // Keep results compact and ordered (users first)
    const ordered = results.sort((a, b) => (a.type === b.type ? 0 : a.type === 'user' ? -1 : 1));
    return NextResponse.json({ results: ordered.slice(0, 50) });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('search error', err);
    return NextResponse.json({ error: 'search failed' }, { status: 500 });
  }
}
