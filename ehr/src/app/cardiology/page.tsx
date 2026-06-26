import React from 'react';
import { CardiovascularDashboard } from '@/cardiology/components/CardiovascularDashboard';
import type { CardiologyDashboard as DashboardType } from '@/cardiology/types/fhir-domain';
import { CardiologyRole, CardiovascularVisitState, VisitPriority, RoomType } from '@/cardiology/types/fhir-domain';
import { auth } from '@/lib/auth';
import { getAllMockUsers } from '@/cardiology/services/api.mock';

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

export default async function Page({ searchParams }: { searchParams?: Record<string, string | string[]> }) {
  const dashboard = generateMockDashboard();

  let userId = 'u-1';
  let userName = 'Dr. Heart';
  let userRole = CardiologyRole.CARDIOLOGIST;

  // Prefer real session if available
  try {
    // auth() returns session when NextAuth is configured
    // In dev this may be null
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const session = await auth();
    if (session?.user?.id) {
      userId = session.user.id as string;
      userName = session.user.name || userName;
      // session may include role in custom claims
      if ((session as any)?.user?.role) userRole = (session as any).user.role;
    }
  } catch (err) {
    // ignore if auth not available
  }

  // Allow dev override via ?asUser=USER_ID
  if (searchParams && searchParams.asUser) {
    const override = Array.isArray(searchParams.asUser) ? searchParams.asUser[0] : searchParams.asUser;
    const all = getAllMockUsers();
    if (override && all[override]) {
      userId = override;
      userName = all[override].name;
      userRole = all[override].role;
    } else if (override) {
      userId = override;
    }
  }

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
