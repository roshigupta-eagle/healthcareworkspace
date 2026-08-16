import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getPatientById, mockPatients } from '@/app/dashboard/records/mockPatients';

export async function GET(req: Request) {
  const session = await auth().catch(() => null);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const patientId = url.searchParams.get('patientId') ?? undefined;
  if (!patientId) return NextResponse.json({ error: 'Missing patientId' }, { status: 400 });

  // Dev fallback: return mock patient vitals when no DB configured
  if (!process.env.DATABASE_URL) {
    const p = getPatientById(String(patientId));
    const weights = p?.vitals?.weight ?? [];
    return NextResponse.json({ weights });
  }

  try {
    if (!prisma || !prisma.observation || typeof prisma.observation.findMany !== 'function') throw new Error('Prisma Observation model not available');
    const obs = await prisma.observation.findMany({ where: { patientId, codeDisplay: { contains: 'Weight' } }, orderBy: { effectiveDateTime: 'asc' } });
    const weights = obs.map((o) => ({ date: o.effectiveDateTime?.toISOString().slice(0, 10) ?? o.issued?.toISOString().slice(0, 10) ?? '', value: (o.valueQuantity ?? o.valueQuantity) ?? Number(o.valueQuantity) }));
    return NextResponse.json({ weights });
  } catch (err) {
    console.error('Prisma vitals query failed, falling back to mockPatients:', err);
    const p = getPatientById(String(patientId));
    const weights = p?.vitals?.weight ?? [];
    return NextResponse.json({ weights });
  }
}

export async function POST(req: Request) {
  const session = await auth().catch(() => null);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { patientId, date, value, unit = 'kg' } = body;
  if (!patientId || typeof value !== 'number') return NextResponse.json({ error: 'Missing patientId or value' }, { status: 400 });

  // Dev fallback: update mockPatients in-memory
  if (!process.env.DATABASE_URL) {
    const p = mockPatients.find((m) => m.id === patientId);
    const newEntry = { date: date ?? new Date().toISOString().slice(0, 10), value: Number(value), unit };
    if (p) {
      p.vitals = p.vitals ?? {};
      p.vitals.weight = p.vitals.weight ?? [];
      p.vitals.weight.push(newEntry);
      return NextResponse.json({ observation: newEntry });
    }
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
  }

  try {
    const obs = await prisma.observation.create({
      data: {
        status: 'final',
        category: 'vital-signs',
        code: '29463-7',
        codeDisplay: 'Weight',
        valueQuantity: Number(value),
        valueUnit: unit,
        patientId,
        effectiveDateTime: date ? new Date(date) : new Date(),
      },
    });
    return NextResponse.json({ observation: obs });
  } catch (err) {
    console.error('Prisma create observation failed:', err);
    return NextResponse.json({ error: 'Failed to record observation' }, { status: 500 });
  }
}
