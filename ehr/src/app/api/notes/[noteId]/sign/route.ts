import { NextResponse } from "next/server";
import { withAudit } from "@/lib/audit";
import { canSign } from "@/notes/permissions";
import { getNote, signNote } from "@/notes/service.mock";
import { isActor, requireActor } from "@/notes/serverAuth";

export async function POST(_req: Request, { params }: { params: Promise<{ noteId: string }> }) {
  const { noteId } = await params;
  const authed = await requireActor();
  if (!isActor(authed)) return authed;
  const { actor } = authed;

  const note = getNote(noteId);
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canSign(actor.role, note.type)) {
    return NextResponse.json({ error: "Forbidden: role cannot sign this note type" }, { status: 403 });
  }
  if (note.pendingRevisions.length > 0) {
    return NextResponse.json(
      { error: "Cannot sign: pending changes must be resolved first", pendingCount: note.pendingRevisions.length },
      { status: 409 }
    );
  }

  try {
    const updated = await withAudit(
      { agentId: actor.id, entityType: "ClinicalNote", entityId: noteId, action: "U", description: "Sign note" },
      async () => signNote(noteId, actor)
    );
    return NextResponse.json({ note: updated });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 409 });
  }
}
