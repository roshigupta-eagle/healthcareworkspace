import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAllMockUsers, mockUsers } from '@/cardiology/services/api.mock';

export async function GET() {
  try {
    const users = await prisma.user.findMany({ select: { id: true, email: true, name: true, role: true } });
    return NextResponse.json(users);
  } catch (err) {
    // Fallback to mock users when DB is unreachable
    // eslint-disable-next-line no-console
    console.error('admin users GET error', err);
    const all = getAllMockUsers();
    const list = Object.values(all).map((u: any) => ({ id: u.id ?? u.email, email: u.email, name: u.name, role: u.role }));
    return NextResponse.json(list);
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { name, email, role } = (body as any) || {};
  try {
    const created = await prisma.user.create({ data: { name, email, role } as any });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    // Fallback: return a temporary mock user to allow the UI to update in dev
    // eslint-disable-next-line no-console
    console.error('admin users POST error', err);
    const id = `temp-${Date.now()}`;
    const user = { id, name: name ?? email ?? id, email, role };
    try {
      // Persist into the in-memory dev mock store so subsequent GETs return it
      // Use the id as the key to avoid collisions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockUsers as any)[id] = { id, name: user.name, email: user.email, role: user.role } as any;
    } catch (e) {
      // ignore mutation errors in restricted environments
    }

    return NextResponse.json(user, { status: 201 });
  }
}
