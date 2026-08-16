import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { mockTasks } from '@/lib/mockClinicalData';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = params.id;
  const body = await req.json().catch(() => ({}));
  const { action } = body;

  if (!process.env.DATABASE_URL) {
    // operate on mock data (non-persistent)
    const t = mockTasks.find((m) => m.id === id);
    if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (action === 'toggleComplete' || action === 'markComplete') {
      t.status = 'completed';
      t.completedAt = new Date().toISOString();
    } else if (action === 'delegate') {
      t.assignedTo = body.to;
      t.status = 'delegated';
    } else if (action === 'addNote') {
      const note = { id: String(Math.random()).slice(2, 8), authorId: session.user.id!, body: body.note?.body ?? body.note ?? '', createdAt: new Date().toISOString() };
      t.notes = [...(t.notes ?? []), note];
    } else if (action === 'update') {
      Object.assign(t, body.update ?? {});
    }
    return NextResponse.json({ task: t });
  }

  // DB-backed updates
  if (action === 'toggleComplete' || action === 'markComplete') {
    const updated = await prisma.task.update({ where: { id }, data: { status: 'completed', completedAt: new Date() } });
    await prisma.taskActivity.create({ data: { taskId: id, type: 'status', detail: `${session.user.name ?? session.user.id} marked complete`, actorId: session.user.id } }).catch(() => null);
    return NextResponse.json({ task: updated });
  }

  if (action === 'delegate') {
    const to = body.to;
    const updated = await prisma.task.update({ where: { id }, data: { assignedTo: to, status: 'delegated' } });
    await prisma.taskAssignment.create({ data: { taskId: id, fromUser: session.user.id, toUser: to, reason: body.reason ?? null } }).catch(() => null);
    await prisma.taskActivity.create({ data: { taskId: id, type: 'assignment', detail: `Delegated to ${to}`, actorId: session.user.id } }).catch(() => null);
    return NextResponse.json({ task: updated });
  }

  if (action === 'addNote') {
    const noteBody = body.note?.body ?? body.note ?? '';
    const comment = await prisma.taskComment.create({ data: { taskId: id, authorId: session.user.id!, body: noteBody } });
    await prisma.taskActivity.create({ data: { taskId: id, type: 'note', detail: noteBody, actorId: session.user.id } }).catch(() => null);
    const task = await prisma.task.findUnique({ where: { id }, include: { comments: true, activities: true, assignee: true } });
    return NextResponse.json({ task, comment });
  }

  if (action === 'update') {
    const update = body.update ?? {};
    const data: any = {};
    if (update.title) data.title = update.title;
    if (update.status) data.status = update.status;
    if (update.priority) data.priority = update.priority;
    if (update.assignedTo) data.assignedTo = update.assignedTo;
    if (update.dueAt) data.dueAt = new Date(update.dueAt);
    const updated = await prisma.task.update({ where: { id }, data });
    await prisma.taskActivity.create({ data: { taskId: id, type: 'system', detail: `Task updated by ${session.user.id}`, actorId: session.user.id } }).catch(() => null);
    return NextResponse.json({ task: updated });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
