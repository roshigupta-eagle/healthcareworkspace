import { NextResponse } from "next/server";
import { withAudit } from "@/lib/audit";
import { canView } from "@/notes/permissions";
import { addComment, getNote } from "@/notes/service.mock";
import { isActor, requireActor } from "@/notes/serverAuth";

export async function POST(req: Request, { params }: { params: Promise<{ noteId: string }> }) {
  const { noteId } = await params;
  const authed = await requireActor();
  if (!isActor(authed)) return authed;
  const { actor } = authed;
  if (!canView(actor.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const note = getNote(noteId);
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body?.body?.trim()) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  try {
    const comment = await withAudit(
      { agentId: actor.id, entityType: "NoteComment", entityId: noteId, action: "C", description: "Add comment" },
      async () => addComment(noteId, actor, body.body, body.anchorOpId)
    );
    return NextResponse.json({ comment }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
