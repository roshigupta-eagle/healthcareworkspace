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
    const orderId = `LAB-${Date.now()}`;
    const item = { ...body, orderId };
    arr.unshift(item);
    fs.writeFileSync(DATA_FILE, JSON.stringify(arr.slice(0, 1000), null, 2));
    return NextResponse.json({ ok: true, orderId });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
