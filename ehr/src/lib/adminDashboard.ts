import { prisma } from '@/lib/prisma';

export type AdminDashboardData = {
  readonly activeUsers: number | null;
  readonly pendingUsers: number | null;
  readonly patientRecords: number | null;
  readonly openEncounters: number | null;
  readonly auditFailures: number | null;
  readonly recentActivity: readonly { id: string; action: string; entityType: string | null; recorded: Date; actor: string | null }[];
};

async function countOrUnavailable(work: () => Promise<number>) {
  try { return await work(); } catch { return null; }
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const [activeUsers, pendingUsers, patientRecords, openEncounters, auditFailures, recentActivity] = await Promise.all([
    countOrUnavailable(() => prisma.user.count({ where: { role: { not: 'PENDING' } } })),
    countOrUnavailable(() => prisma.user.count({ where: { role: 'PENDING' } })),
    countOrUnavailable(() => prisma.patient.count()),
    countOrUnavailable(() => prisma.encounter.count({ where: { status: { in: ['planned', 'arrived', 'in-progress'] } } })),
    countOrUnavailable(() => prisma.auditEvent.count({ where: { outcome: 'failure' } })),
    prisma.auditEvent.findMany({ orderBy: { recorded: 'desc' }, take: 6, include: { agent: { select: { name: true, email: true } } } }).then((events) => events.map((event) => ({ id: event.id, action: event.action, entityType: event.entityType, recorded: event.recorded, actor: event.agent?.name ?? event.agent?.email ?? null }))).catch(() => []),
  ]);
  return { activeUsers, pendingUsers, patientRecords, openEncounters, auditFailures, recentActivity };
}
