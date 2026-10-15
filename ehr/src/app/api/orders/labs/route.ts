import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { logAuditEvent } from '@/lib/audit';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';

const DATA_FILE = path.resolve(process.cwd(), 'ehr', 'data', 'orders.json');
type LegacyOrderRecord = Record<string, unknown>;

function records(raw: string): LegacyOrderRecord[] {
  try {
    const parsed: unknown = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is LegacyOrderRecord => Boolean(item && typeof item === 'object' && !Array.isArray(item))) : [];
  } catch {
    return [];
  }
}

function ensureDataFile() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify([]));
    }
  } catch {
    // ignore
  }
}

export async function POST(req: Request) {
  const access = await resolveDoctorWorkspaceActor(req);
  if (access.response) return access.response;
  try {
    ensureDataFile();
    const body = await req.json();
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const arr = records(raw);
    // idempotency: check header
    const idempotency = req.headers.get('idempotency-key') || undefined;
    if (idempotency) {
      const found = arr.find((o) => o.idempotency === idempotency);
      if (found) {
        return NextResponse.json({ ok: true, orderId: found.orderId, reused: true });
      }
    }

    const orderId = `LAB-${Date.now()}`;
    const item = body && typeof body === 'object' && !Array.isArray(body) ? { ...body as LegacyOrderRecord, orderId, idempotency: idempotency || null } : { orderId, idempotency: idempotency || null };
    arr.unshift(item);
    fs.writeFileSync(DATA_FILE, JSON.stringify(arr.slice(0, 1000), null, 2));
    await logAuditEvent({ agentId: access.actor!.id, entityType: 'ServiceRequest', entityId: orderId, action: 'C', outcome: 'success', description: 'Created legacy laboratory order' });
    return NextResponse.json({ ok: true, orderId });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const access = await resolveDoctorWorkspaceActor(req);
  if (access.response) return access.response;
  try {
    ensureDataFile();
    const url = new URL(req.url);
    const patientId = url.searchParams.get('patientId');
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const arr = records(raw);
    let out = arr;
    if (patientId) out = arr.filter((o) => o.patientId === patientId);
    return NextResponse.json({ ok: true, items: out.slice(0, 100) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
