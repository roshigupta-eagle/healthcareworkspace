import { NextResponse } from "next/server";
import { withAudit } from "@/lib/audit";
import { canEditNote, canView } from "@/notes/permissions";
import { editNote, getNote } from "@/notes/service.mock";
import { isActor, requireActor } from "@/notes/serverAuth";

export async function GET(_req: Request, { params }: { params: Promise<{ noteId: string }> }) {
  const { noteId } = await params;
  const authed = await requireActor();
  if (!isActor(authed)) return authed;
  const { actor } = authed;
  if (!canView(actor.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const note = getNote(noteId);
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ note });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ noteId: string }> }) {
  const { noteId } = await params;
  const authed = await requireActor();
  if (!isActor(authed)) return authed;
  const { actor } = authed;

  const note = getNote(noteId);
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canEditNote(actor.role, note)) {
    return NextResponse.json({ error: "Forbidden: role cannot edit this note" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (typeof body?.nextText !== "string") {
    return NextResponse.json({ error: "nextText is required" }, { status: 400 });
  }

  try {
    const result = await withAudit(
      { agentId: actor.id, entityType: "ClinicalNote", entityId: noteId, action: "U", description: "Edit note (tracked change)" },
      async () => editNote(noteId, body.nextText, actor)
    );
    return NextResponse.json({ note: result.note, revision: result.revision });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
