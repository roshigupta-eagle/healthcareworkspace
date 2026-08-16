import { NextResponse } from "next/server";
import { withAudit } from "@/lib/audit";
import { canAuthor, canView } from "@/notes/permissions";
import { createNote, listNotes } from "@/notes/service.mock";
import { isActor, requireActor } from "@/notes/serverAuth";
import type { NoteType } from "@/notes/types";

export async function GET(req: Request) {
  const authed = await requireActor();
  if (!isActor(authed)) return authed;
  const { actor } = authed;
  if (!canView(actor.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const notes = listNotes({
    patientId: searchParams.get("patientId") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    type: (searchParams.get("type") as NoteType) ?? undefined,
  });
  return NextResponse.json({ notes });
}

export async function POST(req: Request) {
  const authed = await requireActor();
  if (!isActor(authed)) return authed;
  const { actor } = authed;

  const body = await req.json().catch(() => null);
  if (!body?.patientId || !body?.type) {
    return NextResponse.json({ error: "patientId and type are required" }, { status: 400 });
  }
  if (!canAuthor(actor.role, body.type)) {
    return NextResponse.json({ error: "Forbidden: role cannot author this note type" }, { status: 403 });
  }

  try {
    const note = await withAudit(
      { agentId: actor.id, entityType: "ClinicalNote", action: "C", description: `Create ${body.type} note` },
      async () =>
        createNote({
          patientId: body.patientId,
          encounterId: body.encounterId,
          type: body.type,
          title: body.title ?? "",
          baseText: body.baseText ?? "",
          author: actor,
        })
    );
    return NextResponse.json({ note }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
