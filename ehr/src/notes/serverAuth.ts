import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { NoteAuthor, StaffRole } from "@/notes/types";

export interface AuthedActor {
  session: { user: { id: string; name?: string | null; role?: string } };
  actor: NoteAuthor;
}

/**
 * Resolve the current session and shape it into a NoteAuthor. Returns a
 * NextResponse (401) when unauthenticated — callers should return it
 * immediately when non-null.
 */
export async function requireActor(): Promise<AuthedActor | NextResponse> {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const actor: NoteAuthor = {
    id: session.user.id,
    name: session.user.name ?? "Unknown",
    role: (session.user.role as StaffRole) ?? "PENDING",
  };
  return { session: session as AuthedActor["session"], actor };
}

export function isActor(value: AuthedActor | NextResponse): value is AuthedActor {
  return (value as AuthedActor).actor !== undefined;
}
