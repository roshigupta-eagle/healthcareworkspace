import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { logAuditEvent } from '@/lib/audit';
import type { TrendSeries } from '@/types/trends';

export async function GET(req: Request, { params }: { params: { patientId: string } }) {
  const { patientId } = params;
  let session: any = null;
  try { session = await auth(); } catch (e) { /* dev */ }
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });

  const url = new URL(req.url);
  const metricsQuery = (url.searchParams.get('metric') ?? url.searchParams.get('metrics') ?? '').trim();
  if (!metricsQuery) return NextResponse.json({ error: 'metric query required (e.g. ?metric=sbp,ldl)' }, { status: 400 });
  const metricIds = metricsQuery.split(',').map(s => s.trim()).filter(Boolean);

  const series: TrendSeries[] = metricIds.map((mid) => {
    if (mid === 'weight') {
      const pts = (patient.vitals?.weight || []).map((w: any, i: number) => ({
        id: `weight-${i}`,
        metricId: 'weight',
        timestamp: new Date(w.date).toISOString(),
        value: Number(w.value),
        unit: w.unit || 'kg',
        source: 'mock',
        performer: patient.lastAttendingDoctor,
      }));
      return { metric: { id: 'weight', name: 'Weight', unit: 'kg', category: 'vital' }, points: pts };
    }

    if (mid === 'sbp' || mid === 'dbp') {
      const bp = (patient.vitals?.bloodPressure || []);
      const pts = bp.map((b: any, i: number) => ({
        id: `${mid}-${i}`,
        metricId: mid,
        timestamp: new Date(b.date).toISOString(),
        value: Number(b.value),
        unit: b.unit || 'mmHg',
        source: 'mock',
        performer: patient.lastAttendingDoctor,
      }));
      const metric = { id: mid, name: mid === 'sbp' ? 'Systolic BP' : 'Diastolic BP', unit: 'mmHg', category: 'blood-pressure' };
      return { metric, points: pts };
    }

    if (mid === 'ldl') {
      const ldlLabs = (patient.labResults || []).filter((l: any) => /ldl/i.test(l.name || ''));
      const pts = ldlLabs.map((l: any, i: number) => ({
        id: `ldl-${i}`,
        metricId: 'ldl',
        timestamp: new Date(l.date).toISOString(),
        value: Number(l.result),
        unit: l.unit || 'mmol/L',
        source: 'lab',
        performer: patient.lastAttendingDoctor,
      }));
      return { metric: { id: 'ldl', name: 'LDL Cholesterol', unit: 'mmol/L', category: 'laboratory' }, points: pts };
    }

    // Unknown metric: return empty series with metric stub
    return { metric: { id: mid, name: mid, unit: '', category: 'unknown' }, points: [] };
  });

  try {
    await logAuditEvent({ agentId: session.user.id, entityType: 'Patient', entityId: patient.id, action: 'R', outcome: 'success', description: `Read trends for ${patient.id}: ${metricIds.join(',')}` });
  } catch (e) { }

  return NextResponse.json({ data: series });
}
