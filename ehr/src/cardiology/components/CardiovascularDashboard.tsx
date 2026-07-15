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

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
import AdminAssignPanel from './AdminAssignPanel';
import { Modal } from '@/design-system';
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

/**
 * Lightweight SVG progress ring that renders a percentage as a circular arc.
 * Starts at 12 o'clock and fills clockwise. Smooth transition on change.
 */
function ProgressRing({ size = 72, stroke = 8, progress = 0, color = '#7c3aed' }: { size?: number; stroke?: number; progress: number; color?: string; }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (progress / 100) * circumference;
  const offset = circumference - dash;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <defs>
        <filter id="ring-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g transform={`translate(${size / 2}, ${size / 2})`}>
        <circle r={radius} cx={0} cy={0} stroke="#eef2ff" strokeWidth={stroke} fill="transparent" />
        <circle
          r={radius}
          cx={0}
          cy={0}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={offset}
          fill="transparent"
          transform="rotate(-90)"
          style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(.2,.9,.2,1)' }}
          filter="url(#ring-glow)"
        />
        <text x={0} y={4} textAnchor="middle" fontSize={Math.max(12, size * 0.22)} fill="#0f172a" style={{ fontWeight: 700 }}>{Math.round(progress)}%</text>
      </g>
    </svg>
  );
}

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
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'myQueue' | 'rooms' | 'allQueues'>(
    'myQueue',
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [dashboardData, setDashboardData] = useState<CardiologyDashboard>(dashboard);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [visitDetails, setVisitDetails] = useState<Record<string, CardiovascularVisit>>({});
  const [allVisits, setAllVisits] = useState<CardiovascularVisit[]>([]);
  const [alertVisitId, setAlertVisitId] = useState<string | null>(null);
  const prevAssignedRef = useRef<string[]>([]);
  const lastDashboardJsonRef = useRef<string | null>(null);
  const lastQueueJsonRef = useRef<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const [useSSE, setUseSSE] = useState(true);
  const [sseConnected, setSseConnected] = useState(false);

  useEffect(() => {
    if (!enableRealtime) return;
    let cancelled = false;
    let id: any = null;
    return () => {
      cancelled = true;
      if (id) clearInterval(id);
    };
  }, [enableRealtime, useSSE]);

  const navigateToPatient = useCallback((visitId?: string) => {
    if (!visitId) return;
    if (onViewPatientDetail) return onViewPatientDetail(visitId);
    router.push(`/doctor/patients/${visitId}`);
  }, [onViewPatientDetail, router]);

  const userQueueItems = useMemo(() => {
    if (userRole === CardiologyRole.ADMIN) return [] as any;
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
    return dashboardData.queues
      .filter((q) => userQueues.includes(q.queueName))
      .reduce((sum, q) => sum + q.pendingCount, 0);
  }, [userRole, dashboardData.queues]);

  const urgentVisits = useMemo(() => {
    return Object.values(dashboardData.visits.byState).reduce((a, b) => a + b, 0);
  }, [dashboardData.visits]);
  const totalVisits = useMemo(() => {
    return Object.values(dashboardData.visits.byState).reduce((a, b) => a + b, 0) || 0;
  }, [dashboardData.visits]);
  const completedCount = useMemo(() => {
    const completedStates = [
      CardiovascularVisitState.PROCEDURE_COMPLETE,
      CardiovascularVisitState.CONSULTATION_COMPLETE,
      CardiovascularVisitState.CHECKOUT_COMPLETE,
      CardiovascularVisitState.DISCHARGED,
    ];
    return completedStates.reduce((sum, s) => sum + (dashboardData.visits.byState[s] || 0), 0);
  }, [dashboardData.visits]);

  const recentPatientsList = useMemo(() => {
    const urgent = dashboardData.visits.urgent || [];
    const recent = dashboardData.visits.recentDischarges || [];
    return [...urgent, ...recent].slice(0, 6);
  }, [dashboardData.visits]);

  const encountersList = useMemo(() => {
    return (allVisits || []).slice(0, 6);
  }, [allVisits]);

  const proceduresList = useMemo(() => {
    return (allVisits || []).flatMap((v) => (v.proceduresOrdered || []).map((p) => ({ ...p, visitId: v.id, patientName: v.patientName }))).slice(0, 8);
  }, [allVisits]);

  return (
    <div ref={rootRef} className={cn('space-y-6 p-4 md:p-6 bg-neutral-50 min-h-0', className)}>
      <Modal
        open={!!alertVisitId}
        onClose={() => setAlertVisitId(null)}
        title="New assignment"
        description="A patient has been assigned to you"
        size="sm"
        footer={
          <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (alertVisitId) navigateToPatient(alertVisitId);
                    setAlertVisitId(null);
                  }}
                >
                  Open Visit
                </Button>
            <Button variant="ghost" size="sm" onClick={() => setAlertVisitId(null)}>
              Acknowledge
            </Button>
          </>
        }
      >
        {alertVisitId ? (
          (() => {
            const v = visitDetails[alertVisitId];
            return (
              <div className="space-y-3">
                <p className="font-semibold text-neutral-900">{v?.patientName || 'Patient'}</p>
                <p className="text-sm text-neutral-600">{v?.chiefComplaint}</p>
                {v?.carePlan?.symptoms?.length && (
                  <p className="text-sm text-neutral-600">Symptoms: {v.carePlan.symptoms.join(', ')}</p>
                )}
                {v?.carePlan?.diagnosis && (
                  <p className="text-sm text-neutral-600">Diagnosis: {v.carePlan.diagnosis}</p>
                )}
                {v?.carePlan?.nextSteps && (
                  <p className="text-sm text-neutral-600">Next: {v.carePlan.nextSteps}</p>
                )}
                {v?.carePlan?.recommendedProcedure && (
                  <Badge variant="warning" size="sm">{v.carePlan.recommendedProcedure}</Badge>
                )}
              </div>
            );
          })()
        ) : (
          <p className="text-sm text-neutral-600">Loading...</p>
        )}
      </Modal>
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">HealthOS Cardiology</h1>
          <p className="text-sm text-neutral-600">
            {userName} â€¢ {userRole.charAt(0).toUpperCase() + userRole.slice(1).toLowerCase()}
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

      {/* Admin assign panel (only visible to Admin role) */}
      {userRole === CardiologyRole.ADMIN && (
        <Card variant="outlined" className="p-4 min-h-[120px]">
          <h3 className="font-semibold text-neutral-900 mb-2">Admin â€” Assign Patient</h3>
          <AdminAssignPanel onAssigned={() => onRefresh?.()} />
        </Card>
      )}

      {/* Urgent Alerts */}
      {dashboardData.visits.urgent.length > 0 && (
        <Alert severity="critical">
          <strong>âš ï¸Urgent Alerts ({dashboardData.visits.urgent.length})</strong>
          <div className="mt-2 space-y-1">
            {dashboardData.visits.urgent.map((visit) => (
              <div key={visit.id} className="flex items-center justify-between text-sm">
                <span>
                  {visit.patientName} â€¢ {visit.chiefComplaint}
                </span>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => navigateToPatient(visit.id)}
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
          {(['myQueue', 'rooms', 'allQueues'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'text-primary-600 border-primary-600'
                  : 'text-neutral-600 border-transparent hover:text-neutral-900'
              }`}
            >
              {tab === 'myQueue' && 'My Queue'}
              {tab === 'rooms' && 'Rooms'}
              {tab === 'allQueues' && 'All Queues'}
            </button>
          ))}
        </div>
        <div className="space-y-6">

          {/* Tab: My Queue */}
          {activeTab === 'myQueue' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-neutral-900">My Pending Items</h3>
              {queueItems.filter((i) => i.assignedTo === userId || i.claimedBy === userId).length === 0 ? (
                <Alert severity="info">No pending items in your queues.</Alert>
              ) : (
                <div className="space-y-3">
                  {queueItems
                    .filter((i) => i.assignedTo === userId || i.claimedBy === userId)
                    .map((item) => {
                      const visit = visitDetails[item.visitId];
                      return (
                        <Card key={item.id} variant="outlined" className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-neutral-900">{item.patientName}</p>
                              <p className="text-sm text-neutral-600">{item.queueName} â€¢ {item.estimatedDurationMinutes}m</p>
                              <div className="mt-1 text-sm text-neutral-600">
                                {visit?.carePlan?.symptoms?.length ? `Symptoms: ${visit.carePlan.symptoms.join(', ')}` : visit?.chiefComplaint}
                              </div>
                              {visit?.carePlan?.diagnosis && (
                                <div className="text-sm text-neutral-600">Diagnosis: {visit.carePlan.diagnosis}</div>
                              )}
                              {visit?.carePlan?.nextSteps && (
                                <div className="text-sm text-neutral-600">Next: {visit.carePlan.nextSteps}</div>
                              )}
                              {visit?.carePlan?.recommendedProcedure && (
                                <div className="mt-2">
                                  <Badge variant="warning" size="sm">Recommended: {visit.carePlan.recommendedProcedure}</Badge>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <Button variant="ghost" size="sm" onClick={() => navigateToPatient(item.visitId)}>
                                View
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* Tab: Rooms */}
          {activeTab === 'rooms' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-neutral-900">Room Management</h3>
              <div className="space-y-2">
                {Object.values(dashboardData.rooms.byType).flat().map((room) => (
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
                {dashboardData.queues.map((queue) => (
                  <Card key={queue.queueName} variant="outlined" className="p-4 cursor-pointer hover:shadow-md" onClick={() => onViewQueue?.(queue.queueName)}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-neutral-900">{queue.queueName}</p>
                        <p className="mt-1 text-sm text-neutral-600">
                          {queue.pendingCount} pending â€¢ {queue.inProgressCount} in progress
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
