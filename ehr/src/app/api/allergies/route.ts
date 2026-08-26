import { NextResponse } from 'next/server';
import { listAllergies, saveAllergy } from '@/lib/allergyStore';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const patientId = url.searchParams.get('patientId');
  if (!patientId) return NextResponse.json({ error: 'patientId required' }, { status: 400 });
  const category = url.searchParams.get('category') || undefined;
  const verification = url.searchParams.get('verification') || undefined;
  const data = await listAllergies(patientId, { category, verification });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const saved = await saveAllergy(body);
    return NextResponse.json({ success: true, item: saved }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
}
