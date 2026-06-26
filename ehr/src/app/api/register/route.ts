import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomUUID } from 'crypto';
import { addDevUser, findDevUserByEmail } from '@/lib/devAuthStore';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(["ADMIN", "DOCTOR", "PATIENT"]),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name, role } = registerSchema.parse(body);
    // Try DB first; on connection issues, fall back to an in-memory dev store
    try {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return NextResponse.json({ error: "User already exists" }, { status: 409 });
      }

      const passwordHash = await hash(password, 12);

      const user = await prisma.user.create({
        data: { email, passwordHash, name, role },
      });

      return NextResponse.json({ message: "User created", userId: user.id }, { status: 201 });
    } catch (dbErr) {
      // If we're in production, bubble up the DB error
      if (process.env.NODE_ENV === 'production') throw dbErr;

      // Dev fallback: use in-memory store
      const existingDev = findDevUserByEmail(email);
      if (existingDev) {
        return NextResponse.json({ error: 'User already exists (dev)' }, { status: 409 });
      }

      const passwordHash = await hash(password, 12);
      const id = randomUUID();
      const normalizedEmail = email.trim().toLowerCase();
      addDevUser({ id, email: normalizedEmail, passwordHash, name, role });

      // Debug: log created dev user
      // eslint-disable-next-line no-console
      console.log('[register] created dev user (dev):', { id, email: normalizedEmail, name, role });

      return NextResponse.json({ message: 'User created (dev)', userId: id }, { status: 201 });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    // Log the actual error server-side for debugging
    // and include the message/stack in responses when not in production
    // so the client can show actionable info during development.
    // Do NOT expose stacks in production.
    // eslint-disable-next-line no-console
    console.error("/api/register error:", error);

    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json(
        { error: "Internal server error", message: (error as Error)?.message, stack: (error as Error)?.stack },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
