import { NextResponse } from 'next/server';
import { getAllMockUsers } from '@/cardiology/services/api.mock';

export async function GET() {
  try {
    const users = getAllMockUsers();
    return NextResponse.json(Object.values(users));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('users fetch error', err);
    return NextResponse.json({ error: 'failed to fetch users' }, { status: 500 });
  }
}
