'use client';

import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import type { SchedulingPatient } from '@/lib/schedulingData';
import type { ClinicalOrder, OrderCategory, OrderPriority, OrderSnapshot } from '@/lib/orderStore';
import './orders-command-center.css';

type OrderPatient = SchedulingPatient & { mrn?: string; birthDate?: string };
type Filters = { q: string; category: '' | OrderCategory; status: string; priority: '' | OrderPriority; provider: string; destination: string; patientId: string; dateFrom: string; dateTo: string };
type Action = 'sign' | 'send' | 'resend' | 'schedule' | 'collect' | 'start' | 'complete' | 'review-result' | 'hold' | 'resume' | 'cancel';
type SortKey = 'recent' | 'oldest' | 'patient' | 'priority' | 'status';
type CreateForm = { patientId: string; category: OrderCategory; orderName: string; orderCode: string; priority: OrderPriority; orderingProvider: string; destination: string; clinicalIndication: string; instructions: string; specimenType: string; collectionLocation: string; bodySite: string; laterality: string; contrast: string; requestedDate: string };
type DuplicateOrder = { id: string; orderName: string; patientName: string; orderedAt: string; workflowStatus: string };

const EMPTY_FILTERS: Filters = { q: '', category: '', status: '', priority: '', provider: '', destination: '', patientId: '', dateFrom: '', dateTo: '' };
const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'recent', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'patient', label: 'Patient name' },
  { value: 'priority', label: 'Priority' },
  { value: 'status', label: 'Workflow status' },
];
const ORDER_OPTIONS: Record<OrderCategory, Array<{ name: string; code: string }>> = {
  Laboratory: [{ name: 'Complete Blood Count (CBC)', code: 'CBC' }, { name: 'Comprehensive Metabolic Panel (CMP)', code: 'CMP' }, { name: 'Hemoglobin A1c', code: 'A1C' }, { name: 'Lipid Panel', code: 'LIPID' }, { name: 'TSH', code: 'TSH' }, { name: 'Urinalysis', code: 'UA' }],
  Imaging: [{ name: 'Chest X-Ray', code: 'XR-CHEST' }, { name: 'CT Chest With Contrast', code: 'CT-CHEST-CONTRAST' }, { name: 'MRI Brain', code: 'MRI-BRAIN' }, { name: 'Ultrasound Abdomen', code: 'US-ABDOMEN' }],
  Diagnostics: [{ name: '12-Lead ECG', code: 'ECG-12' }, { name: 'Echocardiogram', code: 'ECHO' }, { name: 'Stress Test', code: 'STRESS' }, { name: 'Holter Monitor', code: 'HOLTER' }],
};
const DESTINATIONS: Record<OrderCategory, Array<{ name: string; type: CreateForm['category'] extends never ? never : 'LIMS' | 'RIS/PACS' | 'Hospital service' }>> = {
  Laboratory: [{ name: 'Maple Health Laboratory', type: 'LIMS' }, { name: 'Main Lab', type: 'LIMS' }],
  Imaging: [{ name: 'Toronto Diagnostic Imaging', type: 'RIS/PACS' }, { name: 'Northern Care Imaging', type: 'RIS/PACS' }],
  Diagnostics: [{ name: 'Cardiology Diagnostics', type: 'Hospital service' }, { name: 'Maple Health Diagnostic Services', type: 'Hospital service' }],
};

function formatDate(value?: string) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date);
}

function formatDateTime(value?: string) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return `${new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date)} · ${new Intl.DateTimeFormat('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }).format(date)}`;
}

function statusClass(status: string) {
  if (status === 'Completed') return 'is-completed';
  if (status === 'Delivery Issue') return 'is-error';
  if (status === 'Needs Signature' || status === 'On Hold') return 'is-warning';
  if (status === 'Cancelled' || status === 'Entered in Error') return 'is-muted';
  if (status === 'In Progress' || status === 'Collected' || status === 'Scheduled') return 'is-progress';
  return 'is-active';
}

function priorityClass(priority: OrderPriority) {
  return priority === 'STAT' ? 'is-stat' : priority === 'Urgent' || priority === 'ASAP' ? 'is-urgent' : 'is-routine';
}

function priorityRank(priority: OrderPriority) {
  return priority === 'STAT' ? 0 : priority === 'ASAP' ? 1 : priority === 'Urgent' ? 2 : 3;
}

function sortOrders(orders: ClinicalOrder[], sortBy: SortKey) {
  return orders.slice().sort((left, right) => {
    if (sortBy === 'oldest') return Date.parse(left.orderedAt) - Date.parse(right.orderedAt);
    if (sortBy === 'patient') return left.patientName.localeCompare(right.patientName) || Date.parse(right.orderedAt) - Date.parse(left.orderedAt);
    if (sortBy === 'priority') return priorityRank(left.priority) - priorityRank(right.priority) || Date.parse(right.orderedAt) - Date.parse(left.orderedAt);
    if (sortBy === 'status') return left.workflowStatus.localeCompare(right.workflowStatus) || Date.parse(right.orderedAt) - Date.parse(left.orderedAt);
    return Date.parse(right.orderedAt) - Date.parse(left.orderedAt);
  });
}

function resultLabel(order: ClinicalOrder) {
  if (order.result.status === 'no-result') return 'No Result Yet';
  return order.result.reviewStatus === 'needs-review' ? `${order.result.status} · Needs Review` : order.result.status;
}

function orderIcon(category: OrderCategory) {
  if (category === 'Laboratory') return <><path d="M9 3v6l-4.5 8.2A2 2 0 006.2 20h11.6a2 2 0 001.7-2.8L15 9V3" /><path d="M7 14h10M8 3h8" /></>;
  if (category === 'Imaging') return <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M12 4v5M20 12h-5M12 20v-5M4 12h5" /></>;
  return <><path d="M4 13a8 8 0 0116 0" /><path d="M4 13v3a2 2 0 002 2h1v-5H4ZM20 13v3a2 2 0 01-2 2h-1v-5h3Z" /><path d="M12 5v3M9 7l3 2 3-2" /></>;
}

function TypeIcon({ category }: { category: OrderCategory }) {
  return <span className={`orders-type-icon is-${category === 'Laboratory' ? 'lab' : category === 'Imaging' ? 'imaging' : 'diagnostic'}`} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{orderIcon(category)}</svg></span>;
}

function MetricCard({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: string }) {
  return <div className={`orders-metric ${tone}`}><span className="orders-metric-label">{label}</span><strong>{value}</strong><span>{detail}</span></div>;
}

function Field({ label, value, onChange, type = 'text', required = false, placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return <label className="orders-form-field"><span>{label}{required && <em aria-hidden="true"> *</em>}</span><input type={type} required={required} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>;
}

function DrawerPortal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);
  if (!mounted) return null;
  return createPortal(<div className="orders-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>{children}</div>, document.body);
}

function OrderDetailDrawer({ order, onClose, onAction, busyAction, actionError }: { order: ClinicalOrder; onClose: () => void; onAction: (action: Action) => void; busyAction: Action | null; actionError: string | null }) {
  const drawerRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !drawerRef.current) return;
      const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>('button, a[href]')).filter((element) => !element.hasAttribute('disabled'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus(); };
  }, [onClose]);

  const canAct = order.fhirStatus !== 'completed' && order.fhirStatus !== 'revoked' && order.fhirStatus !== 'entered-in-error';
  const actions: Array<{ action: Action; label: string; enabled: boolean }> = [
    { action: 'sign', label: 'Sign Order', enabled: order.fhirStatus === 'draft' },
    { action: 'send', label: 'Send / Queue', enabled: order.fhirStatus === 'active' && order.transmission.state === 'not-sent' },
    { action: 'resend', label: 'Retry Transmission', enabled: order.transmission.state === 'failed' },
    { action: 'schedule', label: 'Schedule', enabled: canAct && order.category !== 'Laboratory' && ['Ordered', 'Sent', 'Accepted'].includes(order.workflowStatus) },
    { action: 'collect', label: 'Record Collection', enabled: canAct && order.category === 'Laboratory' && ['Ordered', 'Sent', 'Accepted', 'Awaiting Collection'].includes(order.workflowStatus) },
    { action: 'start', label: 'Start Processing', enabled: canAct && ['Collected', 'Scheduled'].includes(order.workflowStatus) },
    { action: 'complete', label: 'Mark Complete', enabled: canAct && ['In Progress', 'Collected', 'Scheduled'].includes(order.workflowStatus) },
    { action: 'review-result', label: 'Review Result', enabled: order.result.reviewStatus === 'needs-review' },
    { action: order.fhirStatus === 'on-hold' ? 'resume' : 'hold', label: order.fhirStatus === 'on-hold' ? 'Resume Order' : 'Place on Hold', enabled: canAct },
    { action: 'cancel', label: 'Cancel Order', enabled: canAct },
  ];

  return <DrawerPortal onClose={onClose}><aside ref={drawerRef} className="orders-drawer" role="dialog" aria-modal="true" aria-labelledby="order-detail-title"><header className="orders-drawer-header"><div><span className="orders-eyebrow">Order Details</span><h2 id="order-detail-title">{order.orderName}</h2><div className="orders-drawer-subtitle"><TypeIcon category={order.category} /><span>{order.category} · {order.id}</span></div></div><button ref={closeRef} type="button" className="orders-icon-button" onClick={onClose} aria-label="Close order details">×</button></header><div className="orders-drawer-body">
    <div className="orders-detail-status"><span className={`orders-status-chip ${statusClass(order.workflowStatus)}`}>{order.workflowStatus}</span><span className={`orders-priority-chip ${priorityClass(order.priority)}`}>{order.priority}</span></div>
    <section className="orders-detail-section"><h3>Patient</h3><div className="orders-detail-patient"><strong>{order.patientName}</strong><span>{order.patientMrn ? `MRN ${order.patientMrn}` : 'MRN not recorded'}{order.patientBirthDate ? ` · DOB ${formatDate(order.patientBirthDate)}` : ''}</span>{order.patientId && <Link href={`/dashboard/records/${encodeURIComponent(order.patientId)}`} onClick={onClose}>Open Patient Record</Link>}</div></section>
    <section className="orders-detail-section"><h3>Order Context</h3><dl className="orders-detail-grid"><div><dt>Ordered</dt><dd>{formatDateTime(order.orderedAt)}</dd></div><div><dt>Ordering Clinician</dt><dd>{order.orderingProvider}</dd></div><div><dt>Priority</dt><dd>{order.priority}</dd></div><div><dt>FHIR Status</dt><dd><code>ServiceRequest.status = {order.fhirStatus}</code></dd></div><div><dt>Destination</dt><dd>{order.destination}</dd></div><div><dt>Order Version</dt><dd>{order.version}</dd></div></dl>{(order.clinicalIndication || order.instructions || order.specimenType || order.bodySite || order.laterality || order.contrast || order.requestedDate) && <div className="orders-clinical-request"><h4>Clinical Request</h4>{order.clinicalIndication && <p><strong>Indication</strong>{order.clinicalIndication}</p>}{order.instructions && <p><strong>Instructions</strong>{order.instructions}</p>}{order.specimenType && <p><strong>Specimen</strong>{order.specimenType}{order.collectionLocation ? ` · ${order.collectionLocation}` : ''}</p>}{order.bodySite && <p><strong>Body site</strong>{order.bodySite}{order.laterality ? ` · ${order.laterality}` : ''}{order.contrast ? ` · Contrast: ${order.contrast}` : ''}</p>}{order.requestedDate && <p><strong>Requested date</strong>{formatDate(order.requestedDate)}</p>}</div>}</section>
    <section className="orders-detail-section"><h3>Destination and Delivery</h3><div className="orders-delivery-panel"><div><span>Destination</span><strong>{order.transmission.destinationSystem || order.destination}</strong></div><div><span>Delivery state</span><strong className={`orders-delivery-state is-${order.transmission.state}`}>{order.transmission.state === 'not-sent' ? 'Not sent' : order.transmission.state === 'failed' ? 'Delivery issue' : order.transmission.state[0].toUpperCase() + order.transmission.state.slice(1)}</strong></div><div><span>Attempts</span><strong>{order.transmission.attempts}</strong></div>{order.transmission.lastAttemptAt && <div><span>Last attempt</span><strong>{formatDateTime(order.transmission.lastAttemptAt)}</strong></div>}{order.transmission.failure && <p className="orders-delivery-error">{order.transmission.failure}</p>}</div>{order.transmission.state === 'queued' && <p className="orders-queued-note">This order is safely queued in the Roshi delivery ledger. Clinical order status remains independent from destination delivery.</p>}</section>
    <section className="orders-detail-section"><h3>Result</h3><div className="orders-result-detail"><strong>{resultLabel(order)}</strong>{order.result.display && <span>{order.result.display}</span>}{order.result.resourceId && <code>{order.result.resourceType}/{order.result.resourceId}</code>}{order.result.status === 'no-result' && <small>Order completion does not imply a result or clinician review.</small>}</div></section>
    <section className="orders-detail-section"><h3>Order Timeline</h3><ol className="orders-timeline">{order.history.slice().reverse().map((event) => <li key={event.id}><span>{formatDateTime(event.at)}</span><div><strong>{event.event}</strong><small>{event.actor}{event.detail ? ` · ${event.detail}` : ''}</small></div></li>)}</ol></section>
    {actionError && <div className="orders-inline-error" role="alert">{actionError}</div>}
    <section className="orders-detail-section orders-detail-actions"><h3>Actions</h3><div className="orders-action-grid">{actions.map((item) => <button key={item.action} type="button" disabled={!item.enabled || busyAction !== null} onClick={() => onAction(item.action)} className={item.action === 'cancel' ? 'is-danger' : item.action === 'sign' ? 'is-primary' : ''}>{busyAction === item.action ? 'Saving...' : item.label}</button>)}</div></section>
    </div></aside></DrawerPortal>;
}

function CreateOrderDrawer({ patients, providers, initialCategory, onClose, onCreated }: { patients: OrderPatient[]; providers: string[]; initialCategory: OrderCategory; onClose: () => void; onCreated: (order: ClinicalOrder) => void }) {
  const [form, setForm] = useState<CreateForm>({ patientId: '', category: initialCategory, orderName: '', orderCode: '', priority: 'Routine', orderingProvider: providers[0] || 'Doctor User', destination: DESTINATIONS[initialCategory][0].name, clinicalIndication: '', instructions: '', specimenType: initialCategory === 'Laboratory' ? 'Blood' : '', collectionLocation: initialCategory === 'Laboratory' ? 'Main Lab' : '', bodySite: '', laterality: '', contrast: 'Not specified', requestedDate: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateOrder[] | null>(null);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const idempotencyKeyRef = useRef<string | null>(null);
  const options = ORDER_OPTIONS[form.category];
  const selectedPatient = patients.find((patient) => patient.id === form.patientId);
  const isDirty = Boolean(form.patientId || form.orderName || form.clinicalIndication || form.instructions || form.specimenType !== (form.category === 'Laboratory' ? 'Blood' : '') || form.collectionLocation !== (form.category === 'Laboratory' ? 'Main Lab' : '') || form.bodySite || form.laterality || form.requestedDate);

  const requestClose = useCallback(() => {
    if (saving) return;
    if (isDirty) { setConfirmClose(true); return; }
    onClose();
  }, [isDirty, onClose, saving]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('.orders-create-drawer');
    const closeButton = dialog?.querySelector<HTMLButtonElement>('.orders-icon-button');
    closeButton?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); requestClose(); }
      if (event.key !== 'Tab' || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href]')).filter((element) => !element.hasAttribute('disabled'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus(); };
  }, [onClose, requestClose]);

  function update(name: keyof CreateForm, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }
  function selectCategory(category: OrderCategory) {
    const destination = DESTINATIONS[category][0];
    setForm((current) => ({ ...current, category, orderName: '', orderCode: '', destination: destination.name, specimenType: category === 'Laboratory' ? 'Blood' : '', collectionLocation: category === 'Laboratory' ? 'Main Lab' : '', bodySite: category === 'Imaging' ? '' : current.bodySite }));
  }
  function selectOrder(name: string) {
    const option = options.find((candidate) => candidate.name === name);
    setForm((current) => ({ ...current, orderName: name, orderCode: option?.code || '' }));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const idempotencyKey = idempotencyKeyRef.current || (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `order-${Date.now()}`);
    idempotencyKeyRef.current = idempotencyKey;
    const destination = DESTINATIONS[form.category].find((candidate) => candidate.name === form.destination) || DESTINATIONS[form.category][0];
    try {
      const response = await fetch('/api/orders', { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ ...form, destinationType: destination.type, idempotencyKey, confirmDuplicate }) });
      const payload = await response.json().catch(() => ({})) as { data?: ClinicalOrder; error?: string; code?: string; duplicates?: DuplicateOrder[] };
      if (response.status === 409 && payload.code === 'POTENTIAL_DUPLICATE') {
        setDuplicates(payload.duplicates || []);
        setConfirmDuplicate(false);
        return;
      }
      if (!response.ok || !payload.data) throw new Error(payload.error || 'The order could not be saved.');
      idempotencyKeyRef.current = null;
      onCreated(payload.data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The order could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  return <DrawerPortal onClose={requestClose}><aside className="orders-drawer orders-create-drawer" role="dialog" aria-modal="true" aria-labelledby="new-order-title"><header className="orders-drawer-header"><div><span className="orders-eyebrow">Order Composer</span><h2 id="new-order-title">New Order</h2><p>Create a validated draft. Sign it before any destination transmission.</p></div><button type="button" className="orders-icon-button" onClick={requestClose} aria-label="Close new order">×</button></header><form className="orders-create-form" onSubmit={(event) => void submit(event)}><div className="orders-form-body">{confirmClose && <div className="orders-unsaved-confirm" role="alertdialog" aria-labelledby="orders-unsaved-title"><strong id="orders-unsaved-title">Discard unsaved order?</strong><p>Your entered order details will be lost.</p><div><button type="button" className="orders-secondary-button" onClick={() => setConfirmClose(false)}>Keep editing</button><button type="button" className="orders-danger-button" onClick={onClose}>Discard</button></div></div>}{duplicates && <div className="orders-duplicate-review" role="alert"><strong>Possible Duplicate Order</strong><p>An open order for this patient and test already exists. Review it before continuing. No new order has been saved.</p>{duplicates.map((duplicate) => <div className="orders-duplicate-row" key={duplicate.id}><span>{duplicate.orderName} · {duplicate.patientName}</span><small>{formatDateTime(duplicate.orderedAt)} · {duplicate.workflowStatus}</small></div>)}<div className="orders-duplicate-actions"><button type="button" className="orders-secondary-button" onClick={() => { setDuplicates(null); setConfirmDuplicate(false); }}>Edit Order</button><button type="button" className="orders-primary-button" onClick={() => { setDuplicates(null); setConfirmDuplicate(true); }}>Continue Creating</button></div></div>}<fieldset><legend>Order category</legend><div className="orders-segmented">{(['Laboratory', 'Imaging', 'Diagnostics'] as OrderCategory[]).map((category) => <button type="button" key={category} data-testid={`new-order-category-${category}`} className={form.category === category ? 'is-selected' : ''} onClick={() => selectCategory(category)}><TypeIcon category={category} />{category === 'Diagnostics' ? 'Cardiology / Diagnostics' : category}</button>)}</div></fieldset><fieldset><legend>Patient and request</legend><div className="orders-form-grid"><label className="orders-form-field"><span>Patient<em aria-hidden="true"> *</em></span><select required data-testid="new-order-patient" value={form.patientId} onChange={(event) => update('patientId', event.target.value)}><option value="">Select Patient</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name}{patient.mrn ? ` · MRN ${patient.mrn}` : ''}</option>)}</select></label><label className="orders-form-field"><span>Test / Procedure<em aria-hidden="true"> *</em></span><select required data-testid="new-order-test" value={form.orderName} onChange={(event) => selectOrder(event.target.value)}><option value="">Select order</option>{options.map((option) => <option key={option.code} value={option.name}>{option.name}</option>)}</select></label><label className="orders-form-field"><span>Ordering Clinician<em aria-hidden="true"> *</em></span><select required value={form.orderingProvider} onChange={(event) => update('orderingProvider', event.target.value)}>{providers.map((provider) => <option key={provider}>{provider}</option>)}</select></label><label className="orders-form-field"><span>Priority<em aria-hidden="true"> *</em></span><select required value={form.priority} onChange={(event) => update('priority', event.target.value)}>{(['Routine', 'Urgent', 'ASAP', 'STAT'] as OrderPriority[]).map((priority) => <option key={priority}>{priority}</option>)}</select></label><label className="orders-form-field"><span>Destination<em aria-hidden="true"> *</em></span><select required value={form.destination} onChange={(event) => update('destination', event.target.value)}>{DESTINATIONS[form.category].map((destination) => <option key={destination.name}>{destination.name}</option>)}</select></label><Field label="Requested date" value={form.requestedDate} type="date" onChange={(value) => update('requestedDate', value)} /></div>{selectedPatient ? <div className="orders-selected-patient" role="status"><strong>Selected patient</strong><span>{selectedPatient.name}{selectedPatient.mrn ? ` · MRN ${selectedPatient.mrn}` : ''}</span><small>Verify this identity before creating the order.</small></div> : <div className="orders-patient-check" role="note">Select the intended patient before choosing a test or creating a draft.</div>}</fieldset>{form.category === 'Laboratory' && <fieldset><legend>Collection</legend><div className="orders-form-grid"><label className="orders-form-field"><span>Specimen type<em aria-hidden="true"> *</em></span><select required value={form.specimenType} onChange={(event) => update('specimenType', event.target.value)}>{['Blood', 'Urine', 'Swab', 'Stool', 'Other'].map((value) => <option key={value}>{value}</option>)}</select></label><Field label="Collection location" value={form.collectionLocation} onChange={(value) => update('collectionLocation', value)} /></div></fieldset>}{form.category === 'Imaging' && <fieldset><legend>Imaging context</legend><div className="orders-form-grid"><Field label="Body site" value={form.bodySite} required onChange={(value) => update('bodySite', value)} placeholder="e.g. Chest" /><Field label="Laterality" value={form.laterality} onChange={(value) => update('laterality', value)} placeholder="e.g. Left" /><label className="orders-form-field"><span>Contrast</span><select value={form.contrast} onChange={(event) => update('contrast', event.target.value)}><option>Not specified</option><option>With contrast</option><option>Without contrast</option><option>Review required</option></select></label></div></fieldset>}<fieldset><legend>Clinical context</legend><div className="orders-form-grid orders-form-grid-wide"><label className="orders-form-field orders-form-field-wide"><span>Clinical indication<em aria-hidden="true"> *</em></span><textarea required data-testid="new-order-indication" value={form.clinicalIndication} onChange={(event) => update('clinicalIndication', event.target.value)} placeholder="Document the reason for this order" /></label><label className="orders-form-field orders-form-field-wide"><span>Patient instructions / special instructions</span><textarea value={form.instructions} onChange={(event) => update('instructions', event.target.value)} placeholder="Only include approved, entered instructions" /></label></div></fieldset>{error && <div className="orders-inline-error" role="alert">{error}</div>}</div><footer className="orders-drawer-footer"><button type="button" className="orders-secondary-button" onClick={requestClose}>Cancel</button><button type="submit" data-testid="new-order-submit" className="orders-primary-button" disabled={saving}>{saving ? 'Saving Draft...' : confirmDuplicate ? 'Create Duplicate Draft' : 'Create Draft Order'}</button></footer></form></aside></DrawerPortal>;
}

function QuickFilter({ label, count, active, onClick }: { label: string; count?: number; active: boolean; onClick: () => void }) {
  return <button type="button" className={`orders-quick-filter${active ? ' is-selected' : ''}`} onClick={onClick}>{label}{count !== undefined && <span>{count}</span>}</button>;
}

function OrdersSortControl({ sortBy, total, onChange }: { sortBy: SortKey; total: number; onChange: (value: SortKey) => void }) {
  return <section className="orders-sort-strip" aria-label="Worklist display controls"><div><strong>Worklist</strong><span>{total} matching order{total === 1 ? '' : 's'}</span></div><label><span>Sort by</span><select data-testid="orders-sort" value={sortBy} onChange={(event) => onChange(event.target.value as SortKey)}>{SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></section>;
}

function OrderRow({ order, onOpen, onMenu, menuOpen, onMenuAction }: { order: ClinicalOrder; onOpen: () => void; onMenu: () => void; menuOpen: boolean; onMenuAction: (action: Action) => void }) {
  return <tr data-testid={`order-row-${order.id}`} tabIndex={0} onClick={onOpen} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(); } }}><td><div className="orders-patient-cell"><strong>{order.patientName}</strong><span>{order.patientMrn ? `MRN ${order.patientMrn}` : 'Patient reference on file'}</span></div></td><td><div className="orders-order-cell"><TypeIcon category={order.category} /><div><strong>{order.orderName}</strong><span>{order.orderCode || order.id}</span></div></div></td><td><span className="orders-type-label">{order.category === 'Diagnostics' ? 'Diagnostics' : order.category}</span></td><td><span className={`orders-priority-chip ${priorityClass(order.priority)}`}>{order.priority}</span></td><td><span className="orders-date-cell">{formatDateTime(order.orderedAt)}<small>{order.orderingProvider}</small></span></td><td><span className="orders-destination-cell">{order.destination}<small>{order.transmission.state === 'accepted' ? 'Connected' : order.transmission.state === 'failed' ? 'Delivery issue' : order.transmission.state === 'queued' ? 'Queued' : 'Not sent'}</small></span></td><td><span data-testid={`order-status-${order.id}`} className={`orders-status-chip ${statusClass(order.workflowStatus)}`}>{order.workflowStatus}</span></td><td><span className="orders-next-step">{order.nextStep}</span></td><td><span className={`orders-result-chip ${order.result.reviewStatus === 'needs-review' ? 'is-review' : ''}`}>{resultLabel(order)}</span></td><td><div className="orders-row-actions"><button type="button" className="orders-open-button" data-testid={`open-order-${order.id}`} onClick={(event) => { event.stopPropagation(); onOpen(); }}>Open</button><div className="orders-menu-wrap"><button type="button" className="orders-more-button" aria-label={`More actions for ${order.orderName}`} aria-expanded={menuOpen} onClick={(event) => { event.stopPropagation(); onMenu(); }}>...</button>{menuOpen && <div className="orders-menu" role="menu"><button type="button" role="menuitem" onClick={() => onOpen()}>Open Details</button>{order.fhirStatus === 'draft' && <button type="button" role="menuitem" onClick={() => onMenuAction('sign')}>Sign Order</button>}{order.fhirStatus !== 'completed' && order.fhirStatus !== 'revoked' && <button type="button" role="menuitem" onClick={() => onMenuAction('cancel')}>Cancel Order</button>}</div>}</div></div></td></tr>;
}

export default function OrdersCommandCenterClient({ initialData, patients, initialOrderId, initialCreateOpen = false }: { initialData: OrderSnapshot; patients: OrderPatient[]; initialOrderId?: string; initialCreateOpen?: boolean }) {
  const [data, setData] = useState(initialData);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const deferredQuery = useDeferredValue(filters.q);
  const [sortBy, setSortBy] = useState<SortKey>('recent');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<ClinicalOrder | null>(() => initialOrderId ? initialData.data.find((order) => order.id === initialOrderId) || null : null);
  const [createOpen, setCreateOpen] = useState(initialCreateOpen);
  const [menuOrderId, setMenuOrderId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<Action | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  const queryString = useMemo(() => {
    const query = new URLSearchParams();
    if (deferredQuery.trim()) query.set('q', deferredQuery.trim());
    if (filters.category) query.set('category', filters.category);
    if (filters.status) query.set('status', filters.status);
    if (filters.priority) query.set('priority', filters.priority);
    if (filters.provider) query.set('provider', filters.provider);
    if (filters.destination) query.set('destination', filters.destination);
    if (filters.patientId) query.set('patientId', filters.patientId);
    if (filters.dateFrom) query.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) query.set('dateTo', filters.dateTo);
    return query.toString();
  }, [deferredQuery, filters.category, filters.status, filters.priority, filters.provider, filters.destination, filters.patientId, filters.dateFrom, filters.dateTo]);

  async function loadOrders(showSpinner = true) {
    if (showSpinner) setLoading(true);
    try {
      const response = await fetch(`/api/orders${queryString ? `?${queryString}` : ''}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Orders could not be loaded.');
      const next = await response.json() as OrderSnapshot;
      setData({ ...next, data: sortOrders(next.data, sortBy) });
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Orders could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/orders${queryString ? `?${queryString}` : ''}`, { cache: 'no-store', signal: controller.signal }).then(async (response) => { if (!response.ok) throw new Error('Orders could not be loaded.'); return response.json() as Promise<OrderSnapshot>; }).then((next) => { setData({ ...next, data: sortOrders(next.data, sortBy) }); setError(null); }).catch((requestError: unknown) => { if ((requestError as { name?: string }).name !== 'AbortError') setError(requestError instanceof Error ? requestError.message : 'Orders could not be loaded.'); }).finally(() => setLoading(false));
    return () => controller.abort();
  }, [queryString, sortBy]);

  const counts = useMemo(() => ({
    all: data.data.length,
    needsAction: data.data.filter((order) => order.workflowStatus === 'Needs Signature' || order.workflowStatus === 'Delivery Issue' || order.result.reviewStatus === 'needs-review').length,
    pending: data.data.filter((order) => ['Draft', 'Needs Signature', 'Ordered', 'Sent', 'Accepted', 'Awaiting Scheduling', 'Awaiting Collection', 'On Hold'].includes(order.workflowStatus)).length,
    inProgress: data.data.filter((order) => ['Scheduled', 'Awaiting Collection', 'Collected', 'In Progress', 'Partial Result'].includes(order.workflowStatus)).length,
    completed: data.data.filter((order) => order.fhirStatus === 'completed').length,
    cancelled: data.data.filter((order) => ['Cancelled', 'Entered in Error'].includes(order.workflowStatus)).length,
    deliveryIssues: data.data.filter((order) => order.transmission.state === 'failed' || order.workflowStatus === 'Delivery Issue').length,
  }), [data.data]);

  function updateFilter(name: keyof Filters, value: string) {
    setFilters((current) => ({ ...current, [name]: value }));
  }
  function setQuickStatus(status: string) {
    setFilters((current) => ({ ...current, status: current.status === status ? '' : status }));
  }
  function clearFilters() {
    setFilters(EMPTY_FILTERS);
  }
  function changeSort(value: SortKey) {
    setSortBy(value);
    setData((current) => ({ ...current, data: sortOrders(current.data, value) }));
  }
  function refresh() {
    setRefreshing(true);
    void loadOrders(false);
  }
  function openOrder(order: ClinicalOrder) {
    setMenuOrderId(null);
    setActionError(null);
    setSelectedOrder(order);
  }
  async function performAction(action: Action, order = selectedOrder) {
    if (!order) return;
    setBusyAction(action);
    setActionError(null);
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(order.id)}/actions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, version: order.version }) });
      const payload = await response.json().catch(() => ({})) as { data?: ClinicalOrder; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error || 'The order action could not be saved.');
      setSelectedOrder(payload.data);
      setData((current) => ({ ...current, data: current.data.map((candidate) => candidate.id === payload.data?.id ? payload.data : candidate) as ClinicalOrder[] }));
      setMenuOrderId(null);
      await loadOrders(false);
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : 'The order action could not be saved.');
    } finally {
      setBusyAction(null);
    }
  }
  function createdOrder(order: ClinicalOrder) {
    setCreateOpen(false);
    setSelectedOrder(order);
    void loadOrders(false);
  }

  const empty = !loading && data.data.length === 0;
  const sourceSummary = 'Roshi order registry · FHIR-aligned ServiceRequest read model';

  return <main className="orders-command-center" data-testid="orders-page" aria-labelledby="orders-title" onClick={() => menuOrderId && setMenuOrderId(null)}><div className="orders-inner"><header className="orders-page-header"><div><span className="orders-eyebrow">Clinical Work · Diagnostic Operations</span><h1 id="orders-title">Orders</h1><p>Create, track and manage laboratory, imaging and diagnostic orders.</p><span className="orders-page-context">{sourceSummary}</span></div><div className="orders-header-actions"><button type="button" className="orders-secondary-button" onClick={refresh} disabled={refreshing}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 00-14.9-3M4 13a8 8 0 0014.9 3M5 4v4h4M19 20v-4h-4" /></svg>{refreshing ? 'Refreshing...' : 'Refresh'}</button><div className="orders-more-actions-wrap"><button type="button" className="orders-secondary-button" aria-expanded={moreOpen} onClick={(event) => { event.stopPropagation(); setMoreOpen((current) => !current); }}>More Actions</button>{moreOpen && <div className="orders-more-menu" role="menu"><Link href="/dashboard/orders/labs/new" role="menuitem" onClick={() => setMoreOpen(false)}>Open Advanced Lab Composer</Link><button type="button" role="menuitem" onClick={() => { clearFilters(); setMoreOpen(false); }}>Clear All Filters</button></div>}</div><button type="button" className="orders-primary-button" data-testid="new-order-button" onClick={() => setCreateOpen(true)}><span aria-hidden="true">+</span> New Order</button></div></header>
    {error && <div className="orders-error" role="alert"><strong>Orders temporarily unavailable</strong><span>{error}</span><button type="button" onClick={refresh}>Try Again</button></div>}
    <section className="orders-metrics" aria-label="Order snapshot"><MetricCard label="Open Orders" value={data.metrics.open} detail="Active workflow" tone="is-open" /><MetricCard label="Needs Action" value={data.metrics.needsAction} detail="Signature, review or correction" tone="is-action" /><MetricCard label="In Progress" value={data.metrics.inProgress} detail="Collection or diagnostics underway" tone="is-progress" /><MetricCard label="Completed" value={data.metrics.completed} detail="Completed in selected view" tone="is-completed" />{data.metrics.deliveryIssues > 0 && <MetricCard label="Delivery Issues" value={data.metrics.deliveryIssues} detail="Destination requires attention" tone="is-delivery" />}</section>
    <OrdersSortControl sortBy={sortBy} total={data.total} onChange={changeSort} />
    <section className="orders-workspace-controls" aria-label="Order filters"><div className="orders-category-tabs" role="tablist" aria-label="Order type"><button type="button" role="tab" aria-selected={!filters.category} className={!filters.category ? 'is-selected' : ''} onClick={() => updateFilter('category', '')}>All Orders <span>{counts.all}</span></button>{(['Laboratory', 'Imaging', 'Diagnostics'] as OrderCategory[]).map((category) => <button type="button" role="tab" key={category} aria-selected={filters.category === category} className={filters.category === category ? 'is-selected' : ''} onClick={() => updateFilter('category', category)}><TypeIcon category={category} />{category === 'Diagnostics' ? 'Cardiology / Diagnostics' : category}</button>)}</div><div className="orders-quick-filters" role="toolbar" aria-label="Quick order status filters"><QuickFilter label="All" count={counts.all} active={!filters.status} onClick={() => updateFilter('status', '')} /><QuickFilter label="Needs Action" count={counts.needsAction} active={filters.status === 'needs-action'} onClick={() => setQuickStatus('needs-action')} /><QuickFilter label="Pending" count={counts.pending} active={filters.status === 'pending'} onClick={() => setQuickStatus('pending')} /><QuickFilter label="In Progress" count={counts.inProgress} active={filters.status === 'in-progress'} onClick={() => setQuickStatus('in-progress')} /><QuickFilter label="Completed" count={counts.completed} active={filters.status === 'completed'} onClick={() => setQuickStatus('completed')} /><QuickFilter label="Cancelled" count={counts.cancelled} active={filters.status === 'cancelled'} onClick={() => setQuickStatus('cancelled')} /><QuickFilter label="Delivery Issues" count={counts.deliveryIssues} active={filters.status === 'delivery-issues'} onClick={() => setQuickStatus('delivery-issues')} /></div><div className="orders-search-row"><label className="orders-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 5 5" /></svg><span className="sr-only">Search orders</span><input data-testid="orders-search" value={filters.q} onChange={(event) => updateFilter('q', event.target.value)} placeholder="Search patient, MRN, order, test, provider..." /><span>{loading ? 'Searching...' : `${data.total} matching`}</span></label><button type="button" className="orders-clear-button" onClick={clearFilters} disabled={!Object.values(filters).some(Boolean)}>Clear All Filters</button></div><div className="orders-advanced-filters"><label><span>Status</span><select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}><option value="">All statuses</option><option value="needs-action">Needs Action</option><option value="pending">Pending</option><option value="in-progress">In Progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="delivery-issues">Delivery Issues</option></select></label><label><span>Priority</span><select value={filters.priority} onChange={(event) => updateFilter('priority', event.target.value)}><option value="">All priorities</option>{(['Routine', 'Urgent', 'ASAP', 'STAT'] as OrderPriority[]).map((priority) => <option key={priority}>{priority}</option>)}</select></label><label><span>Patient</span><select value={filters.patientId} onChange={(event) => updateFilter('patientId', event.target.value)}><option value="">All patients</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name}{patient.mrn ? ` · MRN ${patient.mrn}` : ''}</option>)}</select></label><label><span>Ordering Provider</span><select value={filters.provider} onChange={(event) => updateFilter('provider', event.target.value)}><option value="">All providers</option>{data.availableFilters.providers.map((provider) => <option key={provider}>{provider}</option>)}</select></label><label><span>Destination</span><select value={filters.destination} onChange={(event) => updateFilter('destination', event.target.value)}><option value="">All destinations</option>{data.availableFilters.destinations.map((destination) => <option key={destination}>{destination}</option>)}</select></label><label><span>From</span><input type="date" value={filters.dateFrom} onChange={(event) => updateFilter('dateFrom', event.target.value)} /></label><label><span>To</span><input type="date" value={filters.dateTo} onChange={(event) => updateFilter('dateTo', event.target.value)} /></label></div></section>
    {empty ? <section className="orders-empty" aria-live="polite"><div className="orders-empty-icon"><TypeIcon category="Diagnostics" /></div><h2>No Orders</h2><p>No diagnostic orders match the current filters.</p><div><button type="button" className="orders-primary-button" onClick={() => setCreateOpen(true)}>+ New Order</button><button type="button" className="orders-secondary-button" onClick={clearFilters}>Clear Filters</button></div></section> : <section className="orders-worklist" aria-label="Order worklist"><div className="orders-table-wrap"><table><caption className="sr-only">Diagnostic order worklist</caption><thead><tr><th scope="col">Patient</th><th scope="col">Order</th><th scope="col">Type</th><th scope="col">Priority</th><th scope="col">Ordered</th><th scope="col">Destination</th><th scope="col">Status</th><th scope="col">Next Step</th><th scope="col">Result</th><th scope="col">Actions</th></tr></thead><tbody>{data.data.map((order) => <OrderRow key={order.id} order={order} onOpen={() => openOrder(order)} menuOpen={menuOrderId === order.id} onMenu={() => setMenuOrderId(menuOrderId === order.id ? null : order.id)} onMenuAction={(action) => void performAction(action, order)} />)}</tbody></table></div><div className="orders-mobile-list">{data.data.map((order) => <article className="orders-mobile-card" key={order.id} data-testid={`order-card-${order.id}`} onClick={() => openOrder(order)}><div className="orders-mobile-card-top"><TypeIcon category={order.category} /><div><strong>{order.orderName}</strong><span>{order.category} · {order.priority}</span></div><span className={`orders-status-chip ${statusClass(order.workflowStatus)}`}>{order.workflowStatus}</span></div><div className="orders-mobile-patient"><strong>{order.patientName}</strong><span>{order.patientMrn ? `MRN ${order.patientMrn}` : 'Patient reference on file'}</span></div><dl><div><dt>Next Step</dt><dd>{order.nextStep}</dd></div><div><dt>Result</dt><dd>{resultLabel(order)}</dd></div><div><dt>Destination</dt><dd>{order.destination}</dd></div></dl><button type="button" className="orders-open-button" onClick={(event) => { event.stopPropagation(); openOrder(order); }}>Open Order</button></article>)}</div></section>}
    <footer className="orders-list-footer"><span>{loading ? 'Updating worklist...' : `${data.total} order${data.total === 1 ? '' : 's'} in view`}</span><span>{data.generatedAt ? `Updated ${formatDateTime(data.generatedAt)}` : ''}</span></footer></div>{selectedOrder && <OrderDetailDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} onAction={(action) => void performAction(action)} busyAction={busyAction} actionError={actionError} />}{createOpen && <CreateOrderDrawer patients={patients} providers={data.availableFilters.providers} initialCategory={filters.category || 'Laboratory'} onClose={() => setCreateOpen(false)} onCreated={createdOrder} />}</main>;
}
