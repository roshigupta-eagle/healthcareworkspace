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
  const [activeTab, setActiveTab] = useState<'overview' | 'myQueue' | 'rooms' | 'allQueues'>(
    'overview',
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Client-side polling: fetch latest dashboard from server API so assignments show up in real-time
  const [dashboardData, setDashboardData] = useState<CardiologyDashboard>(dashboard);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [visitDetails, setVisitDetails] = useState<Record<string, CardiovascularVisit>>({});
  const [allVisits, setAllVisits] = useState<CardiovascularVisit[]>([]);
  const [alertVisitId, setAlertVisitId] = useState<string | null>(null);
  const prevAssignedRef = useRef<string[]>([]);
  // Keep serialized last payloads to avoid no-op state updates that cause
  // unnecessary re-renders (which can look like flicker when frequent).
  const lastDashboardJsonRef = useRef<string | null>(null);
  const lastQueueJsonRef = useRef<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Prefer Server-Sent Events (SSE) for efficient updates with a polling fallback.
  const [useSSE, setUseSSE] = useState(true);
  const [sseConnected, setSseConnected] = useState(false);

  // Dev-only instrumentation: TEMPORARILY DISABLED
  /*
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    if (typeof window === 'undefined') return;

    const root = rootRef.current || document.querySelector('#main-content .page-transition > .bg-white') as HTMLElement | null;

    let ro: ResizeObserver | null = null;
    try {
      ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          // eslint-disable-next-line no-console
          console.debug('[dev] dashboard-resize', { time: Date.now(), width, height });
        }
      });
      if (root) ro.observe(root);
    } catch (e) {
      // ResizeObserver may not be available in some test environments
    }

    const overlay = document.querySelector('.page-transition-overlay') as HTMLElement | null;
    let overlayMo: MutationObserver | null = null;
    if (overlay) {
      overlayMo = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.type === 'attributes' && m.target instanceof HTMLElement) {
            const el = m.target as HTMLElement;
            const hasShow = el.classList.contains('show');
            // eslint-disable-next-line no-console
            console.debug('[dev] overlay-class-change', { time: Date.now(), hasShow });
          }
        }
      });
      overlayMo.observe(overlay, { attributes: true, attributeFilter: ['class'] });
    }

    const docMo = new MutationObserver(() => {
      // eslint-disable-next-line no-console
      console.debug('[dev] document-style-change', { time: Date.now(), opacity: document.documentElement.style.opacity });
    });
    docMo.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });

    const onBeforeUnload = () => console.debug('[dev] beforeunload', { time: Date.now() });
    const onUnload = () => console.debug('[dev] unload', { time: Date.now() });
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('unload', onUnload);

    const originalPush = (window.history as any).pushState;
    const originalReplace = (window.history as any).replaceState;
    (window.history as any).pushState = function (...args: any[]) {
      console.debug('[dev] history.pushState', { time: Date.now(), args });
      return originalPush.apply(this, args);
    };
    (window.history as any).replaceState = function (...args: any[]) {
      console.debug('[dev] history.replaceState', { time: Date.now(), args });
      return originalReplace.apply(this, args);
    };

    return () => {
      try {
        if (ro) ro.disconnect();
        if (overlayMo) overlayMo.disconnect();
        docMo.disconnect();
        window.removeEventListener('beforeunload', onBeforeUnload);
        window.removeEventListener('unload', onUnload);
        (window.history as any).pushState = originalPush;
        (window.history as any).replaceState = originalReplace;
      } catch (e) {
        // ignore
      }
    };
  }, []);
  */

  useEffect(() => {
    if (!enableRealtime) return;
    let cancelled = false;

    // SSE path: TEMPORARILY DISABLED to isolate flicker source
    // Re-enable by uncommenting the block below and setting useSSE to true
    if (false && typeof window !== 'undefined' && (window as any).EventSource && useSSE) {
      const es = new (window as any).EventSource('/api/cardiology/stream');

      es.addEventListener('update', (ev: MessageEvent) => {
        try {
          const payload = JSON.parse(ev.data);
          if (cancelled) return;
          if (payload.dashboard) {
            const s = JSON.stringify(payload.dashboard);
            if (lastDashboardJsonRef.current !== s) {
              lastDashboardJsonRef.current = s;
              if (process.env.NODE_ENV === 'development') console.debug('[dev] SSE dashboard -> updating', { time: Date.now() });
              setDashboardData(payload.dashboard as CardiologyDashboard);
            } else {
              if (process.env.NODE_ENV === 'development') console.debug('[dev] SSE dashboard -> no-op (identical payload)', { time: Date.now() });
            }
          }
          if (payload.queueItems) {
            const s2 = JSON.stringify(payload.queueItems);
            if (lastQueueJsonRef.current !== s2) {
              lastQueueJsonRef.current = s2;
              if (process.env.NODE_ENV === 'development') console.debug('[dev] SSE queueItems -> updating', { time: Date.now() });
              setQueueItems(payload.queueItems as QueueItem[]);
            } else {
              if (process.env.NODE_ENV === 'development') console.debug('[dev] SSE queueItems -> no-op (identical payload)', { time: Date.now() });
            }
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('SSE parse error', err);
        }
      });

      es.addEventListener('error', (err: any) => {
        // eslint-disable-next-line no-console
        console.error('SSE error', err);
        try { es.close(); } catch (_) { /* ignore */ }
        setUseSSE(false);
        setSseConnected(false);
      });

      es.onopen = () => setSseConnected(true);

      return () => {
        cancelled = true;
        try { es.close(); } catch (_) { /* ignore */ }
      };
    }

    // Polling fallback: DISABLED to prevent refresh flicker
    // Rely on SSE for real-time updates; users can manually refresh via button.
    // If SSE fails, the component stays at last-known state until manual refresh.
    // To re-enable: uncomment poll() and setInterval below, adjust interval as needed
    /*
    let id: any = null;
    async function poll() {
      try {
        const [dashRes, qRes] = await Promise.all([
          fetch('/api/cardiology/dashboard'),
          fetch('/api/cardiology/queueitems'),
        ]);
        if (dashRes.ok) {
          const dashJson = await dashRes.json();
          if (!cancelled) {
            const s = JSON.stringify(dashJson);
            if (lastDashboardJsonRef.current !== s) {
              lastDashboardJsonRef.current = s;
              if (process.env.NODE_ENV === 'development') console.debug('[dev] poll dashboard -> updating', { time: Date.now() });
              setDashboardData(dashJson as CardiologyDashboard);
            } else {
              if (process.env.NODE_ENV === 'development') console.debug('[dev] poll dashboard -> no-op', { time: Date.now() });
            }
          }
        }
        if (qRes.ok) {
          const q = await qRes.json();
          if (!cancelled) {
            const s2 = JSON.stringify(q);
            if (lastQueueJsonRef.current !== s2) {
              lastQueueJsonRef.current = s2;
              if (process.env.NODE_ENV === 'development') console.debug('[dev] poll queueItems -> updating', { time: Date.now() });
              setQueueItems(q as QueueItem[]);
            } else {
              if (process.env.NODE_ENV === 'development') console.debug('[dev] poll queueItems -> no-op', { time: Date.now() });
            }
          }
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Dashboard poll error', err);
      }
    }

    poll();
    id = setInterval(poll, 30000); // was 5000ms; increase if re-enabling
    */
    let id: any = null;

    return () => {
      cancelled = true;
      if (id) clearInterval(id);
    };
  }, [enableRealtime, useSSE]);

  // TEMPORARILY DISABLED to isolate flicker source: all effects that fetch/update state
  // Render only static initial data from server prop
  /*
  // Fetch visit details for queue items assigned/claimed to this user
  useEffect(() => {
    const relevant = queueItems.filter((i) => i.assignedTo === userId || i.claimedBy === userId).map((i) => i.visitId);
    const unique = Array.from(new Set(relevant));
    const toFetch = unique.filter((id) => !visitDetails[id]);
    if (toFetch.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const promises = toFetch.map((id) => fetch(`/api/cardiology/visits/${id}`).then((r) => (r.ok ? r.json() : null)));
        const results = await Promise.all(promises);
        if (cancelled) return;
        setVisitDetails((prev) => {
          const copy = { ...prev };
          results.forEach((v, idx) => {
            if (v) copy[toFetch[idx]] = v as CardiovascularVisit;
          });
          return copy;
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('visit details fetch error', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [queueItems, userId, visitDetails]);

  // Fetch all visits for encounters/orders list
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/cardiology/visits');
        if (!res.ok) return;
        const json = await res.json();
        if (!mounted) return;
        setAllVisits(json as CardiovascularVisit[]);
      } catch (err) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Detect newly assigned queue items and pop a modal for the doctor
  useEffect(() => {
    const currentAssigned = queueItems.filter((i) => i.assignedTo === userId || i.claimedBy === userId).map((i) => i.id);
    const prev = prevAssignedRef.current || [];
    const newly = currentAssigned.filter((id) => !prev.includes(id));
    if (newly.length > 0) {
      const newItem = queueItems.find((i) => i.id === newly[0]);
      if (newItem) setAlertVisitId(newItem.visitId);
    }
    prevAssignedRef.current = currentAssigned;
  }, [queueItems, userId]);

  // Auto-close alert modal after a short timeout
  useEffect(() => {
    if (!alertVisitId) return;
    const t = setTimeout(() => setAlertVisitId(null), 10000);
    return () => clearTimeout(t);
  }, [alertVisitId]);
  */

  const navigateToPatient = useCallback((visitId?: string) => {
    if (!visitId) return;
    if (onViewPatientDetail) return onViewPatientDetail(visitId);
    router.push(`/doctor/patients/${visitId}`);
  }, [onViewPatientDetail, router]);

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

      {/* Admin assign panel (only visible to Admin role) */}
      {userRole === CardiologyRole.ADMIN && (
        <Card variant="outlined" className="p-4 min-h-[120px]">
          <h3 className="font-semibold text-neutral-900 mb-2">Admin — Assign Patient</h3>
          <AdminAssignPanel onAssigned={() => onRefresh?.()} />
        </Card>
      )}

      {/* Urgent Alerts */}
      {dashboardData.visits.urgent.length > 0 && (
        <Alert severity="critical">
          <strong>⚠️ Urgent Alerts ({dashboardData.visits.urgent.length})</strong>
          <div className="mt-2 space-y-1">
            {dashboardData.visits.urgent.map((visit) => (
              <div key={visit.id} className="flex items-center justify-between text-sm">
                <span>
                  {visit.patientName} • {visit.chiefComplaint}
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
              {/* Analytics CTA (replaces direct charts in the primary overview) */}
              <Card variant="outlined" className="p-6 mb-4 flex flex-col md:flex-row items-center justify-between ring-1 ring-primary-200">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-neutral-900">Detailed Analytics</h3>
                  <p className="text-sm text-neutral-600 mt-1">Open the analytics portal for full charts, patient timelines, and operational KPIs.</p>
                  <div className="mt-3 grid grid-cols-3 gap-3 max-w-md">
                    <div>
                      <div className="text-xs text-neutral-500">Completed</div>
                      <div className="text-lg font-semibold text-neutral-900">{completedCount} / {totalVisits}</div>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-500">To go</div>
                      <div className="text-lg font-semibold text-amber-600">{Math.max(0, totalVisits - completedCount)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-500">Assigned to you</div>
                      <div className="text-lg font-semibold text-primary-600">{userQueueItems}</div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 md:mt-0">
                  <Button
                    variant="primary"
                    size="lg"
                    aria-label="View detailed analytics"
                    onClick={() => router.push('/doctor/analytics')}
                  >
                    View Detailed Analytics
                    <svg xmlns="http://www.w3.org/2000/svg" className="ml-3 h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                      <path fillRule="evenodd" d="M10.293 15.293a1 1 0 010-1.414L13.586 10 10.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      <path fillRule="evenodd" d="M3 10a1 1 0 011-1h9a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                  </Button>
                </div>
              </Card>

              {/* KPI Cards (no charts) */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <Card variant="outlined" className="p-4 min-h-[120px]">
                  <p className="text-xs font-medium text-neutral-600 uppercase">Patients Today</p>
                  <p className="mt-1 text-3xl font-bold text-neutral-900">{urgentVisits}</p>
                  <p className="mt-1 text-xs text-neutral-500">across all states</p>
                </Card>

                <Card variant="outlined" className="p-4 min-h-[120px]">
                  <p className="text-xs font-medium text-neutral-600 uppercase">Your Queue</p>
                  <p className="mt-1 text-3xl font-bold text-primary-600">{userQueueItems}</p>
                  <p className="mt-1 text-xs text-neutral-500">pending items</p>
                </Card>

                <Card variant="outlined" className="p-4 min-h-[120px]">
                  <p className="text-xs font-medium text-neutral-600 uppercase">Rooms</p>
                  <p className="mt-1 text-3xl font-bold text-neutral-900">
                    {dashboardData.rooms.occupied}/{dashboardData.rooms.total}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">in use</p>
                </Card>

                {/* Completion Rate — numeric only (no chart) */}
                <Card variant="outlined" className="p-4 flex items-center justify-between min-h-[120px]">
                  <div>
                    <p className="text-xs font-medium text-neutral-600 uppercase">Completion Rate</p>
                    <p className="mt-2 text-sm text-neutral-500">Completed consults & procedures</p>
                  </div>
                  {
                    (() => {
                      const totalVisits = Object.values(dashboardData.visits.byState).reduce((a, b) => a + b, 0) || 0;
                      const completedStates = [
                        CardiovascularVisitState.PROCEDURE_COMPLETE,
                        CardiovascularVisitState.CONSULTATION_COMPLETE,
                        CardiovascularVisitState.CHECKOUT_COMPLETE,
                        CardiovascularVisitState.DISCHARGED,
                      ];
                      const completedCount = completedStates.reduce((sum, s) => sum + (dashboardData.visits.byState[s] || 0), 0);
                      const pct = totalVisits > 0 ? Math.round((completedCount / totalVisits) * 100) : 0;
                      return (
                        <div className="text-center">
                          <p className="text-3xl font-bold text-neutral-900">{pct}%</p>
                          <p className="mt-1 text-xs text-neutral-500">{completedCount} / {totalVisits} completed</p>
                        </div>
                      );
                    })()
                  }
                </Card>
              </div>

              {/* My Queue (if user is not admin) */}
              {userRole !== CardiologyRole.ADMIN && userRole !== CardiologyRole.PATIENT && (
                <Card variant="outlined" className="p-4 min-h-[120px]">
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
                  {Object.values(dashboardData.rooms.byType).flat().map((room) => (
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

              {/* Quick Lists: Recent Patients, Encounters, Orders */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card variant="outlined" className="p-4 min-h-[120px]">
                  <h3 className="font-semibold text-neutral-900">Recent Patients</h3>
                  <div className="mt-3 space-y-2">
                    {recentPatientsList.length === 0 && <div className="text-sm text-neutral-500">No recent patients</div>}
                    {recentPatientsList.map((v) => (
                      <div key={v.id} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-neutral-900">{v.patientName}</div>
                          <div className="text-xs text-neutral-600">{v.chiefComplaint}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => navigateToPatient(v.id)}>View</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card variant="outlined" className="p-4 min-h-[120px]">
                  <h3 className="font-semibold text-neutral-900">Encounters</h3>
                  <div className="mt-3 space-y-2">
                    {encountersList.length === 0 && <div className="text-sm text-neutral-500">No encounters</div>}
                    {encountersList.map((v) => (
                      <div key={v.id} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-neutral-900">{v.patientName}</div>
                          <div className="text-xs text-neutral-600">{v.currentState}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => router.push(`/doctor/encounters/${v.id}`)}>View</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card variant="outlined" className="p-4 min-h-[120px]">
                  <h3 className="font-semibold text-neutral-900">Recent Orders</h3>
                  <div className="mt-3 space-y-2">
                    {proceduresList.length === 0 && <div className="text-sm text-neutral-500">No recent orders</div>}
                    {proceduresList.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-neutral-900">{p.procedureType}</div>
                          <div className="text-xs text-neutral-600">for {p.patientName}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => router.push(`/doctor/orders/${p.id}`)}>View</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Recent Events */}
              <Card variant="outlined" className="p-4 min-h-[120px]">
                <h3 className="mb-3 font-semibold text-neutral-900">Recent Activity</h3>
                <div className="space-y-3">
                  {dashboardData.recentEvents.slice(0, 10).map((event) => (
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
                              <p className="text-sm text-neutral-600">{item.queueName} • {item.estimatedDurationMinutes}m</p>
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
