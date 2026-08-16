import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.resolve(process.cwd(), 'ehr', 'data', 'orders.json');

function ensureDataFile() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify([]));
    }
  } catch (e) {
    // ignore
  }
}

export async function POST(req: Request) {
  try {
    ensureDataFile();
    const body = await req.json();
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const arr = JSON.parse(raw || '[]');
    // idempotency: check header
    const idempotency = (req.headers as any)?.get ? (req.headers as any).get('idempotency-key') : undefined;
    if (idempotency) {
      const found = arr.find((o: any) => o.idempotency === idempotency);
      if (found) {
        return NextResponse.json({ ok: true, orderId: found.orderId, reused: true });
      }
    }

    const orderId = `LAB-${Date.now()}`;
    const item = { ...body, orderId, idempotency: idempotency || null };
    arr.unshift(item);
    fs.writeFileSync(DATA_FILE, JSON.stringify(arr.slice(0, 1000), null, 2));
    return NextResponse.json({ ok: true, orderId });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    ensureDataFile();
    const url = new URL(req.url);
    const patientId = url.searchParams.get('patientId');
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const arr = JSON.parse(raw || '[]');
    let out = arr;
    if (patientId) out = arr.filter((o: any) => o.patientId === patientId);
    return NextResponse.json({ ok: true, items: out.slice(0, 100) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
