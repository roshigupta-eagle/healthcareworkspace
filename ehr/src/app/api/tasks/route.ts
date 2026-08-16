import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { mockTasks } from '@/lib/mockClinicalData';

export async function GET(req: Request) {
  const session = await auth().catch(() => null);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const patientId = url.searchParams.get('patientId') ?? undefined;

  // If no DB configured, return mock data filtered
  if (!process.env.DATABASE_URL) {
    const tasks = patientId ? mockTasks.filter((t) => t.patientId === patientId) : mockTasks;
    return NextResponse.json({ tasks });
  }

  const where = patientId ? { where: { patientId } } : {};

  try {
    if (!prisma || !prisma.task || typeof prisma.task.findMany !== 'function') throw new Error('Prisma Task model not available');
    const tasks = await prisma.task.findMany({
      where: patientId ? { patientId } : undefined,
      include: { comments: true, activities: true, assignee: true, patient: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ tasks });
  } catch (err) {
    // If Prisma isn't configured or an error occurred, fall back to mock data to keep dev server running
    console.error('Prisma query failed, falling back to mockTasks:', err);
    const tasks = patientId ? mockTasks.filter((t) => t.patientId === patientId) : mockTasks;
    return NextResponse.json({ tasks });
  }
}

export async function POST(req: Request) {
  const session = await auth().catch(() => null);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { title, patientId, assignedTo, priority = 'medium', category = 'General', dueAt } = body;

  if (!title || !patientId) return NextResponse.json({ error: 'Missing title or patientId' }, { status: 400 });

  if (!process.env.DATABASE_URL) {
    // return a generated task object (not persisted)
    const t = {
      id: `t${Date.now()}`,
      title,
      patientId,
      assignedTo: assignedTo ?? null,
      status: 'todo',
      priority,
      category,
      dueAt: dueAt ?? null,
      createdAt: new Date().toISOString(),
      createdBy: session.user.id,
    };
    return NextResponse.json({ task: t });
  }

  const task = await prisma.task.create({
    data: {
      title,
      patientId,
      assignedTo: assignedTo ?? undefined,
      createdBy: session.user.id!,
      status: 'todo',
      priority,
      category,
      dueAt: dueAt ? new Date(dueAt) : undefined,
    },
  });

  return NextResponse.json({ task });
}
