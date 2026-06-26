import { NextResponse } from 'next/server';
import { findDevUserByEmail } from '@/lib/devAuthStore';
import { compare } from 'bcryptjs';

export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }

  if (process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Debug endpoint only for dev store' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const email = ((body.email as string) || '').trim().toLowerCase();
    const password = body.password as string;

    const user = findDevUserByEmail(email);
    if (!user) return NextResponse.json({ ok: false, reason: 'not-found' }, { status: 200 });

    const isValid = await compare(password, user.passwordHash);
    return NextResponse.json({ ok: isValid, reason: isValid ? 'ok' : 'invalid' }, { status: 200 });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('/api/debug/auth-check error', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
