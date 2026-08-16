import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ authenticated: false });
    return NextResponse.json({ authenticated: true, user: session.user });
  } catch (err: any) {
    // Do not treat errors as hard failures here — return unauthenticated with error text
    return NextResponse.json({ authenticated: false, error: err?.message ?? 'auth error' });
  }
}
