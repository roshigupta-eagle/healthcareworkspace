"use client";

import Link from "next/link";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import WorkspaceDrawer from "@/components/doctor-workspace/WorkspaceDrawer";
import type { ReferralPriority } from "@/lib/referralStore";
import type {
  ReferralFilter,
  ReferralPatientSummary,
  ReferralSort,
  ReferralWorklistItem,
  ReferralWorkspaceSnapshot,
} from "@/lib/referralWorkspace";
import {
  availableReferralTransitions,
  referralLifecycleTimeline,
  type ReferralTransitionAction,
} from "@/lib/referralWorkflow";
import "./referral-command-center.css";

type ViewMode = "list" | "cards";
type DetailTab = "overview" | "activity" | "related";
type CreateForm = {
  patientId: string;
  subject: string;
  specialty: string;
  destination: string;
  priority: ReferralPriority;
  dueAt: string;
  note: string;
};

type Props = {
  initialData: ReferralWorkspaceSnapshot;
  initialReferralId?: string;
  initialCreateOpen?: boolean;
  initialPatientId?: string;
};

type IconName =
  | "referral"
  | "alert"
  | "clock"
  | "users"
  | "waiting"
  | "check"
  | "plus"
  | "refresh"
  | "search"
  | "list"
  | "grid"
  | "more"
  | "arrow"
  | "close"
  | "patient"
  | "source"
  | "calendar"
  | "activity"
  | "send"
  | "shield"
  | "filter";

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    referral: (
      <>
        <path d="M5 4h10l4 4v12H5z" />
        <path d="M14 4v5h5M8 14h8M8 17h5" />
      </>
    ),
    alert: (
      <>
        <path d="M12 3 21 19H3L12 3z" />
        <path d="M12 9v4M12 16h.01" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    users: (
      <>
        <path d="M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" />
        <circle cx="9.5" cy="7" r="3" />
        <path d="M17 11a3 3 0 1 0 0-6M21 20v-1a4 4 0 0 0-3-3.8" />
      </>
    ),
    waiting: (
      <>
        <path d="M12 3v5M12 16v5M3 12h5M16 12h5" />
        <circle cx="12" cy="12" r="4" />
      </>
    ),
    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.5 2.5L16 9" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    refresh: (
      <>
        <path d="M20 11a8 8 0 0 0-14-5L3 9M3 4v5h5M4 13a8 8 0 0 0 14 5l3-3M21 20v-5h-5" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
    grid: (
      <>
        <rect x="4" y="4" width="6" height="6" rx="1" />
        <rect x="14" y="4" width="6" height="6" rx="1" />
        <rect x="4" y="14" width="6" height="6" rx="1" />
        <rect x="14" y="14" width="6" height="6" rx="1" />
      </>
    ),
    more: (
      <>
        <circle cx="5" cy="12" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
      </>
    ),
    arrow: <path d="M5 12h13M13 6l6 6-6 6" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    patient: (
      <>
        <circle cx="12" cy="8" r="3" />
        <path d="M5 21a7 7 0 0 1 14 0" />
      </>
    ),
    source: (
      <>
        <path d="M6 3h9l4 4v14H6z" />
        <path d="M14 3v5h5M9 13h6M9 17h5" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M3 10h18" />
      </>
    ),
    activity: <path d="M3 12h4l2-7 4 14 2-7h6" />,
    send: (
      <>
        <path d="m4 4 16 8-16 8 3-8-3-8Z" />
        <path d="M7 12h13" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 20 6v5c0 5-3.3 8.3-8 10-4.7-1.7-8-5-8-10V6l8-3Z" />
        <path d="m8 12 2.5 2.5L16 9" />
      </>
    ),
    filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function dateValue(value?: string) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value?: string, includeTime = false) {
  const timestamp = dateValue(value);
  if (!timestamp) return "Not specified";
  const date = new Date(timestamp);
  if (!includeTime)
    return new Intl.DateTimeFormat("en-CA", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  return `${new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: "numeric" }).format(date)} · ${new Intl.DateTimeFormat("en-CA", { hour: "numeric", minute: "2-digit" }).format(date)}`;
}

function humanize(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[-_]+/g, " ");
}

function priorityMeta(priority: ReferralPriority) {
  if (priority === "urgent")
    return { label: "Urgent", className: "is-urgent", icon: "alert" as const };
  if (priority === "high")
    return { label: "High", className: "is-high", icon: "activity" as const };
  return { label: "Routine", className: "is-routine", icon: "check" as const };
}

function statusMeta(status: ReferralWorklistItem["status"]) {
  if (
    status === "NeedsInformation" ||
    status === "UnderReview" ||
    status === "Submitted" ||
    status === "Routing"
  )
    return {
      label: humanize(status),
      className: "is-action",
      icon: "alert" as const,
    };
  if (["Delivered", "Received", "Accepted", "Waitlisted"].includes(status))
    return {
      label: humanize(status),
      className: "is-waiting",
      icon: "waiting" as const,
    };
  if (status === "Scheduling" || status === "Scheduled")
    return {
      label: humanize(status),
      className: "is-scheduled",
      icon: "calendar" as const,
    };
  if (["ConsultCompleted", "OutcomeReceived", "Closed"].includes(status))
    return {
      label: humanize(status),
      className: "is-complete",
      icon: "check" as const,
    };
  if (["Cancelled", "Declined"].includes(status))
    return {
      label: humanize(status),
      className: "is-muted",
      icon: "close" as const,
    };
  return {
    label: humanize(status),
    className: "is-neutral",
    icon: "referral" as const,
  };
}

function dueMeta(item: ReferralWorklistItem, now: Date) {
  if (!item.dueAt) return { label: "No due date", className: "is-neutral" };
  const due = dateValue(item.dueAt);
  if (
    due &&
    due < now.getTime() &&
    !["Closed", "Cancelled", "Declined"].includes(item.status)
  ) {
    const days = Math.max(1, Math.ceil((now.getTime() - due) / 86400000));
    return { label: `Overdue by ${days}d`, className: "is-overdue" };
  }
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  if (due >= today && due < today + 86400000)
    return { label: "Due today", className: "is-today" };
  return { label: formatDate(item.dueAt), className: "is-neutral" };
}

function PatientAvatar({ patient }: { patient: ReferralPatientSummary }) {
  const initials = patient.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return (
    <span className="ref-avatar" aria-hidden="true">
      {initials || "?"}
    </span>
  );
}

function StatusBadge({ item }: { item: ReferralWorklistItem }) {
  const meta = statusMeta(item.status);
  return (
    <span className={`ref-status ${meta.className}`}>
      <Icon name={meta.icon} size={12} />
      {meta.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: ReferralPriority }) {
  const meta = priorityMeta(priority);
  return (
    <span className={`ref-priority ${meta.className}`}>
      <Icon name={meta.icon} size={12} />
      {meta.label}
    </span>
  );
}

function MetricCard({
  label,
  value,
  detail,
  tone,
  icon,
  active,
  onClick,
}: {
  label: string;
  value: number;
  detail: string;
  tone: string;
  icon: IconName;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`ref-metric ${tone}${active ? " is-active" : ""}`}
      onClick={onClick}
      aria-pressed={active}
    >
      <span className="ref-metric-icon">
        <Icon name={icon} size={18} />
      </span>
      <span className="ref-metric-copy">
        <small>{label}</small>
        <strong>{value}</strong>
        <em>{detail}</em>
      </span>
      <Icon name="arrow" size={14} />
    </button>
  );
}

function ReferralMenu({
  item,
  isOpen,
  onToggle,
  onOpen,
}: {
  item: ReferralWorklistItem;
  isOpen: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  return (
    <div className="ref-menu-wrap">
      <button
        type="button"
        className="ref-icon-button"
        aria-label={`More actions for ${item.referralReason}`}
        aria-expanded={isOpen}
        title="More referral actions"
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
      >
        <Icon name="more" size={17} />
      </button>
      {isOpen && (
        <div className="ref-menu" role="menu">
          <button type="button" role="menuitem" onClick={onOpen}>
            Open referral
          </button>
          <Link role="menuitem" href={item.patient.href}>
            Open patient
          </Link>
          {item.nextAction && (
            <button type="button" role="menuitem" onClick={onOpen}>
              {item.nextAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ReferralTable({
  items,
  now,
  menuId,
  onOpen,
  onMenu,
}: {
  items: ReferralWorklistItem[];
  now: Date;
  menuId: string | null;
  onOpen: (item: ReferralWorklistItem) => void;
  onMenu: (id: string | null) => void;
}) {
  return (
    <div className="ref-table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">Patient</th>
            <th scope="col">Referral</th>
            <th scope="col">Specialty / destination</th>
            <th scope="col">Priority</th>
            <th scope="col">Status</th>
            <th scope="col">Created</th>
            <th scope="col">Next action</th>
            <th scope="col">Due</th>
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const due = dueMeta(item, now);
            return (
              <tr key={item.referralId}>
                <td>
                  <Link
                    href={item.patient.href}
                    className="ref-patient-cell"
                    aria-label={`Open patient record for ${item.patient.name}`}
                  >
                    <PatientAvatar patient={item.patient} />
                    <span>
                      <strong>{item.patient.name}</strong>
                      <small>
                        MRN {item.patient.mrn} ·{" "}
                        {item.patient.age === null
                          ? "Age not recorded"
                          : `${item.patient.age} yrs`}
                      </small>
                    </span>
                  </Link>
                </td>
                <td>
                  <button
                    type="button"
                    className="ref-title-button"
                    onClick={() => onOpen(item)}
                  >
                    <strong>{item.referralReason}</strong>
                    <small>
                      {item.serviceCode ||
                        `Referral ID ${item.referralId.slice(0, 12)}`}
                    </small>
                  </button>
                </td>
                <td>
                  <span className="ref-route-cell">
                    <strong>{item.specialty}</strong>
                    <small>{item.destination}</small>
                  </span>
                </td>
                <td>
                  <PriorityBadge priority={item.priority} />
                </td>
                <td>
                  <StatusBadge item={item} />
                </td>
                <td>{formatDate(item.createdAt)}</td>
                <td>
                  <button
                    type="button"
                    className="ref-next-action"
                    onClick={() => onOpen(item)}
                  >
                    {item.nextAction?.label || "View outcome"}
                    <Icon name="arrow" size={13} />
                  </button>
                </td>
                <td>
                  <span className={`ref-due ${due.className}`}>
                    <Icon name="clock" size={13} />
                    {due.label}
                  </span>
                </td>
                <td>
                  <div className="ref-row-actions">
                    <button
                      type="button"
                      className="ref-open-button"
                      onClick={() => onOpen(item)}
                    >
                      Open
                    </button>
                    <ReferralMenu
                      item={item}
                      isOpen={menuId === item.referralId}
                      onToggle={() =>
                        onMenu(
                          menuId === item.referralId ? null : item.referralId,
                        )
                      }
                      onOpen={() => {
                        onMenu(null);
                        onOpen(item);
                      }}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ReferralCards({
  items,
  now,
  menuId,
  onOpen,
  onMenu,
}: {
  items: ReferralWorklistItem[];
  now: Date;
  menuId: string | null;
  onOpen: (item: ReferralWorklistItem) => void;
  onMenu: (id: string | null) => void;
}) {
  return (
    <div className="ref-card-grid">
      {items.map((item) => {
        const due = dueMeta(item, now);
        return (
          <article
            className={`referral-card ${item.priority === "urgent" ? "is-urgent" : ""}`}
            key={item.referralId}
          >
            <header>
              <Link
                href={item.patient.href}
                className="ref-patient-cell"
                aria-label={`Open patient record for ${item.patient.name}`}
              >
                <PatientAvatar patient={item.patient} />
                <span>
                  <strong>{item.patient.name}</strong>
                  <small>
                    MRN {item.patient.mrn} ·{" "}
                    {item.patient.age === null
                      ? "Age not recorded"
                      : `${item.patient.age} yrs`}
                  </small>
                </span>
              </Link>
              <ReferralMenu
                item={item}
                isOpen={menuId === item.referralId}
                onToggle={() =>
                  onMenu(menuId === item.referralId ? null : item.referralId)
                }
                onOpen={() => {
                  onMenu(null);
                  onOpen(item);
                }}
              />
            </header>
            <div className="ref-card-heading">
              <div>
                <span className="ref-card-label">Referral</span>
                <button type="button" onClick={() => onOpen(item)}>
                  {item.referralReason}
                </button>
              </div>
              <PriorityBadge priority={item.priority} />
            </div>
            <div className="ref-card-route">
              <span>
                <small>Specialty</small>
                <strong>{item.specialty}</strong>
              </span>
              <span>
                <small>Destination</small>
                <strong>{item.destination}</strong>
              </span>
            </div>
            <div className="ref-card-state">
              <StatusBadge item={item} />
              <span className={`ref-due ${due.className}`}>
                <Icon name="clock" size={13} />
                {due.label}
              </span>
            </div>
            <div className="ref-card-next">
              <small>Next action</small>
              <strong>
                {item.nextAction?.label || "Review referral outcome"}
              </strong>
            </div>
            <footer>
              <span>
                Updated {formatDate(item.updatedAt || item.createdAt)}
              </span>
              <button
                type="button"
                className="ref-open-button"
                onClick={() => onOpen(item)}
              >
                Open referral <Icon name="arrow" size={14} />
              </button>
            </footer>
          </article>
        );
      })}
    </div>
  );
}

function ReferralEmpty({
  filter,
  onClear,
}: {
  filter: ReferralFilter;
  onClear: () => void;
}) {
  const copy: Record<ReferralFilter, { title: string; message: string }> = {
    all: {
      title: "All referral workflows are clear",
      message: "No active referrals are available in your authorized scope.",
    },
    "needs-action": {
      title: "No referrals need action",
      message:
        "No authorized referral workflows currently require a clinical or operational action.",
    },
    urgent: {
      title: "No urgent referrals",
      message: "There are no urgent referrals in the current worklist.",
    },
    pending: {
      title: "No pending referrals",
      message: "There are no referrals waiting in the selected worklist.",
    },
    "awaiting-specialist": {
      title: "No referrals awaiting specialist response",
      message:
        "No authorized referral is currently waiting for a specialist response.",
    },
    scheduled: {
      title: "No scheduled referrals",
      message: "No referral-linked appointments are recorded in this worklist.",
    },
    overdue: {
      title: "No overdue referrals",
      message:
        "No authorized referral follow-up is past its recorded due date.",
    },
    completed: {
      title: "No completed referrals",
      message: "No completed referral workflows match this view.",
    },
  };
  const state = copy[filter];
  return (
    <div className="ref-empty">
      <span>
        <Icon name="check" size={22} />
      </span>
      <h3>{state.title}</h3>
      <p>{state.message}</p>
      {filter !== "all" && (
        <button
          type="button"
          className="ref-secondary-button"
          onClick={onClear}
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

function ReferralSkeleton() {
  return (
    <div className="ref-skeleton" aria-label="Loading referral worklist">
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

function ReferralDetail({
  item,
  busyAction,
  onClose,
  onTransition,
}: {
  item: ReferralWorklistItem;
  busyAction: string | null;
  onClose: () => void;
  onTransition: (
    action: ReferralTransitionAction,
    scheduledAt?: string,
  ) => void;
}) {
  const [tab, setTab] = useState<DetailTab>("overview");
  const [scheduledAt, setScheduledAt] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const transitions = availableReferralTransitions(item.status);
  const next = item.nextAction;
  const due = dueMeta(item, new Date());
  const lifecycle = referralLifecycleTimeline({
    businessState: item.status,
    events: item.events,
    createdAt: item.createdAt,
  });
  const requiresScheduledAt =
    item.status === "Scheduling" && next?.action === "schedule";
  return (
    <WorkspaceDrawer
      title="Referral Details"
      open
      onClose={onClose}
      width="520px"
    >
      <div className="ref-detail">
        <header className="ref-detail-hero">
          <div className="ref-detail-patient">
            <PatientAvatar patient={item.patient} />
            <div>
              <span className="ref-card-label">Patient</span>
              <h3>{item.patient.name}</h3>
              <p>
                MRN {item.patient.mrn} · DOB{" "}
                {formatDate(item.patient.birthDate)}
                {item.patient.age !== null ? ` · ${item.patient.age} yrs` : ""}
              </p>
            </div>
          </div>
          <div className="ref-detail-badges">
            <PriorityBadge priority={item.priority} />
            <StatusBadge item={item} />
          </div>
        </header>
        <div
          className="ref-detail-tabs"
          role="tablist"
          aria-label="Referral detail views"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "overview"}
            onClick={() => setTab("overview")}
          >
            Overview
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "activity"}
            onClick={() => setTab("activity")}
          >
            Activity
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "related"}
            onClick={() => setTab("related")}
          >
            Related data
          </button>
        </div>
        {tab === "overview" && (
          <>
            <section className="ref-next-action-panel">
              <span className="ref-card-label">Next action</span>
              <strong>
                {next?.label ||
                  "No further workflow action is currently available"}
              </strong>
              {requiresScheduledAt && (
                <label>
                  Scheduled appointment time
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(event) => setScheduledAt(event.target.value)}
                  />
                </label>
              )}
              {next && (
                <button
                  type="button"
                  className="ref-primary-button"
                  disabled={
                    busyAction !== null || (requiresScheduledAt && !scheduledAt)
                  }
                  onClick={() =>
                    onTransition(
                      next.action as ReferralTransitionAction,
                      scheduledAt || undefined,
                    )
                  }
                >
                  {busyAction === next.action ? "Saving..." : next.label}
                  <Icon name="arrow" size={14} />
                </button>
              )}
            </section>
            <section className="ref-detail-section">
              <h4>Referral overview</h4>
              <dl className="ref-detail-grid">
                <div>
                  <dt>Referral reason</dt>
                  <dd>{item.referralReason}</dd>
                </div>
                <div>
                  <dt>Specialty</dt>
                  <dd>{item.specialty}</dd>
                </div>
                <div>
                  <dt>Destination</dt>
                  <dd>{item.destination}</dd>
                </div>
                <div>
                  <dt>Referring provider</dt>
                  <dd>{item.requester}</dd>
                </div>
                <div>
                  <dt>Receiving provider</dt>
                  <dd>{item.performer || "Not specified"}</dd>
                </div>
                <div>
                  <dt>Created</dt>
                  <dd>{formatDate(item.createdAt, true)}</dd>
                </div>
                <div>
                  <dt>Due</dt>
                  <dd className={due.className}>{due.label}</dd>
                </div>
                <div>
                  <dt>Referral ID</dt>
                  <dd>{item.referralId}</dd>
                </div>
                {item.scheduledAt && (
                  <div>
                    <dt>Scheduled</dt>
                    <dd>{formatDate(item.scheduledAt, true)}</dd>
                  </div>
                )}
              </dl>
              {item.note && (
                <div className="ref-detail-note">
                  <strong>Notes</strong>
                  <p>{item.note}</p>
                </div>
              )}
            </section>
            <section className="ref-detail-section">
              <h4>Workflow</h4>
              <div className="ref-workflow-state">
                <span>
                  <Icon name={statusMeta(item.status).icon} size={15} />
                </span>
                <div>
                  <strong>{statusMeta(item.status).label}</strong>
                  <p>
                    Current referral workflow stage. Clinical request status is
                    tracked separately from appointment and specialist response
                    events.
                  </p>
                </div>
              </div>
            </section>
            <section className="ref-detail-section">
              <h4>Lifecycle timeline</h4>
              <ol className="ref-lifecycle" aria-label="Referral lifecycle">
                {lifecycle.map((stage) => (
                  <li
                    className={`ref-lifecycle-item is-${stage.status}`}
                    key={stage.id}
                  >
                    <span className="ref-lifecycle-marker">
                      <Icon
                        name={
                          stage.status === "current"
                            ? statusMeta(item.status).icon
                            : stage.status === "recorded"
                              ? "check"
                              : "clock"
                        }
                        size={13}
                      />
                    </span>
                    <div className="ref-lifecycle-copy">
                      <strong>{stage.label}</strong>
                      <p>
                        {stage.status === "current"
                          ? `Current: ${statusMeta(item.status).label}${stage.recordedAt ? ` · ${formatDate(stage.recordedAt, true)}` : ""}`
                          : stage.status === "recorded"
                            ? `Recorded ${formatDate(stage.recordedAt, true)}`
                            : "Not yet recorded"}
                      </p>
                    </div>
                    <span className="ref-lifecycle-state">
                      {stage.status === "current"
                        ? "Current"
                        : stage.status === "recorded"
                          ? "Recorded"
                          : "Pending"}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          </>
        )}
        {tab === "activity" && (
          <section className="ref-detail-section">
            <h4>Referral activity</h4>
            {item.events.length ? (
              <ol className="ref-activity-timeline">
                {item.events
                  .slice()
                  .sort(
                    (left, right) => dateValue(right.ts) - dateValue(left.ts),
                  )
                  .map((event) => (
                    <li key={event.id}>
                      <span>
                        <Icon name="activity" size={14} />
                      </span>
                      <div>
                        <strong>{humanize(event.type)}</strong>
                        <p>
                          {event.actor || "System"} ·{" "}
                          {formatDate(event.ts, true)}
                        </p>
                      </div>
                    </li>
                  ))}
              </ol>
            ) : (
              <p className="ref-muted-copy">
                No referral activity has been recorded.
              </p>
            )}
          </section>
        )}
        {tab === "related" && (
          <section className="ref-detail-section">
            <h4>Linked clinical records</h4>
            {item.linkedRecords.length ? (
              <div className="ref-linked-records">
                {item.linkedRecords.map((record) =>
                  record.href ? (
                    <Link
                      href={record.href}
                      key={`${record.type}-${record.id}`}
                    >
                      <Icon name="source" size={15} />
                      <span>
                        <strong>{record.display}</strong>
                        <small>
                          {record.type}/{record.id}
                        </small>
                      </span>
                      <Icon name="arrow" size={14} />
                    </Link>
                  ) : (
                    <div key={`${record.type}-${record.id}`}>
                      <Icon name="source" size={15} />
                      <span>
                        <strong>{record.display}</strong>
                        <small>
                          {record.type}/{record.id} · Route unavailable
                        </small>
                      </span>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <p className="ref-muted-copy">
                No linked clinical records are documented for this referral.
              </p>
            )}
          </section>
        )}
        <footer className="ref-detail-actions">
          <Link
            href={item.patient.href}
            className="ref-secondary-button"
          >
            <Icon name="patient" size={14} /> View patient
          </Link>
          {transitions.some((transition) => transition.action === "cancel") &&
            !confirmCancel && (
              <button
                type="button"
                className="ref-danger-button"
                onClick={() => setConfirmCancel(true)}
              >
                Cancel referral
              </button>
            )}
          {confirmCancel && (
            <div className="ref-cancel-confirm" role="alert">
              <span>
                Cancel {item.referralReason} for {item.patient.name}?
              </span>
              <button
                type="button"
                className="ref-secondary-button"
                onClick={() => setConfirmCancel(false)}
              >
                Keep referral
              </button>
              <button
                type="button"
                className="ref-danger-button"
                disabled={busyAction !== null}
                onClick={() => onTransition("cancel")}
              >
                Confirm cancel
              </button>
            </div>
          )}
        </footer>
      </div>
    </WorkspaceDrawer>
  );
}

function CreateReferralDrawer({
  patients,
  initialPatientId,
  onClose,
  onCreated,
}: {
  patients: ReferralPatientSummary[];
  initialPatientId?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<CreateForm>(() => ({
    patientId:
      initialPatientId &&
      patients.some((patient) => patient.id === initialPatientId)
        ? initialPatientId
        : "",
    subject: "",
    specialty: "",
    destination: "",
    priority: "routine",
    dueAt: "",
    note: "",
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keyRef = useRef<string | null>(null);
  const selectedPatient = patients.find(
    (patient) => patient.id === form.patientId,
  );
  function update(name: keyof CreateForm, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const idempotencyKey =
      keyRef.current ||
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `referral-${form.patientId}-${form.subject}`);
    keyRef.current = idempotencyKey;
    try {
      const response = await fetch("/api/referrals", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": idempotencyKey,
        },
        body: JSON.stringify(form),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok)
        throw new Error(payload.error || "The referral could not be created.");
      keyRef.current = null;
      onCreated();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The referral could not be created.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <WorkspaceDrawer title="New Referral" open onClose={onClose} width="520px">
      <form
        className="ref-create-form"
        onSubmit={(event) => void submit(event)}
      >
        {error && (
          <div className="ref-inline-error" role="alert">
            {error}
          </div>
        )}
        <p className="ref-form-intro">
          Create a patient-linked referral request. It begins in the submitted
          workflow state and remains within the authorized referral registry.
        </p>
        <fieldset>
          <legend>Patient</legend>
          <label>
            Patient <span aria-hidden="true">*</span>
            <select
              required
              value={form.patientId}
              onChange={(event) => update("patientId", event.target.value)}
            >
              <option value="">Select an authorized patient</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name} · MRN {patient.mrn}
                </option>
              ))}
            </select>
          </label>
          {selectedPatient && (
            <div className="ref-selected-patient">
              <PatientAvatar patient={selectedPatient} />
              <div>
                <strong>{selectedPatient.name}</strong>
                <span>
                  MRN {selectedPatient.mrn} · DOB{" "}
                  {formatDate(selectedPatient.birthDate)}
                  {selectedPatient.age !== null
                    ? ` · ${selectedPatient.age} yrs`
                    : ""}
                </span>
              </div>
            </div>
          )}
        </fieldset>
        <fieldset>
          <legend>Referral details</legend>
          <label>
            Referral reason <span aria-hidden="true">*</span>
            <input
              required
              value={form.subject}
              onChange={(event) => update("subject", event.target.value)}
              placeholder="Reason for specialist referral"
            />
          </label>
          <div className="ref-form-grid">
            <label>
              Specialty <span aria-hidden="true">*</span>
              <input
                required
                value={form.specialty}
                onChange={(event) => update("specialty", event.target.value)}
                placeholder="e.g. Cardiology"
              />
            </label>
            <label>
              Destination <span aria-hidden="true">*</span>
              <input
                required
                value={form.destination}
                onChange={(event) => update("destination", event.target.value)}
                placeholder="Receiving service or facility"
              />
            </label>
          </div>
        </fieldset>
        <fieldset>
          <legend>Priority and follow-up</legend>
          <div className="ref-form-grid">
            <label>
              Priority
              <select
                value={form.priority}
                onChange={(event) => update("priority", event.target.value)}
              >
                <option value="routine">Routine</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
            <label>
              Follow-up due date
              <input
                type="date"
                value={form.dueAt}
                onChange={(event) => update("dueAt", event.target.value)}
              />
            </label>
          </div>
          <label>
            Clinical notes
            <textarea
              rows={4}
              value={form.note}
              onChange={(event) => update("note", event.target.value)}
              placeholder="Optional referral context or instructions"
            />
          </label>
        </fieldset>
        <div className="ref-form-actions">
          <button
            type="button"
            className="ref-secondary-button"
            disabled={saving}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="ref-primary-button"
            disabled={saving}
          >
            {saving ? "Creating referral..." : "Create referral"}
            <Icon name="send" size={14} />
          </button>
        </div>
      </form>
    </WorkspaceDrawer>
  );
}

export default function ReferralCommandCenter({
  initialData,
  initialReferralId,
  initialCreateOpen = false,
  initialPatientId,
}: Props) {
  const [data, setData] = useState(initialData);
  const [filter, setFilter] = useState<ReferralFilter>("all");
  const [sort, setSort] = useState<ReferralSort>("most-urgent");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewMode>("list");
  const [selected, setSelected] = useState<ReferralWorklistItem | null>(() =>
    initialReferralId
      ? initialData.items.find(
          (item) => item.referralId === initialReferralId,
        ) || null
      : null,
  );
  const [createOpen, setCreateOpen] = useState(initialCreateOpen);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const deferredQuery = useDeferredValue(query);
  const [now, setNow] = useState(() => new Date());
  const patientScope =
    initialPatientId &&
    initialData.patients.some((patient) => patient.id === initialPatientId)
      ? initialPatientId
      : "";
  const scopedPatient = patientScope
    ? data.patients.find((patient) => patient.id === patientScope)
    : undefined;

  useEffect(() => {
    const stored = window.localStorage.getItem("roshi-referrals-view");
    if (stored !== "list" && stored !== "cards") return;
    const timer = window.setTimeout(() => setView(stored), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!menuId) return undefined;
    function closeOnOutside(event: MouseEvent) {
      if (
        event.target instanceof Element &&
        !event.target.closest(".ref-menu-wrap")
      )
        setMenuId(null);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuId(null);
    }
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuId]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(
      () => {
        const params = new URLSearchParams({
          filter,
          sort,
          page: "1",
          pageSize: "25",
        });
        if (deferredQuery.trim()) params.set("q", deferredQuery.trim());
        if (patientScope) params.set("patientId", patientScope);
        setLoading(true);
        fetch(`/api/referrals?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        })
          .then(async (response) => {
            const payload = (await response
              .json()
              .catch(() => ({}))) as ReferralWorkspaceSnapshot & {
              error?: string;
            };
            if (!response.ok)
              throw new Error(
                payload.error || "We could not load the referral worklist.",
              );
            return payload;
          })
          .then((next) => {
            setData(next);
            setError(null);
            setNow(new Date());
          })
          .catch((requestError: unknown) => {
            if ((requestError as { name?: string }).name !== "AbortError")
              setError(
                requestError instanceof Error
                  ? requestError.message
                  : "We could not load the referral worklist.",
              );
          })
          .finally(() => setLoading(false));
      },
      deferredQuery === query ? 0 : 220,
    );
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [deferredQuery, filter, patientScope, query, refreshKey, sort]);

  const suggestions = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search)
      return [] as Array<
        | { kind: "patient"; patient: ReferralPatientSummary }
        | { kind: "referral"; item: ReferralWorklistItem }
      >;
    const patients = data.patients
      .filter((patient) =>
        [patient.name, patient.mrn, patient.birthDate]
          .join(" ")
          .toLowerCase()
          .includes(search),
      )
      .slice(0, 3)
      .map((patient) => ({ kind: "patient" as const, patient }));
    const referrals = data.items
      .slice(0, 4)
      .map((item) => ({ kind: "referral" as const, item }));
    return [...patients, ...referrals];
  }, [data.items, data.patients, query]);

  function refresh() {
    setNotice(null);
    setRefreshKey((current) => current + 1);
  }

  function selectFilter(next: ReferralFilter) {
    setFilter(next);
    setNotice(null);
    setMenuId(null);
  }

  async function transition(
    item: ReferralWorklistItem,
    action: ReferralTransitionAction,
    scheduledAt?: string,
  ) {
    setBusyAction(action);
    setError(null);
    try {
      const response = await fetch(
        `/api/referrals/${encodeURIComponent(item.referralId)}/transition`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action,
            expectedUpdatedAt: item.updatedAt,
            scheduledAt,
          }),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok)
        throw new Error(payload.error || "The referral could not be updated.");
      setSelected(null);
      setNotice(`Referral updated: ${humanize(action)}.`);
      setRefreshKey((current) => current + 1);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The referral could not be updated.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  function handleCreated() {
    setCreateOpen(false);
    setFilter("all");
    setQuery("");
    setNotice("Referral created successfully.");
    setRefreshKey((current) => current + 1);
  }

  function setPreferredView(next: ViewMode) {
    setView(next);
    window.localStorage.setItem("roshi-referrals-view", next);
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!suggestions.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSuggestionIndex((current) =>
        Math.min(current + 1, suggestions.length - 1),
      );
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSuggestionIndex((current) => Math.max(current - 1, 0));
    }
    if (event.key === "Escape") {
      setSearchFocused(false);
      setSuggestionIndex(-1);
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const suggestion =
        suggestions[suggestionIndex >= 0 ? suggestionIndex : 0];
      if (!suggestion) return;
      if (suggestion.kind === "referral") setSelected(suggestion.item);
      else
        window.location.assign(suggestion.patient.href);
      setSearchFocused(false);
      setSuggestionIndex(-1);
    }
  }

  const metricCards: Array<{
    label: string;
    value: number;
    detail: string;
    tone: string;
    icon: IconName;
    filter: ReferralFilter;
  }> = [
    {
      label: "Open referrals",
      value: data.metrics.open,
      detail: "Across active referral workflows",
      tone: "is-teal",
      icon: "referral",
      filter: "all",
    },
    {
      label: "Needs action",
      value: data.metrics.needsAction,
      detail: data.metrics.needsAction
        ? "Review routing or clinical next steps"
        : "No referrals currently require action",
      tone: "is-amber",
      icon: "alert",
      filter: "needs-action",
    },
    {
      label: "Urgent",
      value: data.metrics.urgent,
      detail: data.metrics.urgent
        ? "Immediate attention required"
        : "No urgent referrals",
      tone: "is-critical",
      icon: "alert",
      filter: "urgent",
    },
    {
      label: "Awaiting specialist",
      value: data.metrics.awaitingSpecialist,
      detail: data.metrics.awaitingSpecialist
        ? "Response pending"
        : "No specialist response is pending",
      tone: "is-blue",
      icon: "waiting",
      filter: "awaiting-specialist",
    },
    {
      label: "Patients with referrals",
      value: data.metrics.patientsWithReferrals,
      detail: "Patients with active referrals",
      tone: "is-violet",
      icon: "users",
      filter: "all",
    },
    {
      label: "Overdue",
      value: data.metrics.overdue,
      detail: data.metrics.overdue
        ? "Follow-up required"
        : "No overdue referral follow-up",
      tone: "is-overdue",
      icon: "clock",
      filter: "overdue",
    },
  ];
  const filterCards: Array<{
    filter: ReferralFilter;
    label: string;
    count?: number;
  }> = [
    { filter: "all", label: "All", count: data.metrics.open },
    {
      filter: "needs-action",
      label: "Needs action",
      count: data.metrics.needsAction,
    },
    { filter: "urgent", label: "Urgent", count: data.metrics.urgent },
    { filter: "pending", label: "Pending" },
    {
      filter: "awaiting-specialist",
      label: "Awaiting specialist",
      count: data.metrics.awaitingSpecialist,
    },
    { filter: "scheduled", label: "Scheduled" },
    { filter: "overdue", label: "Overdue", count: data.metrics.overdue },
    { filter: "completed", label: "Completed" },
  ];
  const showSuggestions = searchFocused && query.trim().length > 0;

  return (
    <main className="referral-center" aria-labelledby="referral-title">
      <header className="referral-header">
        <div>
          <span className="referral-eyebrow">Referral management</span>
          <h1 id="referral-title">Referrals</h1>
          <p>
            Referral Command Center — manage clinical priorities, specialist
            routing, and outstanding actions.
          </p>
          <div className="referral-header-meta">
            <span
              className={`ref-live-state ${data.source.state === "ready" ? "is-ready" : "is-warning"}`}
            >
              <i />
              {data.source.state === "ready"
                ? "Synced"
                : "Data source unavailable"}
            </span>
            <span>Updated {formatDate(data.generatedAt, true)}</span>
            <span className="ref-scope">
              <Icon name="shield" size={13} /> Authorized clinical work
            </span>
            {scopedPatient && (
              <span className="ref-scope">
                <Icon name="patient" size={13} /> Patient: {scopedPatient.name}
              </span>
            )}
          </div>
        </div>
        <div className="referral-header-actions">
          <button
            type="button"
            className="ref-secondary-button"
            onClick={refresh}
            disabled={loading}
          >
            <Icon name="refresh" size={15} />
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button
            type="button"
            className="ref-primary-button"
            onClick={() => setCreateOpen(true)}
          >
            <Icon name="plus" size={16} />
            New Referral
          </button>
        </div>
      </header>
      {error && (
        <div className="ref-alert is-error" role="alert">
          <Icon name="alert" size={16} />
          <div>
            <strong>We were unable to load or update referrals.</strong>
            <span>{error}</span>
          </div>
          <button type="button" onClick={refresh}>
            Retry
          </button>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss referral error"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      )}
      {notice && (
        <div className="ref-alert is-success" role="status">
          <Icon name="check" size={16} />
          {notice}
        </div>
      )}
      <section
        className="referral-search-section"
        aria-label="Search referral worklist"
      >
        <label className="referral-search">
          <Icon name="search" size={18} />
          <span className="sr-only">
            Search referrals, patients, specialties, or providers
          </span>
          <input
            role="combobox"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSuggestionIndex(-1);
            }}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => window.setTimeout(() => setSearchFocused(false), 120)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search referrals, patients, specialties, or providers..."
            aria-autocomplete="list"
            aria-controls="referral-search-suggestions"
            aria-expanded={showSuggestions}
            aria-haspopup="listbox"
          />
          <kbd>Ctrl K</kbd>
        </label>
        {showSuggestions && (
          <div
            id="referral-search-suggestions"
            className="referral-suggestions"
            role="listbox"
            aria-label="Referral search suggestions"
          >
            {suggestions.length ? (
              <>
                {suggestions.some(
                  (suggestion) => suggestion.kind === "patient",
                ) && <span className="ref-suggestion-group">Patients</span>}
                {suggestions.map((suggestion, index) =>
                  suggestion.kind === "patient" ? (
                    <Link
                      role="option"
                      aria-selected={suggestionIndex === index}
                      href={suggestion.patient.href}
                      key={`patient-${suggestion.patient.id}`}
                    >
                      <PatientAvatar patient={suggestion.patient} />
                      <span>
                        <strong>{suggestion.patient.name}</strong>
                        <small>
                          MRN {suggestion.patient.mrn} · DOB{" "}
                          {formatDate(suggestion.patient.birthDate)}
                        </small>
                      </span>
                      <em>Patient</em>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      role="option"
                      aria-selected={suggestionIndex === index}
                      className={suggestionIndex === index ? "is-selected" : ""}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setSelected(suggestion.item);
                        setSearchFocused(false);
                      }}
                      key={`referral-${suggestion.item.referralId}`}
                    >
                      <span className="ref-suggestion-icon">
                        <Icon name="referral" size={15} />
                      </span>
                      <span>
                        <strong>{suggestion.item.referralReason}</strong>
                        <small>
                          {suggestion.item.patient.name} ·{" "}
                          {suggestion.item.specialty}
                        </small>
                      </span>
                      <em>Referral</em>
                    </button>
                  ),
                )}
              </>
            ) : (
              <div className="ref-search-empty">
                <strong>No matching referrals</strong>
                <span>
                  Try a patient, MRN, specialty, provider, or referral ID.
                </span>
              </div>
            )}
          </div>
        )}
      </section>
      <section
        className="referral-metrics"
        aria-label="Referral command center"
      >
        {metricCards.map((metric) => (
          <MetricCard
            key={metric.label}
            {...metric}
            active={
              filter === metric.filter &&
              !(metric.filter === "all" && filter !== "all")
            }
            onClick={() => selectFilter(metric.filter)}
          />
        ))}
      </section>
      <section
        className="referral-worklist"
        aria-labelledby="referral-worklist-title"
        aria-busy={loading}
      >
        <header className="referral-worklist-header">
          <div>
            <span className="referral-eyebrow">Referral worklist</span>
            <h2 id="referral-worklist-title">
              {scopedPatient
                ? `Referrals for ${scopedPatient.name}`
                : "Needs attention"}
            </h2>
            <p>
              Review referral status, priority, routing, scheduling, and
              outstanding actions.
            </p>
          </div>
          <span className="referral-result-count" aria-live="polite">
            {loading
              ? "Updating worklist..."
              : `${data.total} referral${data.total === 1 ? "" : "s"} shown`}
          </span>
        </header>
        <div className="referral-toolbar">
          <div
            className="referral-filter-chips"
            aria-label="Referral status filters"
          >
            {filterCards.map((option) => (
              <button
                type="button"
                key={option.filter}
                className={`${filter === option.filter ? "is-active" : ""}${option.filter === "urgent" ? " is-urgent" : ""}${option.filter === "overdue" ? " is-overdue" : ""}`}
                aria-pressed={filter === option.filter}
                onClick={() => selectFilter(option.filter)}
              >
                {option.label}
                {option.count ? <span>{option.count}</span> : null}
              </button>
            ))}
          </div>
          <div className="referral-toolbar-controls">
            <label>
              <Icon name="filter" size={14} />
              <span>Sort</span>
              <select
                value={sort}
                onChange={(event) =>
                  setSort(event.target.value as ReferralSort)
                }
                aria-label="Sort referral worklist"
              >
                <option value="most-urgent">Most urgent</option>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="recently-updated">Recently updated</option>
                <option value="patient">Patient name A-Z</option>
                <option value="due">Due date</option>
              </select>
            </label>
            <div
              className="ref-view-switcher"
              role="group"
              aria-label="Referral worklist view"
            >
              <button
                type="button"
                aria-pressed={view === "list"}
                title="List view"
                onClick={() => setPreferredView("list")}
              >
                <Icon name="list" size={16} />
                <span>List</span>
              </button>
              <button
                type="button"
                aria-pressed={view === "cards"}
                title="Cards view"
                onClick={() => setPreferredView("cards")}
              >
                <Icon name="grid" size={16} />
                <span>Cards</span>
              </button>
            </div>
          </div>
        </div>
        {loading && !data.items.length ? (
          <ReferralSkeleton />
        ) : !data.items.length ? (
          <ReferralEmpty
            filter={filter}
            onClear={() => {
              setFilter("all");
              setQuery("");
            }}
          />
        ) : view === "list" ? (
          <>
            <ReferralTable
              items={data.items}
              now={now}
              menuId={menuId}
              onOpen={setSelected}
              onMenu={setMenuId}
            />
            <div className="ref-mobile-card-fallback">
              <ReferralCards
                items={data.items}
                now={now}
                menuId={menuId}
                onOpen={setSelected}
                onMenu={setMenuId}
              />
            </div>
          </>
        ) : (
          <ReferralCards
            items={data.items}
            now={now}
            menuId={menuId}
            onOpen={setSelected}
            onMenu={setMenuId}
          />
        )}
      </section>
      {selected && (
        <ReferralDetail
          key={selected.referralId}
          item={selected}
          busyAction={busyAction}
          onClose={() => setSelected(null)}
          onTransition={(action, scheduledAt) =>
            void transition(selected, action, scheduledAt)
          }
        />
      )}
      {createOpen && (
        <CreateReferralDrawer
          patients={data.patients}
          initialPatientId={patientScope || undefined}
          onClose={() => setCreateOpen(false)}
          onCreated={handleCreated}
        />
      )}
    </main>
  );
}
