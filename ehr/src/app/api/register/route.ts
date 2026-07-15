import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomUUID } from "crypto";
import { addDevUser, findDevUserByEmail } from "@/lib/devAuthStore";

// ─── Simple in-process rate limiter (EPIC-SEC-02) ─────────────────────────
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000; // 1 minute
const MAX_ATTEMPTS = 5;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now > rec.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (rec.count >= MAX_ATTEMPTS) return false;
  rec.count++;
  return true;
}

// ─── Validation schema — role is NOT accepted from client (EPIC-SEC-02) ────
const registerSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number")
    .regex(/[^A-Za-z0-9]/, "Must contain a special character"),
  name: z.string().min(1).max(100),
  // role field is intentionally ignored — server always sets PENDING
});

export async function POST(req: Request) {
  // Rate limiting
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many registration attempts. Please wait and try again." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { email, password, name } = registerSchema.parse(body);

    const passwordHash = await hash(password, 12);

    try {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
      }

      const user = await prisma.user.create({
        // EPIC-SEC-02: role is always PENDING — admin must approve
        data: { email, passwordHash, name, role: "PENDING" as any },
      });

      return NextResponse.json(
        { message: "Account created. An administrator will review and activate your account.", userId: user.id },
        { status: 201 }
      );
    } catch (dbErr) {
      if (process.env.NODE_ENV === "production") throw dbErr;

      const normalized = email.trim().toLowerCase();
      const existingDev = findDevUserByEmail(normalized);
      if (existingDev) {
        return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
      }

      const id = randomUUID();
      addDevUser({ id, email: normalized, passwordHash, name, role: "PENDING" });
      // eslint-disable-next-line no-console
      console.log("[register] created dev user (PENDING):", { id, email: normalized, name });
      return NextResponse.json(
        { message: "Account created (dev). Pending admin approval.", userId: id },
        { status: 201 }
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.issues }, { status: 400 });
    }
    // eslint-disable-next-line no-console
    console.error("/api/register error:", error);
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json(
        { error: "Internal server error", message: (error as Error)?.message },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
