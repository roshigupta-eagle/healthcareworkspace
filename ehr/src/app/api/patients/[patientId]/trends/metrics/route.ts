import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { logAuditEvent } from '@/lib/audit';
import type { TrendMetricDefinition, TrendPermissionSet } from '@/types/trends';

export async function GET(req: Request, { params }: { params: { patientId: string } }) {
  const { patientId } = params;
  let session: any = null;
  try { session = await auth(); } catch (e) { /* dev */ }
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });

  const metrics: TrendMetricDefinition[] = [
    { id: 'sbp', name: 'Systolic BP', unit: 'mmHg', category: 'blood-pressure', loinc: '8480-6' },
    { id: 'dbp', name: 'Diastolic BP', unit: 'mmHg', category: 'blood-pressure', loinc: '8462-4' },
    { id: 'weight', name: 'Weight', unit: 'kg', category: 'vital', loinc: '29463-7' },
    { id: 'ldl', name: 'LDL Cholesterol', unit: 'mmol/L', category: 'laboratory', loinc: '2089-1' },
  ];

  const permissions: TrendPermissionSet = {
    view: true,
    export: session.user?.role !== 'PATIENT',
    annotate: session.user?.role !== 'PATIENT',
    print: session.user?.role !== 'PATIENT',
  };

  try {
    await logAuditEvent({ agentId: session.user.id, entityType: 'Patient', entityId: patient.id, action: 'R', outcome: 'success', description: `List trend metrics for ${patient.id}` });
  } catch (e) { }

  return NextResponse.json({ metrics, permissions });
}
