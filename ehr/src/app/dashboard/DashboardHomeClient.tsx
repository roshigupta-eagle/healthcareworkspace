'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, type ReactNode } from 'react';
import type { DashboardAttentionItem, DashboardCommunicationItem, DashboardOrderItem, DashboardScheduleItem, DashboardSummary } from '@/lib/dashboardSummary';
import './dashboard-home.css';

type Props = { initialData: DashboardSummary; preview: string };
type IconName = 'users' | 'alert' | 'result' | 'tasks' | 'message' | 'orders' | 'calendar' | 'arrow' | 'refresh' | 'plus' | 'search' | 'encounter' | 'document' | 'activity' | 'check' | 'zoomIn' | 'zoomOut';
type AttentionFilter = 'all' | 'urgent' | 'routine';

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    users: <><path d="M16 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1" /><circle cx="9.5" cy="7" r="3" /><path d="M17 11a3 3 0 100-6M21 20v-1a4 4 0 00-3-3.8" /></>,
    alert: <><path d="M12 3l9 16H3L12 3z" /><path d="M12 9v4M12 16h.01" /></>,
    result: <><path d="M6 3h12v18H6z" /><path d="M9 7h6M9 11h6M9 15h3" /><circle cx="17" cy="17" r="3" /></>,
    tasks: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 9h8M8 13h5M8 17h8" /><path d="M17 3v3" /></>,
    message: <><path d="M4 5h16v11H8l-4 4z" /><path d="M8 9h8M8 13h5" /></>,
    orders: <><path d="M6 3h12v18H6z" /><path d="M9 7h6M9 11h6M9 15h4" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18M8 14h3M8 17h6" /></>,
    arrow: <><path d="M5 12h13M13 6l6 6-6 6" /></>,
    refresh: <><path d="M20 11a8 8 0 00-14-5L3 9M3 4v5h5M4 13a8 8 0 0014 5l3-3M21 20v-5h-5" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    encounter: <><circle cx="12" cy="12" r="9" /><path d="M8 12h8M12 8v8" /></>,
    document: <><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h5" /></>,
    activity: <><path d="M3 12h4l2-7 4 14 2-7h6" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
    zoomIn: <><circle cx="10.8" cy="10.8" r="6.3" /><path d="M16 16l5 5M10.8 8v5.6M8 10.8h5.6" /></>,
    zoomOut: <><circle cx="10.8" cy="10.8" r="6.3" /><path d="M16 16l5 5M8 10.8h5.6" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function withPreview(href: string, preview: string) {
  return preview ? `${href}${href.includes('?') ? '&' : '?'}${preview}` : href;
}

function formatTime(value: string | undefined, timeZone: string) {
  if (!value) return 'Time not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time not recorded';
  return new Intl.DateTimeFormat('en-CA', { hour: 'numeric', minute: '2-digit', timeZone }).format(date);
}

function formatDate(value: string | undefined, timeZone: string) {
  if (!value) return 'Date not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date not recorded';
  return new Intl.DateTimeFormat('en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone }).format(date);
}

function formatUpdated(value: string, timeZone: string) {
  return `Updated ${formatTime(value, timeZone)}`;
}

function ageLabel(value: string | undefined, reference?: string) {
  if (!value) return 'Time not recorded';
  const timestamp = Date.parse(value);
  const referenceTime = reference ? Date.parse(reference) : Date.now();
  if (!Number.isFinite(timestamp) || !Number.isFinite(referenceTime)) return 'Time not recorded';
  const minutesUntil = Math.round((timestamp - referenceTime) / 60000);
  if (minutesUntil > 0) {
    if (minutesUntil < 60) return `Due in ${minutesUntil} min`;
    const hoursUntil = Math.floor(minutesUntil / 60);
    if (hoursUntil < 24) return `Due in ${hoursUntil}h`;
    return `Due in ${Math.floor(hoursUntil / 24)}d`;
  }
  const minutes = Math.max(0, Math.round((referenceTime - timestamp) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min waiting`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h waiting`;
  return `${Math.floor(hours / 24)}d waiting`;
}

function priorityMeta(priority: DashboardAttentionItem['priority']) {
  if (priority === 'critical') return { label: 'Urgent', className: 'is-critical' };
  if (priority === 'high') return { label: 'High', className: 'is-high' };
  if (priority === 'low') return { label: 'Low', className: 'is-low' };
  return { label: 'Routine', className: 'is-normal' };
}

function statusMeta(status: string) {
  const normalized = status.toLowerCase().replace(/[\s_]+/g, '-');
  if (['arrived', 'checked-in'].includes(normalized)) return 'is-arrived';
  if (['fulfilled', 'completed', 'final', 'reviewed'].includes(normalized)) return 'is-complete';
  if (['cancelled', 'canceled', 'noshow', 'entered-in-error'].includes(normalized)) return 'is-muted';
  if (['urgent', 'critical'].includes(normalized)) return 'is-critical';
  return 'is-pending';
}

function PatientLine({ patient }: { patient?: { name: string; mrn?: string; href: string } }) {
  if (!patient) return <span className="dashboard-patient-line"><strong>Patient information unavailable</strong><small>Identity context not recorded</small></span>;
  return <span className="dashboard-patient-line"><strong>{patient.name}</strong><small>{patient.mrn ? `MRN ${patient.mrn}` : 'MRN not recorded'}</small></span>;
}

function SourceState({ source, children }: { source: { state: 'ready' | 'partial' | 'unavailable'; label: string; error?: string }; children: ReactNode }) {
  if (source.state === 'ready') return <>{children}</>;
  return <div className="dashboard-source-state" role="status"><span className="dashboard-source-state-icon"><Icon name="activity" size={16} /></span><div><strong>{source.state === 'partial' ? 'Some data is unavailable' : `${source.label} unavailable`}</strong><span>{source.error || 'This section will be available when its source responds.'}</span></div></div>;
}

function EmptyState({ icon, title, message }: { icon: IconName; title: string; message: string }) {
  return <div className="dashboard-empty-state"><span><Icon name={icon} size={17} /></span><strong>{title}</strong><p>{message}</p></div>;
}

function Panel({ id, eyebrow, title, subtitle, action, tools, children }: { id: string; eyebrow?: string; title: string; subtitle?: string; action?: { label: string; href: string }; tools?: ReactNode; children: ReactNode }) {
  return <section className="dashboard-panel" data-testid={id} aria-labelledby={`${id}-title`}><header className="dashboard-panel-header"><div>{eyebrow && <span className="dashboard-panel-eyebrow">{eyebrow}</span>}<h2 id={`${id}-title`}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><div className="dashboard-panel-header-actions">{tools}{action && <Link href={action.href} className="dashboard-panel-action">{action.label}<Icon name="arrow" size={14} /></Link>}</div></header>{children}</section>;
}

function Metric({ id, href, label, value, detail, icon, tone }: { id: string; href: string; label: string; value: number; detail: string; icon: IconName; tone: string }) {
  return <Link href={href} className={`dashboard-metric ${tone}`} data-testid={`dashboard-metric-${id}`}><span className="dashboard-metric-icon"><Icon name={icon} size={18} /></span><span className="dashboard-metric-copy"><small>{label}</small><strong className="dashboard-metric-value">{value}</strong><em>{detail}</em></span><span className="dashboard-metric-spark" aria-hidden="true"><i /><i /><i /><i /><i /></span><span className="dashboard-metric-arrow"><Icon name="arrow" size={14} /></span></Link>;
}

function AttentionRow({ item, preview, reference }: { item: DashboardAttentionItem; preview: string; reference: string }) {
  const meta = priorityMeta(item.priority);
  return <Link href={withPreview(item.href, preview)} className="dashboard-attention-row"><span className={`dashboard-priority-rail ${meta.className}`} /><span className="dashboard-attention-main"><span className="dashboard-item-type">{item.type}</span><PatientLine patient={item.patient} /><strong>{item.title}</strong><span className="dashboard-item-summary">{item.summary}</span></span><span className="dashboard-attention-meta"><span className={`dashboard-priority-chip ${meta.className}`}>{meta.label}</span><small>{item.at ? ageLabel(item.at, reference) : 'Time not recorded'}</small>{item.owner && <small>Owner · {item.owner}</small>}<b>{item.actionLabel}<Icon name="arrow" size={13} /></b></span></Link>;
}

function ScheduleRow({ item, preview, timeZone }: { item: DashboardScheduleItem; preview: string; timeZone: string }) {
  return <Link href={withPreview(item.href, preview)} className="dashboard-schedule-row"><span className="dashboard-schedule-time">{formatTime(item.start, timeZone)}</span><span className="dashboard-schedule-marker" /><span className="dashboard-schedule-main"><PatientLine patient={item.patient} /><span>{item.type}</span></span><span className={`dashboard-status-chip ${statusMeta(item.status)}`}>{item.status}</span><span className="dashboard-schedule-location">{item.location || 'Location not recorded'}</span><Icon name="arrow" size={14} /></Link>;
}

function WorkRow({ item, preview, reference }: { item: DashboardAttentionItem; preview: string; reference: string }) {
  const meta = priorityMeta(item.priority);
  return <Link href={withPreview(item.href, preview)} className="dashboard-work-row"><span className="dashboard-work-icon"><Icon name={item.source === 'note' ? 'document' : 'tasks'} size={16} /></span><span className="dashboard-work-main"><strong>{item.title}</strong><PatientLine patient={item.patient} /></span><span className="dashboard-work-due">{item.dueAt ? ageLabel(item.dueAt, reference) : 'No due date'}</span><span className={`dashboard-priority-chip ${meta.className}`}>{meta.label}</span><Icon name="arrow" size={14} /></Link>;
}

function ResultRow({ item, preview }: { item: DashboardAttentionItem; preview: string }) {
  const meta = priorityMeta(item.priority);
  return <Link href={withPreview(item.href, preview)} className="dashboard-result-row"><span className="dashboard-result-icon"><Icon name="result" size={16} /></span><span className="dashboard-result-main"><PatientLine patient={item.patient} /><strong>{item.title.replace(/^Review /, '')}</strong><small>{item.summary}</small></span><span className={`dashboard-priority-chip ${meta.className}`}>{meta.label}</span><span className="dashboard-result-review">Review <Icon name="arrow" size={13} /></span></Link>;
}

function CommunicationRow({ item, preview, reference }: { item: DashboardCommunicationItem; preview: string; reference: string }) {
  const meta = priorityMeta(item.priority);
  return <Link href={withPreview(item.href, preview)} className="dashboard-communication-row"><span className="dashboard-communication-icon"><Icon name="message" size={16} /></span><span className="dashboard-communication-main"><PatientLine patient={item.patient} /><strong>{item.topic}</strong><small>{item.participant}{item.organization ? ` · ${item.organization}` : ''}</small><span>{item.preview}</span></span><span className="dashboard-communication-meta">{item.actionRequired && <b>Action required</b>}{item.deliveryIssue && <b className="is-error">Delivery issue</b>}<small>{ageLabel(item.lastActivityAt, reference)}</small><span className={`dashboard-priority-chip ${meta.className}`}>{meta.label}</span></span></Link>;
}

function OrderRow({ item, preview }: { item: DashboardOrderItem; preview: string }) {
  return <Link href={withPreview(item.href, preview)} className="dashboard-order-row"><span className="dashboard-order-icon"><Icon name={item.category === 'Laboratory' ? 'result' : item.category === 'Imaging' ? 'activity' : 'orders'} size={16} /></span><span className="dashboard-order-main"><PatientLine patient={item.patient} /><strong>{item.orderName}</strong><small>{item.category} · {item.destination}</small></span><span className="dashboard-order-state"><span className={`dashboard-status-chip ${statusMeta(item.status)}`}>{item.status}</span><small>Next · {item.nextStep}</small></span><span className="dashboard-order-result">{item.result}</span><Icon name="arrow" size={14} /></Link>;
}

function DocumentationRow({ item, preview }: { item: DashboardAttentionItem; preview: string }) {
  return <Link href={withPreview(item.href, preview)} className="dashboard-documentation-row"><span className="dashboard-work-icon"><Icon name={item.source === 'note' ? 'document' : 'activity'} size={16} /></span><span className="dashboard-work-main"><strong>{item.title}</strong><PatientLine patient={item.patient} /></span><span className={`dashboard-status-chip ${item.source === 'note' ? 'is-pending' : 'is-critical'}`}>{item.actionLabel}</span><Icon name="arrow" size={14} /></Link>;
}

export default function DashboardHomeClient({ initialData, preview }: Props) {
  const [data, setData] = useState(initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [attentionFilter, setAttentionFilter] = useState<AttentionFilter>('all');
  const [attentionQuery, setAttentionQuery] = useState('');
  const [skeletonZoom, setSkeletonZoom] = useState(1);
  const reference = data.generatedAt;
  const roleName = data.roleLabel === 'Clinical' ? 'Clinical workspace' : `${data.roleLabel} workspace`;
  const statusAttention = data.systemStatus.state !== 'healthy';

  async function refresh() {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const response = await fetch(withPreview('/api/dashboard/summary', preview), { cache: 'no-store' });
      if (!response.ok) throw new Error('Dashboard data could not be refreshed.');
      setData(await response.json() as DashboardSummary);
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : 'Dashboard data could not be refreshed.');
    } finally {
      setRefreshing(false);
    }
  }

  const metrics: Array<{ id: string; href: string; label: string; value: number; detail: string; icon: IconName; tone: string }> = [];
  if (data.capabilities.schedule) metrics.push({ id: 'patients', href: withPreview('/dashboard/appointments', preview), label: 'Patients Today', value: data.metrics.patientsToday, detail: `${data.metrics.checkedIn} checked in · ${data.metrics.waitingNow} waiting`, icon: 'users', tone: 'is-blue' });
  if (data.capabilities.work) metrics.push({ id: 'attention', href: withPreview('/dashboard/tasks?tab=urgent', preview), label: 'Needs Attention', value: data.metrics.needsAttention, detail: 'Clinical work requiring action', icon: 'alert', tone: 'is-coral' });
  if (data.capabilities.results) metrics.push({ id: 'results', href: withPreview('/dashboard/tasks?tab=result-review', preview), label: 'Unreviewed Results', value: data.metrics.unreviewedResults, detail: `${data.metrics.urgentResults} urgent result${data.metrics.urgentResults === 1 ? '' : 's'}`, icon: 'result', tone: 'is-amber' });
  if (data.capabilities.work) metrics.push({ id: 'tasks', href: withPreview('/dashboard/tasks?tab=task', preview), label: 'Tasks Due', value: data.metrics.tasksDueToday, detail: `${data.metrics.overdueTasks} overdue`, icon: 'tasks', tone: 'is-teal' });
  if (data.capabilities.communications) metrics.push({ id: 'communications', href: withPreview('/communication?folder=needsAction', preview), label: 'Unread Communications', value: data.metrics.unreadCommunications, detail: `${data.metrics.communicationNeedsResponse} need response`, icon: 'message', tone: 'is-cyan' });
  if (data.capabilities.orders) metrics.push({ id: 'orders', href: withPreview('/dashboard/orders', preview), label: 'Active Orders', value: data.metrics.activeOrders, detail: `${data.metrics.ordersNeedsAction} need action`, icon: 'orders', tone: 'is-violet' });

  const hasAttentionSource = data.capabilities.work || data.capabilities.communications || data.capabilities.orders;
  const focusPatient = data.schedule.next?.patient || data.attention.items.find((item) => item.patient)?.patient;
  const filteredAttentionItems = data.attention.items.filter((item) => {
    const matchesFilter = attentionFilter === 'all' || (attentionFilter === 'urgent' ? ['critical', 'high'].includes(item.priority) : ['normal', 'low'].includes(item.priority));
    const searchText = `${item.title} ${item.summary} ${item.patient?.name || ''} ${item.type}`.toLowerCase();
    return matchesFilter && (!attentionQuery.trim() || searchText.includes(attentionQuery.trim().toLowerCase()));
  });

  return <main className="dashboard-home" data-testid="dashboard-page" aria-labelledby="dashboard-title"><div className="dashboard-home-inner">
    <header className="dashboard-home-header"><div className="dashboard-home-heading"><span className="dashboard-eyebrow">Clinical Workspace</span><h1 id="dashboard-title">Dashboard</h1><p>Good {data.greeting}, {data.actor.name}</p><span className="dashboard-context">{formatDate(data.generatedAt, data.timeZone)} · {roleName} · Focused on {data.roleFocus}</span></div><div className="dashboard-home-actions"><button type="button" className="dashboard-secondary-button" data-testid="dashboard-refresh" onClick={() => void refresh()} disabled={refreshing}><Icon name="refresh" size={15} />{refreshing ? 'Refreshing...' : 'Refresh'}</button><div className="dashboard-quick-wrap"><button type="button" className="dashboard-secondary-button" data-testid="dashboard-new-action" aria-expanded={quickOpen} onClick={() => setQuickOpen((value) => !value)}><Icon name="plus" size={15} />Quick Actions</button>{quickOpen && <div className="dashboard-quick-menu" role="menu"><Link role="menuitem" href={withPreview('/dashboard/patients', preview)} onClick={() => setQuickOpen(false)}><Icon name="search" size={15} />Find Patient</Link>{data.capabilities.schedule && <Link role="menuitem" href={withPreview('/dashboard/encounters/new', preview)} onClick={() => setQuickOpen(false)}><Icon name="encounter" size={15} />Start Encounter</Link>}{data.capabilities.orders && <Link role="menuitem" href={withPreview('/dashboard/orders?new=1', preview)} onClick={() => setQuickOpen(false)}><Icon name="orders" size={15} />New Order</Link>}{data.capabilities.work && <Link role="menuitem" href={withPreview('/dashboard/tasks?new=1', preview)} onClick={() => setQuickOpen(false)}><Icon name="tasks" size={15} />New Task</Link>}{data.capabilities.communications && <Link role="menuitem" href={withPreview('/communication?new=1', preview)} onClick={() => setQuickOpen(false)}><Icon name="message" size={15} />New Communication</Link>}{data.capabilities.schedule && <Link role="menuitem" href={withPreview('/dashboard/appointments?booking=1', preview)} onClick={() => setQuickOpen(false)}><Icon name="calendar" size={15} />Book Appointment</Link>}</div>}</div></div></header>
    <div className={`dashboard-status-strip ${statusAttention ? 'is-attention' : ''}`} data-testid="dashboard-system-status"><span className="dashboard-status-dot" /><strong>{data.systemStatus.label}</strong><span>{data.systemStatus.detail}</span><span className="dashboard-status-updated">{formatUpdated(data.generatedAt, data.timeZone)}</span>{statusAttention && <Link href={withPreview(data.metrics.communicationDeliveryIssues > 0 ? '/communication?folder=deliveryIssues' : '/dashboard/orders?status=delivery-issues', preview)}>View affected work <Icon name="arrow" size={13} /></Link>}</div>
    {refreshError && <div className="dashboard-refresh-error" role="alert"><span>{refreshError}</span><button type="button" onClick={() => void refresh()}>Try Again</button></div>}
    <section className="dashboard-intelligence" aria-label="Clinical intelligence"><span className="dashboard-intelligence-signal"><Icon name="activity" size={16} /></span><div><span className="dashboard-panel-eyebrow">Clinical intelligence</span><strong>{data.metrics.needsAttention ? `${data.metrics.needsAttention} items need your attention` : 'Your clinical work is clear'}</strong><p>{data.metrics.urgentResults ? `${data.metrics.urgentResults} urgent result${data.metrics.urgentResults === 1 ? '' : 's'} are waiting for review.` : 'No urgent abnormalities detected in the current review window.'}</p></div><div className="dashboard-intelligence-facts"><span><b>{data.metrics.overdueTasks}</b> overdue</span><span><b>{data.metrics.communicationNeedsResponse}</b> need response</span><span><b>{data.metrics.waitingNow}</b> waiting now</span></div></section>
    <section className="dashboard-metrics" aria-label="Priority snapshot">{metrics.map((metric) => <Metric key={metric.id} {...metric} />)}</section>
    <section className="dashboard-overview-band" aria-label="Clinical overview">
      <section className="dashboard-overview-card dashboard-patient-overview" aria-labelledby="dashboard-patient-overview-title">
        <header className="dashboard-overview-card-header"><div><span className="dashboard-panel-eyebrow">Patient overview</span><h2 id="dashboard-patient-overview-title">{focusPatient?.name || 'Clinical workspace'}</h2></div><span className="dashboard-overview-state"><i />Active</span></header>
        {focusPatient ? <><div className="dashboard-patient-summary"><span className="dashboard-patient-avatar">{focusPatient.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><div><strong>{focusPatient.name}</strong><span>{focusPatient.mrn ? `MRN ${focusPatient.mrn}` : 'Patient identity available'}</span><span>{data.schedule.next ? `${data.schedule.next.type} · ${formatTime(data.schedule.next.start, data.timeZone)}` : 'Priority work in your queue'}</span></div></div><Link className="dashboard-overview-link" href={withPreview(focusPatient.href, preview)}>View full profile <Icon name="arrow" size={13} /></Link></> : <EmptyState icon="users" title="No patient context selected" message="Open a patient record from today's work to see the clinical snapshot." />}
        <div className="dashboard-overview-stat-grid"><span><b>{data.metrics.needsAttention}</b><small>Priority items</small></span><span><b>{data.metrics.unreviewedResults}</b><small>Results to review</small></span><span><b>{data.metrics.activeOrders}</b><small>Active orders</small></span></div>
      </section>
      <section className="dashboard-overview-card dashboard-health-trends" aria-labelledby="dashboard-health-trends-title">
        <header className="dashboard-overview-card-header"><div><span className="dashboard-panel-eyebrow">Clinical activity</span><h2 id="dashboard-health-trends-title">Health Trends</h2></div><div className="dashboard-trend-tabs" aria-label="Trend range"><span className="is-active">7D</span><span>30D</span><span>6M</span></div></header>
        <div className="dashboard-trend-stat-grid"><span><i className="is-coral" /><small>Priority work</small><b>{data.metrics.needsAttention}</b><em>active</em></span><span><i className="is-blue" /><small>Patient flow</small><b>{data.metrics.patientsToday}</b><em>today</em></span><span><i className="is-violet" /><small>Orders</small><b>{data.metrics.activeOrders}</b><em>open</em></span></div>
        <div className="dashboard-trend-chart" aria-label="Clinical activity trend visualization"><span className="dashboard-chart-grid" /><svg viewBox="0 0 640 150" role="img" aria-label="Clinical activity trend"><path className="dashboard-chart-line is-coral" d="M0 112 C55 100 72 118 118 92 S192 109 238 79 S310 102 356 61 S432 79 474 48 S553 68 640 30" /><path className="dashboard-chart-line is-blue" d="M0 80 C52 58 88 72 126 90 S196 80 236 98 S310 60 352 84 S424 57 470 76 S544 38 640 60" /><path className="dashboard-chart-line is-teal" d="M0 126 C62 118 92 126 138 108 S214 122 260 100 S332 120 372 91 S450 110 494 82 S568 100 640 72" /></svg></div>
      </section>
      <section className="dashboard-overview-card dashboard-overview-next" aria-labelledby="dashboard-overview-next-title">
        <header className="dashboard-overview-card-header"><div><span className="dashboard-panel-eyebrow">Next on your day</span><h2 id="dashboard-overview-next-title">Next Appointment</h2></div><Icon name="calendar" size={17} /></header>
        {data.schedule.next ? <Link href={withPreview(data.schedule.next.href, preview)} className="dashboard-overview-appointment"><span className="dashboard-overview-date">{formatTime(data.schedule.next.start, data.timeZone)}</span><strong>{data.schedule.next.type}</strong><PatientLine patient={data.schedule.next.patient} /><span>{data.schedule.next.location || 'Location not recorded'}</span><b>Open appointment <Icon name="arrow" size={13} /></b></Link> : <EmptyState icon="calendar" title="No next appointment" message="There is no upcoming appointment in today's schedule." />}
      </section>
    </section>
    <div className="dashboard-grid"><div className="dashboard-main-column">
      {hasAttentionSource && <Panel id="dashboard-needs-attention" eyebrow="Priority queue" title="Needs Attention" subtitle="Clinical and operational items requiring your action." tools={<div className="dashboard-queue-tools"><label className="dashboard-queue-search"><Icon name="search" size={13} /><input aria-label="Search priority queue" value={attentionQuery} onChange={(event) => setAttentionQuery(event.target.value)} placeholder="Filter queue" /><kbd>/</kbd></label><select aria-label="Filter priority" value={attentionFilter} onChange={(event) => setAttentionFilter(event.target.value as AttentionFilter)}><option value="all">All priority</option><option value="urgent">Urgent first</option><option value="routine">Routine</option></select></div>} action={{ label: 'View all work', href: withPreview('/dashboard/tasks', preview) }}>{filteredAttentionItems.length ? <div className="dashboard-attention-list">{filteredAttentionItems.map((item) => <AttentionRow key={item.id} item={item} preview={preview} reference={reference} />)}</div> : <EmptyState icon="check" title={attentionQuery ? 'No matching work' : 'You&apos;re caught up'} message={attentionQuery ? 'Try a patient, task type, or clinical keyword.' : 'No urgent clinical work requires your attention.'} />}</Panel>}
      {data.capabilities.schedule && <Panel id="dashboard-schedule" eyebrow="Operating day" title="Today&apos;s Schedule" subtitle={`${data.metrics.patientsToday} patient${data.metrics.patientsToday === 1 ? '' : 's'} scheduled · ${data.metrics.waitingNow} waiting now`} action={{ label: 'View full schedule', href: withPreview('/schedule/today', preview) }}><SourceState source={data.sources.schedule}>{data.schedule.items.length ? <div className="dashboard-schedule-list">{data.schedule.items.map((item) => <ScheduleRow key={item.id} item={item} preview={preview} timeZone={data.timeZone} />)}</div> : <EmptyState icon="calendar" title="No appointments scheduled today" message="The scheduling source has no active appointments for this operating day." />}</SourceState></Panel>}
      <div className="dashboard-two-column">{data.capabilities.work && <Panel id="dashboard-tasks" eyebrow="My queue" title="My Clinical Work" action={{ label: 'View all tasks', href: withPreview('/dashboard/tasks', preview) }}><SourceState source={data.sources.work}>{data.work.items.length ? <div className="dashboard-work-list">{data.work.items.map((item) => <WorkRow key={item.id} item={item} preview={preview} reference={reference} />)}</div> : <EmptyState icon="check" title="No active tasks" message="There is no open clinical work in your queue." />}</SourceState></Panel>}{data.capabilities.results && <Panel id="dashboard-results" eyebrow="Result review" title="Results to Review" action={{ label: 'View results', href: withPreview('/dashboard/tasks?tab=result-review', preview) }}><SourceState source={data.sources.work}>{data.results.items.length ? <div className="dashboard-result-list">{data.results.items.map((item) => <ResultRow key={item.id} item={item} preview={preview} />)}</div> : <EmptyState icon="check" title="No results waiting for review" message="Final and abnormal results are not currently awaiting review." />}</SourceState></Panel>}</div>
      {data.capabilities.orders && <Panel id="dashboard-orders" eyebrow="Diagnostic operations" title="Orders" subtitle={`${data.metrics.activeOrders} active · ${data.metrics.ordersNeedsAction} need action · ${data.metrics.orderDeliveryIssues} delivery issue${data.metrics.orderDeliveryIssues === 1 ? '' : 's'}`} action={{ label: 'View all orders', href: withPreview('/dashboard/orders', preview) }}><SourceState source={data.sources.orders}>{data.orders.items.length ? <div className="dashboard-order-list">{data.orders.items.map((item) => <OrderRow key={item.id} item={item} preview={preview} />)}</div> : <EmptyState icon="orders" title="No active orders" message="No orders match the current operational view." />}</SourceState></Panel>}
      {data.capabilities.documentation && <Panel id="dashboard-documentation" eyebrow="Documentation" title="Documentation Work" action={{ label: 'Open documents', href: withPreview('/dashboard/documents', preview) }}><SourceState source={data.sources.work}>{data.documentation.items.length ? <div className="dashboard-documentation-list">{data.documentation.items.map((item) => <DocumentationRow key={item.id} item={item} preview={preview} />)}</div> : <EmptyState icon="document" title="Documentation is current" message="No notes or documents are waiting for your review." />}</SourceState></Panel>}
    </div><aside className="dashboard-rail">
      {data.capabilities.schedule && <Panel id="dashboard-next-appointment" eyebrow="Next on your day" title="Next Appointment"><SourceState source={data.sources.schedule}>{data.schedule.next ? <Link href={withPreview(data.schedule.next.href, preview)} className="dashboard-next-appointment"><span className="dashboard-next-time">{formatTime(data.schedule.next.start, data.timeZone)}</span><PatientLine patient={data.schedule.next.patient} /><strong>{data.schedule.next.type}</strong><span>{data.schedule.next.location || 'Location not recorded'}</span><b>Open appointment <Icon name="arrow" size={13} /></b></Link> : <EmptyState icon="calendar" title="No next appointment" message="There is no upcoming appointment in today&apos;s schedule." />}</SourceState></Panel>}
      <Panel id="dashboard-anatomy-reference" eyebrow="Clinical reference" title="Human Skeleton" tools={<div className="dashboard-reference-tools"><button type="button" aria-label="Zoom out" onClick={() => setSkeletonZoom((value) => Math.max(.82, value - .08))}><Icon name="zoomOut" size={14} /></button><span>{Math.round(skeletonZoom * 100)}%</span><button type="button" aria-label="Zoom in" onClick={() => setSkeletonZoom((value) => Math.min(1.3, value + .08))}><Icon name="zoomIn" size={14} /></button></div>}><figure className="dashboard-skeleton-reference"><div className="dashboard-skeleton-viewport"><span className="dashboard-skeleton-grid" /><Image src="/skeleton-reference.png" width={508} height={644} sizes="(max-width: 700px) 100vw, (max-width: 920px) 50vw, 380px" loading="eager" unoptimized alt="Generic human skeleton anatomical reference" style={{ transform: `scale(${skeletonZoom})` }} /></div><figcaption>Generic reference image · not patient-specific.</figcaption></figure></Panel>
      {data.capabilities.communications && <Panel id="dashboard-communications" eyebrow="Communication Hub" title="Communications" subtitle={`${data.metrics.unreadCommunications} unread · ${data.metrics.communicationNeedsResponse} need response`} action={{ label: 'Open Hub', href: withPreview('/communication', preview) }}><SourceState source={data.sources.communications}>{data.communications.items.length ? <div className="dashboard-communication-list">{data.communications.items.map((item) => <CommunicationRow key={item.id} item={item} preview={preview} reference={reference} />)}</div> : <EmptyState icon="message" title="No unread communications" message="There are no active communications requiring a response." />}</SourceState></Panel>}
      <Panel id="dashboard-quick-actions" eyebrow="Shortcuts" title="Quick Actions"><div className="dashboard-shortcut-list"><Link href={withPreview('/dashboard/patients', preview)}><span><Icon name="search" size={16} /></span>Find Patient<Icon name="arrow" size={13} /></Link>{data.capabilities.schedule && <Link href={withPreview('/dashboard/encounters/new', preview)}><span><Icon name="encounter" size={16} /></span>Start Encounter<Icon name="arrow" size={13} /></Link>}{data.capabilities.orders && <Link href={withPreview('/dashboard/orders?new=1', preview)}><span><Icon name="orders" size={16} /></span>New Order<Icon name="arrow" size={13} /></Link>}{data.capabilities.work && <Link href={withPreview('/dashboard/tasks?new=1', preview)}><span><Icon name="tasks" size={16} /></span>New Task<Icon name="arrow" size={13} /></Link>}{data.capabilities.communications && <Link href={withPreview('/communication?new=1', preview)}><span><Icon name="message" size={16} /></span>New Communication<Icon name="arrow" size={13} /></Link>}</div></Panel>
      <Panel id="dashboard-system-health" eyebrow="Source status" title="System Status"><div className={`dashboard-system-health ${data.systemStatus.state !== 'healthy' ? 'is-attention' : ''}`}><span><Icon name={data.systemStatus.state === 'healthy' ? 'check' : 'alert'} size={16} /></span><div><strong>{data.systemStatus.label}</strong><p>{data.systemStatus.detail}</p>{data.systemStatus.issues.slice(1).map((issue) => <small key={issue}>{issue}</small>)}</div></div><div className="dashboard-source-list"><span><i className={data.sources.schedule.state === 'ready' ? 'is-ready' : 'is-warning'} />Schedule</span><span><i className={data.sources.work.state === 'ready' ? 'is-ready' : 'is-warning'} />Clinical work</span><span><i className={data.sources.communications.state === 'ready' ? 'is-ready' : 'is-warning'} />Communications</span><span><i className={data.sources.orders.state === 'ready' ? 'is-ready' : 'is-warning'} />Orders</span></div></Panel>
    </aside></div>
    <footer className="dashboard-home-footer"><span>{roleName} · {formatUpdated(data.generatedAt, data.timeZone)}</span><Link href={withPreview('/doctor', preview)}>Open Doctor View <Icon name="arrow" size={13} /></Link></footer>
  </div></main>;
}
