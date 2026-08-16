import { NextResponse } from "next/server";
import { withAudit } from "@/lib/audit";
import { canAddendum } from "@/notes/permissions";
import { addAddendum, getNote } from "@/notes/service.mock";
import { isActor, requireActor } from "@/notes/serverAuth";

export async function POST(req: Request, { params }: { params: Promise<{ noteId: string }> }) {
  const { noteId } = await params;
  const authed = await requireActor();
  if (!isActor(authed)) return authed;
  const { actor } = authed;

  const note = getNote(noteId);
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canAddendum(actor.role, note)) {
    return NextResponse.json({ error: "Forbidden: role cannot add an addendum to this note" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.text?.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  try {
    await withAudit(
      { agentId: actor.id, entityType: "ClinicalNote", entityId: noteId, action: "C", description: "Add addendum" },
      async () => addAddendum(noteId, actor, body.text)
    );
    return NextResponse.json({ note: getNote(noteId) });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
