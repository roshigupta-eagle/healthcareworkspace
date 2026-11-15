import React from 'react';
import { CardiovascularDashboard } from '@/cardiology/components/CardiovascularDashboard';
import type { CardiologyDashboard as DashboardType } from '@/cardiology/types/fhir-domain';
import { CardiologyRole, CardiovascularVisitState, VisitPriority, RoomType } from '@/cardiology/types/fhir-domain';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

function generateMockDashboard(): DashboardType {
  const byState = Object.values(CardiovascularVisitState).reduce((acc, s) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - dynamic construction for mock
    acc[s] = 0;
    return acc;
  }, {} as Record<string, number>);

  const byPriority = Object.values(VisitPriority).reduce((acc, p) => {
    // @ts-ignore
    acc[p as unknown as number] = 0;
    return acc;
  }, {} as Record<number, number>);

  const roomsByType: Record<string, any[]> = {
    [RoomType.EXAM_ROOM]: [
      {
        id: 'r-101',
        tenantId: 't-1',
        roomNumber: '101',
        roomType: RoomType.EXAM_ROOM,
        capacity: 1,
        currentOccupancy: 1,
        occupantNames: ['Jane Doe'],
        isAvailable: false,
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'r-102',
        tenantId: 't-1',
        roomNumber: '102',
        roomType: RoomType.EXAM_ROOM,
        capacity: 1,
        currentOccupancy: 0,
        occupantNames: [],
        isAvailable: true,
        lastUpdated: new Date().toISOString(),
      },
    ],
    [RoomType.ECG_ROOM]: [],
    [RoomType.ECHO_LAB]: [],
    [RoomType.WAITING_ROOM]: [],
  };

  const dashboard: DashboardType = {
    tenantId: 't-1',
    generatedAt: new Date().toISOString(),
    visits: {
      byState: byState as any,
      byPriority: byPriority as any,
      urgent: [],
      recentDischarges: [],
    },
    queues: [
      {
        queueName: 'CHECK_IN' as any,
        pendingCount: 3,
        inProgressCount: 1,
        averageWaitMinutes: 7,
        oldestItemAgeMinutes: 12,
      },
      {
        queueName: 'PROCEDURE_ECG' as any,
        pendingCount: 1,
        inProgressCount: 0,
        averageWaitMinutes: 14,
        oldestItemAgeMinutes: 14,
      },
    ],
    rooms: {
      total: 2,
      occupied: 1,
      available: 1,
      byType: roomsByType,
    },
    recentEvents: [],
    staffWorkload: [],
  };

  return dashboard;
}

export default async function Page() {
  const dashboard = generateMockDashboard();

  const session = await auth().catch(() => null);
  if (!session?.user?.id) redirect('/login?returnTo=%2Fcardiology');
  const userId = session.user.id as string;
  const userName = session.user.name || 'Clinician';
  const sessionRole = (session.user as { role?: string }).role;
  const userRole = (sessionRole as unknown as CardiologyRole | undefined) ?? CardiologyRole.CARDIOLOGIST;

  return (
    <div className="p-6">
      <CardiovascularDashboard
        userId={userId}
        userName={userName}
        userRole={userRole}
        dashboard={dashboard}
      />
    </div>
  );
}
