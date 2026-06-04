'use client';

/**
 * Cardiology Practice Dashboard
 *
 * Role-based dashboard component for the cardiology practice system.
 * Shows real-time patient flow, queue status, room occupancy, and urgent alerts.
 *
 * Features:
 * - Role-specific views (Receptionist, Nurse, Cardiologist, Technician, Billing, Admin)
 * - Real-time updates via WebSocket/polling
 * - Quick actions for claiming queue items
 * - Room occupancy heatmap
 * - Urgent patient alerts with visual priority indicators
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { cn } from '@/design-system/utils/cn';
import {
  Card,
  Alert,
  Badge,
  Button,
  Spinner,
  DataTable,
  Tabs,
} from '@/design-system';
import {
  CardiologyRole,
  CardiovascularVisitState,
  CardiovascularVisit,
  CardiologyDashboard,
  QueueItem,
  QueueStats,
  CardiovascularRoom,
  VisitPriority,
  DomainEvent,
} from '../types/fhir-domain';

interface CardiovascularDashboardProps {
  /**
   * Current user context (from session/JWT)
   */
  userId: string;
  userName: string;
  userRole: CardiologyRole;

  /**
   * Dashboard data (typically from API)
   */
  dashboard: CardiologyDashboard;

  /**
   * Called when user claims a queue item
   * @param queueItemId Item to claim
   */
  onClaimQueueItem?: (queueItemId: string) => void;

  /**
   * Called when user wants to view patient detail
   * @param visitId Patient visit to view
   */
  onViewPatientDetail?: (visitId: string) => void;

  /**
   * Called when user wants to view queue detail
   * @param queueName Which queue to view
   */
  onViewQueue?: (queueName: string) => void;

  /**
   * Real-time update callback (fires when dashboard data changes)
   * Typically triggers a WebSocket refresh or API polling
   */
  onRefresh?: () => void;

  /**
   * Enable real-time updates (default: true)
   */
  enableRealtime?: boolean;

  className?: string;
}

/**
 * Priority color classes for visual consistency
 */
const priorityColorMap: Record<VisitPriority, { bg: string; text: string; badge: string }> = {
  [VisitPriority.URGENT]: {
    bg: 'bg-critical-50 border-critical-200',
    text: 'text-critical-900',
    badge: 'critical',
  },
  [VisitPriority.HIGH]: {
    bg: 'bg-warning-50 border-warning-200',
    text: 'text-warning-900',
    badge: 'warning',
  },
  [VisitPriority.NORMAL]: {
    bg: 'bg-info-50 border-info-200',
    text: 'text-info-900',
    badge: 'info',
  },
  [VisitPriority.LOW]: {
    bg: 'bg-neutral-50 border-neutral-200',
    text: 'text-neutral-700',
    badge: 'neutral',
  },
};

/**
 * Map state names to human-readable labels
 */
const stateLabels: Record<CardiovascularVisitState, string> = {
  [CardiovascularVisitState.REFERRAL_RECEIVED]: 'Referral Received',
  [CardiovascularVisitState.SCHEDULING]: 'Scheduling',
  [CardiovascularVisitState.APPOINTMENT_SCHEDULED]: 'Appointment Scheduled',
  [CardiovascularVisitState.APPOINTMENT_CONFIRMED]: 'Appointment Confirmed',
  [CardiovascularVisitState.PRE_VISIT_FORMS]: 'Pre-Visit Forms',
  [CardiovascularVisitState.PATIENT_ARRIVED]: 'Patient Arrived',
  [CardiovascularVisitState.CHECKING_IN]: 'Checking In',
  [CardiovascularVisitState.CHECKED_IN]: 'Checked In',
  [CardiovascularVisitState.IN_WAITING_ROOM]: 'In Waiting Room',
  [CardiovascularVisitState.NURSING_ASSESSMENT]: 'Nursing Assessment',
  [CardiovascularVisitState.IN_EXAM_ROOM]: 'In Exam Room',
  [CardiovascularVisitState.PHYSICIAN_PENDING]: 'Physician Pending',
  [CardiovascularVisitState.PHYSICIAN_WITH_PATIENT]: 'Physician With Patient',
  [CardiovascularVisitState.ORDERS_PLACED]: 'Orders Placed',
  [CardiovascularVisitState.PROCEDURE_QUEUED]: 'Procedure Queued',
  [CardiovascularVisitState.IN_PROCEDURE]: 'In Procedure',
  [CardiovascularVisitState.PROCEDURE_COMPLETE]: 'Procedure Complete',
  [CardiovascularVisitState.RESULTS_READY]: 'Results Ready',
  [CardiovascularVisitState.RESULTS_REVIEW]: 'Results Review',
  [CardiovascularVisitState.CONSULTATION_COMPLETE]: 'Consultation Complete',
  [CardiovascularVisitState.CHECKING_OUT]: 'Checking Out',
  [CardiovascularVisitState.CHECKOUT_COMPLETE]: 'Checkout Complete',
  [CardiovascularVisitState.BILLING_PENDING]: 'Billing Pending',
  [CardiovascularVisitState.FOLLOW_UP_SCHEDULED]: 'Follow-up Scheduled',
  [CardiovascularVisitState.DISCHARGED]: 'Discharged',
  [CardiovascularVisitState.ON_HOLD]: 'On Hold',
  [CardiovascularVisitState.CANCELLED]: 'Cancelled',
  [CardiovascularVisitState.NO_SHOW]: 'No-Show',
};

export const CardiovascularDashboard: React.FC<CardiovascularDashboardProps> = ({
  userId,
  userName,
  userRole,
  dashboard,
  onClaimQueueItem,
  onViewPatientDetail,
  onViewQueue,
  onRefresh,
  enableRealtime = true,
  className,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'myQueue' | 'rooms' | 'allQueues'>(
    'overview',
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Set up real-time polling
  useEffect(() => {
    if (!enableRealtime) return;
    const pollInterval = setInterval(() => {
      onRefresh?.();
    }, 3000); // Poll every 3 seconds
    return () => clearInterval(pollInterval);
  }, [enableRealtime, onRefresh]);

  // Compute role-specific queue items for current user
  const userQueueItems = useMemo(() => {
    if (userRole === CardiologyRole.ADMIN) return [];
    // Filter to queues owned by this role — simplified mapping
    const queuesByRole: Record<CardiologyRole, string[]> = {
      [CardiologyRole.RECEPTIONIST]: [
        'CHECK_IN',
        'CHECKOUT',
        'SCHEDULING',
        'FOLLOW_UP_SCHEDULING',
      ],
      [CardiologyRole.NURSE]: ['NURSING_ASSESSMENT'],
      [CardiologyRole.CARDIOLOGIST]: ['PHYSICIAN_CONSULT', 'RESULTS_REVIEW'],
      [CardiologyRole.TECHNICIAN]: [
        'PROCEDURE_ECG',
        'PROCEDURE_ECHO',
        'PROCEDURE_STRESS_TEST',
        'PROCEDURE_HOLTER',
      ],
      [CardiologyRole.BILLING]: ['BILLING'],
      [CardiologyRole.ADMIN]: [],
      [CardiologyRole.PATIENT]: [],
      [CardiologyRole.SYSTEM]: [],
    };
    const userQueues = queuesByRole[userRole] || [];
    return dashboard.queues
      .filter((q) => userQueues.includes(q.queueName))
      .reduce((sum, q) => sum + q.pendingCount, 0);
  }, [userRole, dashboard.queues]);

  const urgentVisits = useMemo(() => {
    return Object.values(dashboard.visits.byState).reduce((a, b) => a + b, 0);
  }, [dashboard.visits]);

  return (
    <div className={cn('space-y-6 p-4 md:p-6 bg-neutral-50 min-h-screen', className)}>
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">HealthOS Cardiology</h1>
          <p className="text-sm text-neutral-600">
            {userName} • {userRole.charAt(0).toUpperCase() + userRole.slice(1).toLowerCase()}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          loading={isRefreshing}
          onClick={() => {
            setIsRefreshing(true);
            onRefresh?.();
            setTimeout(() => setIsRefreshing(false), 500);
          }}
        >
          Refresh
        </Button>
      </div>

      {/* Urgent Alerts */}
      {dashboard.visits.urgent.length > 0 && (
        <Alert severity="critical">
          <strong>⚠️ Urgent Alerts ({dashboard.visits.urgent.length})</strong>
          <div className="mt-2 space-y-1">
            {dashboard.visits.urgent.map((visit) => (
              <div key={visit.id} className="flex items-center justify-between text-sm">
                <span>
                  {visit.patientName} • {visit.chiefComplaint}
                </span>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => onViewPatientDetail?.(visit.id)}
                >
                  View
                </Button>
              </div>
            ))}
          </div>
        </Alert>
      )}

      {/* Main Tabs */}
      <div className="bg-white rounded-lg p-4">
        <div className="flex gap-2 border-b border-neutral-200 mb-4">
          {(['overview', 'myQueue', 'rooms', 'allQueues'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'text-primary-600 border-primary-600'
                  : 'text-neutral-600 border-transparent hover:text-neutral-900'
              }`}
            >
              {tab === 'overview' && 'Overview'}
              {tab === 'myQueue' && 'My Queue'}
              {tab === 'rooms' && 'Rooms'}
              {tab === 'allQueues' && 'All Queues'}
            </button>
          ))}
        </div>
        <div className="space-y-6">
          {/* Tab: Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <Card variant="outlined" className="p-4">
                  <p className="text-xs font-medium text-neutral-600 uppercase">Patients Today</p>
                  <p className="mt-1 text-3xl font-bold text-neutral-900">{urgentVisits}</p>
                  <p className="mt-1 text-xs text-neutral-500">across all states</p>
                </Card>

                <Card variant="outlined" className="p-4">
                  <p className="text-xs font-medium text-neutral-600 uppercase">Your Queue</p>
                  <p className="mt-1 text-3xl font-bold text-primary-600">{userQueueItems}</p>
                  <p className="mt-1 text-xs text-neutral-500">pending items</p>
                </Card>

                <Card variant="outlined" className="p-4">
                  <p className="text-xs font-medium text-neutral-600 uppercase">Rooms</p>
                  <p className="mt-1 text-3xl font-bold text-neutral-900">
                    {dashboard.rooms.occupied}/{dashboard.rooms.total}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">in use</p>
                </Card>

                <Card variant="outlined" className="p-4">
                  <p className="text-xs font-medium text-neutral-600 uppercase">Avg Wait</p>
                  <p className="mt-1 text-3xl font-bold text-warning-600">
                    {Math.round(
                      dashboard.queues.reduce((sum, q) => sum + q.averageWaitMinutes, 0) /
                        dashboard.queues.length,
                    )}m
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">across queues</p>
                </Card>
              </div>

              {/* My Queue (if user is not admin) */}
              {userRole !== CardiologyRole.ADMIN && userRole !== CardiologyRole.PATIENT && (
                <Card variant="outlined" className="p-4">
                  <h3 className="font-semibold text-neutral-900">My Queue</h3>
                  <p className="mt-1 text-sm text-neutral-600">
                    {userQueueItems === 0 ? 'No pending items' : `${userQueueItems} items waiting`}
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    className="mt-4"
                    onClick={() => setActiveTab('myQueue')}
                  >
                    View All Items
                  </Button>
                </Card>
              )}

              {/* Room Status Grid */}
              <div>
                <h3 className="mb-3 font-semibold text-neutral-900">Room Status</h3>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
                  {Object.values(dashboard.rooms.byType).flat().map((room) => (
                    <Card
                      key={room.id}
                      variant="outlined"
                      className={`p-3 text-center cursor-pointer hover:shadow-md ${
                        room.isAvailable
                          ? 'bg-success-50 border-2 border-success-200'
                          : 'bg-warning-50 border-2 border-warning-200'
                      }`}
                      onClick={() => onViewQueue?.('ROOM_DETAIL')}
                    >
                      <p className="text-xs font-bold text-neutral-700">{room.roomNumber}</p>
                      <p className="mt-1 text-xs text-neutral-600">
                        {room.isAvailable ? '✓ Available' : `${room.currentOccupancy}/${room.capacity}`}
                      </p>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Recent Events */}
              <Card variant="outlined" className="p-4">
                <h3 className="mb-3 font-semibold text-neutral-900">Recent Activity</h3>
                <div className="space-y-3">
                  {dashboard.recentEvents.slice(0, 10).map((event) => (
                    <div key={event.id} className={`flex items-start justify-between border-b border-neutral-200 pb-2 text-sm ${
                      event.eventType === 'STATE_TRANSITION' ? '' : ''
                    }`}>
                      <div>
                        <p className="font-medium text-neutral-900">{event.eventType}</p>
                        <p className="text-xs text-neutral-600">
                          {event.fromState} → {event.toState} by {event.actorRole}
                        </p>
                      </div>
                      <span className="text-xs text-neutral-500 whitespace-nowrap">
                        {new Date(event.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Tab: My Queue */}
          {activeTab === 'myQueue' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-neutral-900">My Pending Items</h3>
              {userQueueItems === 0 ? (
                <Alert severity="info">No pending items in your queues.</Alert>
              ) : (
                <div className="space-y-3">
                  {/* Simplified queue item list — in production would be paginated */}
                  <p className="text-sm text-neutral-600">
                    {userQueueItems} total items. Claim highest priority items first.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tab: Rooms */}
          {activeTab === 'rooms' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-neutral-900">Room Management</h3>
              <div className="space-y-2">
                {Object.values(dashboard.rooms.byType).flat().map((room) => (
                  <Card key={room.id} variant="outlined" className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-neutral-900">{room.roomNumber}</p>
                        <p className="text-sm text-neutral-600">
                          {room.occupantNames.join(', ') || 'Empty'}
                        </p>
                      </div>
                      <Badge variant={room.isAvailable ? 'info' : 'warning'} size="sm">
                        {room.isAvailable ? 'Available' : `${room.currentOccupancy}/${room.capacity}`}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Tab: All Queues */}
          {activeTab === 'allQueues' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-neutral-900">All Work Queues</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {dashboard.queues.map((queue) => (
                  <Card key={queue.queueName} variant="outlined" className="p-4 cursor-pointer hover:shadow-md" onClick={() => onViewQueue?.(queue.queueName)}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-neutral-900">{queue.queueName}</p>
                        <p className="mt-1 text-sm text-neutral-600">
                          {queue.pendingCount} pending • {queue.inProgressCount} in progress
                        </p>
                        <div className="mt-2 h-2 bg-neutral-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-600"
                            style={{
                              width: `${Math.min(100, (queue.pendingCount / 10) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                      <Badge variant="info" size="sm">
                        {queue.oldestItemAgeMinutes}m
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
