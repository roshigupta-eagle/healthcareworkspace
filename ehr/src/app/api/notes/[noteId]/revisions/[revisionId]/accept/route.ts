import { NextResponse } from "next/server";
import { withAudit } from "@/lib/audit";
import { canReviewChanges } from "@/notes/permissions";
import { acceptRevision, getNote } from "@/notes/service.mock";
import { isActor, requireActor } from "@/notes/serverAuth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ noteId: string; revisionId: string }> }
) {
  const { noteId, revisionId } = await params;
  const authed = await requireActor();
  if (!isActor(authed)) return authed;
  const { actor } = authed;

  const note = getNote(noteId);
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canReviewChanges(actor.role, note)) {
    return NextResponse.json({ error: "Forbidden: role cannot review changes on this note" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  try {
    const updated = await withAudit(
      { agentId: actor.id, entityType: "NoteRevision", entityId: revisionId, action: "U", description: "Accept tracked change" },
      async () => acceptRevision(noteId, revisionId, actor, body?.opIds)
    );
    return NextResponse.json({ note: updated });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 409 });
  }
}
