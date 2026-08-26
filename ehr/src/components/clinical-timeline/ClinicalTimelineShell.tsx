'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import Link from 'next/link';

type DateRange = '30d' | '6m' | '1y' | 'all';
const CLINIC_TIME_ZONE = process.env.NEXT_PUBLIC_CLINIC_TIME_ZONE || 'America/Toronto';

type TimelineEvent = {
  id: string;
  title?: string | null;
  eventType?: string | null;
  occurredAt?: string | null;
  recordedAt?: string | null;
  summary?: string | null;

  // Optional fields. These will automatically display if your API provides them.
  status?: string | null;
  severity?: string | null;
  provider?: { name?: string | null } | null;
  organization?: { name?: string | null } | null;
  source?: { system?: string | null; display?: string | null } | null;
  recordHref?: string | null;
  temporalState?: 'past' | 'current' | 'future' | null;
};

interface ClinicalTimelineShellProps {
  patientId: string;
  initialSelectedEventId?: string | null;
  initialDateRange?: DateRange | null;
  initialEventType?: string | null;
  initialSearch?: string | null;
  patientData?: { lastVisit?: string };
}

function getEventDate(event: TimelineEvent): Date | null {
  const rawDate = event.occurredAt || event.recordedAt;

  if (!rawDate) {
    return null;
  }

  const date = new Date(rawDate);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatEventDate(event: TimelineEvent): string {
  const date = getEventDate(event);

  if (!date) {
    return 'Date unavailable';
  }

  const hasTime = /T|\d{1,2}:\d{2}/.test(event.occurredAt || event.recordedAt || '');
  return date.toLocaleString(undefined, {
    timeZone: CLINIC_TIME_ZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(hasTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  });
}

function getEventType(event: TimelineEvent): string {
  return event.eventType?.trim() || 'Other';
}

function getRangeCutoff(range: DateRange): Date | null {
  const now = new Date();

  switch (range) {
    case '30d': {
      const date = new Date(now);
      date.setDate(date.getDate() - 30);
      return date;
    }

    case '6m': {
      const date = new Date(now);
      date.setMonth(date.getMonth() - 6);
      return date;
    }

    case '1y': {
      const date = new Date(now);
      date.setFullYear(date.getFullYear() - 1);
      return date;
    }

    case 'all':
    default:
      return null;
  }
}

export default function ClinicalTimelineShell({
  patientId,
  initialSelectedEventId,
  initialDateRange,
  initialEventType,
  initialSearch,
  patientData,
}: ClinicalTimelineShellProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedEventId, setSelectedEventId] =
    useState<string | null>(initialSelectedEventId ?? null);

  const [search, setSearch] = useState(initialSearch ?? '');
  const [dateRange, setDateRange] = useState<DateRange>(
    (initialDateRange as DateRange) ?? '1y',
  );
  const [eventType, setEventType] = useState(initialEventType ?? 'all');
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showSinceSummary, setShowSinceSummary] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const router = useRouter();
  const toast = useToast();

  /**
   * Load patient timeline
   */
  const loadEvents = useCallback(
    async (signal?: AbortSignal, opts?: { append?: boolean; cursor?: string }) => {
      if (!patientId?.trim()) {
        setEvents([]);
        setSelectedEventId(null);
        setError('No patient ID was provided to the clinical timeline.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const url = new URL(`${window.location.origin}/api/patients/${encodeURIComponent(patientId)}/timeline`);
        url.searchParams.set('limit', '100');
        if (opts?.cursor) url.searchParams.set('cursor', opts.cursor);

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
          signal,
        });

        const body = await response.json().catch(() => null) as { data?: TimelineEvent[]; cursor?: string; error?: string; message?: string } | null;

        if (!response.ok) {
          const apiMessage = body && (body.error || body.message);
          throw new Error(apiMessage || `Unable to load timeline (${response.status}).`);
        }

        const nextEvents: TimelineEvent[] = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
        const nextCursor = body?.cursor;

        setCursor(nextCursor);
        setHasMore(Boolean(nextCursor));

        if (opts?.append) {
          setEvents((prev) => {
            const map = new Map(prev.map((e) => [e.id, e]));
            nextEvents.forEach((e) => map.set(e.id, e));
            return Array.from(map.values());
          });
        } else {
          setEvents(nextEvents);
        }

        // If a deep-linked event id is present in state but not in the initial page,
        // attempt to fetch that single event and include it so the deep link works.
        setSelectedEventId((currentId) => {
          if (currentId && nextEvents.some((event) => event.id === currentId)) return currentId;

          // If a currentId exists but wasn't found, try to fetch it specifically.
          if (currentId) {
            (async () => {
              try {
                const evRes = await fetch(`${window.location.origin}/api/patients/${encodeURIComponent(patientId)}/timeline/${encodeURIComponent(currentId)}`);
                if (evRes.ok) {
                  const evJson = await evRes.json();
                  if (evJson) {
                    setEvents((prev) => {
                      const map = new Map(prev.map((e) => [e.id, e]));
                      map.set(evJson.id, evJson);
                      return Array.from(map.values());
                    });
                  }
                }
              } catch {
                // ignore single-event fetch failures
              }
            })();
          }

          return nextEvents[0]?.id ?? null;
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;

        console.error('Failed to load clinical timeline:', err);

        setEvents([]);
        setSelectedEventId(null);

        setError(err instanceof Error ? err.message : 'An unexpected error occurred while loading the timeline.');
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [patientId],
  );

  /**
   * Initial load
   */
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => { void loadEvents(controller.signal); }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadEvents]);

  const loadMore = useCallback(() => {
    if (!cursor) return;
    const controller = new AbortController();
    loadEvents(controller.signal, { append: true, cursor });
  }, [cursor, loadEvents]);

  const historicalEvents = useMemo(
    () => events.filter((event) => event.temporalState !== 'future'),
    [events],
  );

  const upcomingEvents = useMemo(
    () => events.filter((event) => event.temporalState === 'future'),
    [events],
  );

  const lastEncounterEvent = useMemo(() => {
    return [...historicalEvents]
      .filter((event) => event.eventType === 'encounter' || (event.eventType === 'appointment' && (event.status || '').toLowerCase() === 'completed'))
      .sort((a, b) => (getEventDate(b)?.getTime() || 0) - (getEventDate(a)?.getTime() || 0))[0] || null;
  }, [historicalEvents]);

  const sinceLastVisitDate = lastEncounterEvent?.occurredAt || patientData?.lastVisit || null;

  /**
   * Available event types
   */
  const eventTypes = useMemo(() => {
    return Array.from(
      new Set(historicalEvents.map((event) => getEventType(event))),
    ).sort((a, b) => a.localeCompare(b));
  }, [historicalEvents]);

  function isCriticalEvent(event: TimelineEvent) {
    return (event.severity || '').toLowerCase() === 'critical' || (event.summary || '').toLowerCase().includes('critical');
  }

  const summary = useMemo(() => {
    const total = events.length;
    const critical = historicalEvents.filter((e) => isCriticalEvent(e)).length;
    const abnormal = historicalEvents.filter((e) => (e.severity || '').toLowerCase() === 'abnormal' || ((e.eventType || '').toLowerCase() === 'result' && (e.severity || '').toLowerCase() === 'abnormal')).length;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const last30 = historicalEvents.filter((e) => {
      const d = getEventDate(e);
      return d && d >= cutoff;
    }).length;
    const results = historicalEvents.filter((event) => event.eventType === 'result').length;
    const sinceLastVisit = sinceLastVisitDate ? historicalEvents.filter((event) => (getEventDate(event)?.getTime() || 0) > Date.parse(sinceLastVisitDate)).length : 0;
    return { total, critical, abnormal, last30, results, sinceLastVisit };
  }, [events, historicalEvents, sinceLastVisitDate]);

  /**
   * Search + type + date filtering
   */
  const filteredEvents = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase();

    const cutoff = getRangeCutoff(dateRange);

    return [...historicalEvents]
      .filter((event) => {
        if (eventType !== 'all' && getEventType(event) !== eventType) return false;

        if (criticalOnly && !isCriticalEvent(event)) return false;

        if (cutoff) {
          const date = getEventDate(event);
          if (!date || date < cutoff) return false;
        }

        if (normalizedSearch) {
          const searchableText = [event.title, event.summary, event.eventType, event.status, event.provider?.name, event.source?.display]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (!searchableText.includes(normalizedSearch)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const aTime =
          getEventDate(a)?.getTime() ?? 0;

        const bTime =
          getEventDate(b)?.getTime() ?? 0;

        return bTime - aTime;
      });
  }, [historicalEvents, search, eventType, dateRange, criticalOnly]);

  // Map of event id -> index in filteredEvents for line rendering
  const eventIndexMap = useMemo(() => {
    const m = new Map<string, number>();
    filteredEvents.forEach((e, i) => m.set(e.id, i));
    return m;
  }, [filteredEvents]);

  function getDateGroupLabel(date: Date) {
    const now = new Date();
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = Math.floor((+today - +d) / (24 * 3600 * 1000));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  }

  const groupedEvents = useMemo(() => {
    const groups = new Map<string, TimelineEvent[]>();
    for (const ev of filteredEvents) {
      const dt = getEventDate(ev);
      const label = dt ? getDateGroupLabel(dt) : 'Date unavailable';
      const arr = groups.get(label) || [];
      arr.push(ev);
      groups.set(label, arr);
    }
    return Array.from(groups.entries());
  }, [filteredEvents]);

  function exportCsv() {
    try {
      const headers = ['Date', 'Event Type', 'Title', 'Priority', 'Status', 'Clinician', 'Department', 'Location', 'Summary', 'Source'];
      const rows = filteredEvents.map((e) => {
        const d = getEventDate(e);
        return [d ? d.toISOString() : '', getEventType(e), e.title || '', e.severity || '', e.status || '', e.provider?.name || '', e.organization?.name || '', e.source?.display || '', (e.summary || '').replace(/\n/g, ' '), e.source?.system || ''];
      });

      const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c || '').replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clinical-timeline-${patientId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.push({ message: 'Timeline exported successfully.', level: 'success' });
    } catch {
      toast.push({ message: 'Failed to export timeline.', level: 'error' });
    }
  }

  function copySummary(event: TimelineEvent) {
    try {
      const date = formatEventDate(event);
      const text = `${event.title || ''}\nType: ${getEventType(event)}\nDate: ${date}\nClinician: ${event.provider?.name || ''}\nStatus: ${event.status || ''}\n\n${event.summary || ''}`;
      navigator.clipboard.writeText(text).then(() => {
        toast.push({ message: 'Event summary copied.', level: 'success' });
      }, () => {
        toast.push({ message: 'Unable to copy this event.', level: 'error' });
      });
    } catch {
      toast.push({ message: 'Unable to copy this event.', level: 'error' });
    }
  }

  /**
   * Schedule a new appointment for this patient. The created event is persisted
   * server-side and immediately appears on the timeline alongside past visits.
   */
  async function scheduleAppointment(input: { doctor: string; type: string; date: string; location?: string }) {
    if (!patientId?.trim()) return;
    setScheduling(true);
    try {
      const res = await fetch(`${window.location.origin}/api/patients/${encodeURIComponent(patientId)}/timeline`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error((body && (body.error || body.message)) || 'Unable to schedule appointment.');
      }
      setShowScheduleForm(false);
      await loadEvents();
      if (body?.id) setSelectedEventId(body.id);
      toast.push({ message: 'Appointment scheduled and added to the timeline.', level: 'success' });
    } catch (err) {
      toast.push({ message: err instanceof Error ? err.message : 'Unable to schedule appointment.', level: 'error' });
    } finally {
      setScheduling(false);
    }
  }

  /**
   * Update the status of a timeline event (e.g. mark an appointment completed or
   * cancelled). Completing an appointment also records a companion encounter.
   */
  async function updateEventStatus(event: TimelineEvent, status: string) {
    if (!patientId?.trim()) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`${window.location.origin}/api/patients/${encodeURIComponent(patientId)}/timeline/${encodeURIComponent(event.id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error((body && (body.error || body.message)) || 'Unable to update this event.');
      }
      await loadEvents();
      toast.push({ message: `Marked as ${status.toLowerCase()}.`, level: 'success' });
    } catch (err) {
      toast.push({ message: err instanceof Error ? err.message : 'Unable to update this event.', level: 'error' });
    } finally {
      setUpdatingStatus(false);
    }
  }

  /**
   * Currently selected timeline event
   */
  const selectedEvent = useMemo(() => {
    if (!selectedEventId) {
      return null;
    }

    return (
      events.find(
        (event) => event.id === selectedEventId,
      ) ?? null
    );
  }, [events, selectedEventId]);

  // Sync selected event into the URL so deep links can be shared/bookmarked.
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (selectedEventId) {
        url.searchParams.set('eventId', selectedEventId);
      } else {
        url.searchParams.delete('eventId');
      }
      window.history.replaceState({}, '', url.toString());
    } catch {
      // ignore in non-browser contexts
    }
  }, [selectedEventId]);

  const clearFilters = () => {
    setSearch('');
    setEventType('all');
    setDateRange('all');
    setCriticalOnly(false);
  };

  return (
    <section className="ct-shell">
      {/* ======================================================
          PAGE HEADER
      ====================================================== */}

      <header className="ct-page-header">
        <div>
          <div className="ct-eyebrow">
            Patient record
          </div>

          <h1>Clinical Timeline</h1>

          <p>Encounters, clinical changes, results, medications, documents and care events in chronological order.</p>
        </div>

        <div className="ct-header-actions">
          <div className="ct-count">
            <strong>{events.length}</strong>
            <span>Total events</span>
          </div>

          <button
            type="button"
            className="ct-primary-button"
            onClick={() => setShowScheduleForm(true)}
          >
            + Schedule Appointment
          </button>

          <button
            type="button"
            className="ct-secondary-button"
            disabled={loading}
            onClick={() => loadEvents()}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <Link href={`/dashboard/records/${patientId}/documents`} className="ct-secondary-button ct-link-button">View Documents</Link>
          <div className="ct-more-actions">
            <button type="button" className="ct-secondary-button" aria-haspopup="menu" aria-expanded={showMoreActions} onClick={() => setShowMoreActions((value) => !value)}>More Actions</button>
            {showMoreActions && <div className="ct-more-menu" role="menu"><button type="button" role="menuitem" onClick={() => { setShowMoreActions(false); exportCsv(); }}>Export CSV</button><button type="button" role="menuitem" onClick={() => { setShowMoreActions(false); window.print(); }}>Print timeline</button></div>}
          </div>
        </div>
      </header>

      {showScheduleForm && (
        <ScheduleAppointmentModal
          submitting={scheduling}
          onCancel={() => setShowScheduleForm(false)}
          onSubmit={scheduleAppointment}
        />
      )}

      <section className="ct-since-last" aria-labelledby="since-last-heading">
        <div>
          <div className="ct-eyebrow">Longitudinal context</div>
          <h2 id="since-last-heading">Since Last Visit</h2>
          <p>{sinceLastVisitDate ? `${formatEventDate({ id: 'last-visit', occurredAt: sinceLastVisitDate })} · ${summary.sinceLastVisit} documented events since the last qualifying encounter.` : 'No qualifying completed encounter is documented.'}</p>
          <div className="ct-since-stats"><span>{historicalEvents.filter((event) => event.eventType === 'appointment').length} appointments</span><span>{summary.results} results</span><span>{historicalEvents.filter((event) => event.eventType === 'medication').length} medication events</span><span>{historicalEvents.filter((event) => event.eventType === 'document').length} documents</span></div>
        </div>
        <button type="button" className="ct-secondary-button" onClick={() => setShowSinceSummary(true)}>View Summary</button>
      </section>

      <section className="ct-snapshot-strip" aria-label="Timeline Snapshot">
        <div className="ct-snapshot-card ct-snapshot-teal"><span>Last Encounter</span><strong>{lastEncounterEvent ? formatEventDate(lastEncounterEvent) : '—'}</strong><small>{lastEncounterEvent?.title || 'No completed encounter'}</small></div>
        <div className="ct-snapshot-card ct-snapshot-blue"><span>Events Since Last Visit</span><strong>{summary.sinceLastVisit}</strong><small>Configured clinical history scope</small></div>
        <div className="ct-snapshot-card ct-snapshot-cyan"><span>Results</span><strong>{summary.results}</strong><small>Historical result events</small></div>
        <div className="ct-snapshot-card ct-snapshot-violet"><span>Upcoming Care</span><strong>{upcomingEvents.length}</strong><small>{upcomingEvents.length === 1 ? 'scheduled event' : 'scheduled events'}</small></div>
      </section>

      {upcomingEvents.length > 0 && <section className="ct-upcoming" aria-labelledby="upcoming-heading"><div className="ct-upcoming-heading"><div><div className="ct-eyebrow">Future care</div><h2 id="upcoming-heading">Upcoming</h2><p>Scheduled events remain separate from completed clinical history.</p></div><span className="ct-upcoming-count">{upcomingEvents.length}</span></div><div className="ct-upcoming-list">{upcomingEvents.map((event) => <button key={event.id} type="button" className="ct-upcoming-item" onClick={() => setSelectedEventId(event.id)}><span className="ct-upcoming-icon">◷</span><span className="ct-upcoming-copy"><strong>{event.title || 'Scheduled appointment'}</strong><span>{formatEventDate(event)}{event.provider?.name ? ` · ${event.provider.name}` : ''}</span><small>{event.organization?.name || event.source?.display || 'Scheduling'} · {event.status || 'Scheduled'}</small></span><span className="ct-chevron">›</span></button>)}</div></section>}

      {/* ======================================================
          ERROR STATE
      ====================================================== */}

      {error && (
        <div className="ct-error" role="alert">
          <div>
            <strong>Timeline could not be loaded</strong>
            <p>{error}</p>
          </div>

          <button
            type="button"
            onClick={() => loadEvents()}
          >
            Try again
          </button>
        </div>
      )}

      {/* ======================================================
          MAIN 3-COLUMN WORKSPACE
      ====================================================== */}

      <div className="ct-layout">
        {/* ====================================================
            LEFT: FILTERS
        ==================================================== */}

        <aside className="ct-panel ct-filter-panel">
          <div className="ct-panel-heading">
            <div>
              <h2>Filters</h2>
              <p>Narrow the patient history</p>
            </div>

            <button
              type="button"
              className="ct-text-button"
              onClick={clearFilters}
            >
              Reset
            </button>
          </div>

          <div className="ct-field">
            <label htmlFor="timeline-search">
              Search timeline
            </label>

            <input
              id="timeline-search"
              type="search"
              placeholder="Notes, Medications, Labs..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <label className="ct-checkbox-field">
            <input type="checkbox" checked={criticalOnly} onChange={(event) => setCriticalOnly(event.target.checked)} />
            <span>Only important events</span>
          </label>

          <div className="ct-field">
            <label htmlFor="timeline-range">
              Date range
            </label>

            <select
              id="timeline-range"
              value={dateRange}
              onChange={(event) =>
                setDateRange(
                  event.target.value as DateRange,
                )
              }
            >
              <option value="30d">
                Last 30 days
              </option>

              <option value="6m">
                Last 6 months
              </option>

              <option value="1y">
                Last 12 months
              </option>

              <option value="all">
                Entire record
              </option>
            </select>
          </div>

          <div className="ct-field">
            <label htmlFor="timeline-event-type">
              Event type
            </label>

            <select
              id="timeline-event-type"
              value={eventType}
              onChange={(event) =>
                setEventType(event.target.value)
              }
            >
              <option value="all">
                All event types
              </option>

              {eventTypes.map((type) => (
                <option
                  key={type}
                  value={type}
                >
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="ct-filter-summary">
            <span>Showing</span>

            <strong>
              {filteredEvents.length}
            </strong>

            <span>
              of {events.length} events
            </span>
          </div>
        </aside>

        {/* ====================================================
            CENTER: TIMELINE
        ==================================================== */}

        <main
          className="ct-panel ct-timeline-panel"
          aria-busy={loading}
        >
          <div className="ct-panel-heading">
            <div>
              <h2>Patient history</h2>

              <p>
                Most recent events appear first
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" className="ct-secondary-button" onClick={() => { setDateRange('1y'); clearFilters(); toast.push({ message: 'Filters reset', level: 'info' }); }}>Reset</button>
              <button type="button" className="ct-secondary-button" disabled={loading} onClick={() => loadEvents()}> {loading ? 'Refreshing…' : 'Refresh'}</button>
              <button type="button" className="ct-secondary-button" onClick={() => exportCsv()} >Export</button>
              <button type="button" className="ct-secondary-button" onClick={() => window.print()}>Print</button>
            </div>
          </div>

          {/* Quick filter chips */}
          <div className="ct-quick-filters" style={{ padding: '12px 18px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            {[
              ['All', 'all'],
              ['Encounters', 'encounter'],
              ['Appointments', 'appointment'],
              ['Conditions', 'condition'],
              ['Results', 'result'],
              ['Medications', 'medication'],
              ['Procedures', 'procedure'],
              ['Orders', 'order'],
              ['Referrals', 'referral'],
              ['Documents', 'document'],
              ['Tasks', 'task'],
            ].map(([label, val]) => (
              <button
                key={String(val)}
                type="button"
                className={`ct-filter-chip ${eventType === val ? 'ct-filter-chip-active' : ''}`}
                onClick={() => setEventType(String(val))}
              >
                {label}
              </button>
            ))}
          </div>

          {loading && events.length === 0 ? (
            <div className="ct-loading">
              <div className="ct-skeleton" />
              <div className="ct-skeleton" />
              <div className="ct-skeleton" />
              <div className="ct-skeleton" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="ct-empty">
              <div className="ct-empty-icon">↕</div>

              <h3>No timeline events found</h3>

              <p>There are no events matching the selected filters.</p>

              <button type="button" className="ct-secondary-button" onClick={clearFilters}>Clear filters</button>
            </div>
          ) : (
            <div className="ct-events">
              {groupedEvents.map(([label, items]) => (
                <div key={label} className="mb-4">
                  <div className="text-sm font-medium text-slate-500 mb-2">{label}</div>
                  {items.map((event) => {
                    const isSelected = event.id === selectedEventId;
                    const globalIndex = eventIndexMap.get(event.id) ?? 0;

                    return (
                      <button key={event.id} type="button" className={`ct-event ${isSelected ? 'ct-event-selected' : ''}`} onClick={() => setSelectedEventId(event.id)}>
                        <div className="ct-event-rail">
                          <span className={`ct-event-dot ${isCriticalEvent(event) ? 'bg-rose-500' : ''}`} />
                          {globalIndex !== filteredEvents.length - 1 && <span className="ct-event-line" />}
                        </div>

                        <div className="ct-event-content">
                          <div className="ct-event-top">
                            <span className="ct-event-type">{getEventType(event)}</span>
                            <time>{formatEventDate(event)}</time>
                          </div>

                          <h3>{event.title || 'Untitled clinical event'}</h3>

                          {event.summary && <p>{event.summary}</p>}

                          <div className="ct-event-meta">
                            {event.provider?.name && <span>{event.provider.name}</span>}
                            {event.status && <span>{event.status}</span>}
                            {event.source?.display && <span>{event.source.display}</span>}
                          </div>
                        </div>

                        <div className="ct-chevron">›</div>
                      </button>
                    );
                  })}
                </div>
              ))}

              {hasMore && (
                <div className="mt-3 text-center">
                  <button className="ct-secondary-button" onClick={() => loadMore()}>Load earlier events</button>
                </div>
              )}
            </div>
          )}
        </main>

        {/* ====================================================
            RIGHT: DETAILS
        ==================================================== */}

        <aside className="ct-panel ct-details-panel">
          <div className="ct-panel-heading">
            <div>
              <h2>Event Details</h2>

              <p>
                Selected timeline record
              </p>
            </div>
          </div>

          {!selectedEvent ? (
            <div className="ct-details-empty">
              <div className="ct-details-icon">
                i
              </div>

              <h3>Select an event</h3>

              <p>
                Choose an event from the timeline to
                view its clinical details.
              </p>
            </div>
          ) : (
            <div className="ct-details">
              <span className="ct-event-type">
                {getEventType(selectedEvent)}
              </span>

              <h3>
                {selectedEvent.title ||
                  'Untitled clinical event'}
              </h3>

              <div className="ct-detail-row">
                <span>Date</span>

                <strong>
                  {formatEventDate(
                    selectedEvent,
                  )}
                </strong>
              </div>

              {selectedEvent.status && (
                <div className="ct-detail-row">
                  <span>Status</span>

                  <strong>
                    {selectedEvent.status}
                  </strong>
                </div>
              )}

              {selectedEvent.provider?.name && (
                <div className="ct-detail-row">
                  <span>Clinician</span>

                  <strong>
                    {
                      selectedEvent.provider.name
                    }
                  </strong>
                </div>
              )}

              {selectedEvent.source?.display && (
                <div className="ct-detail-row">
                  <span>Source</span>

                  <strong>
                    {selectedEvent.source.display}
                  </strong>
                </div>
              )}

              {selectedEvent.summary && (
                <div className="ct-detail-section">
                  <span>Clinical summary</span>

                  <p>
                    {selectedEvent.summary}
                  </p>
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" className="ct-primary-button" onClick={() => { if (selectedEvent.recordHref) { router.push(selectedEvent.recordHref); } else { toast.push({ message: 'No linked source record is available for this event.', level: 'warning' }); } }}>Open full record</button>

                <button type="button" className="ct-secondary-button" onClick={() => { copySummary(selectedEvent); }}>Copy summary</button>
              </div>

              {selectedEvent.eventType === 'appointment' && selectedEvent.temporalState !== 'future' && (selectedEvent.status || '').toLowerCase() !== 'completed' && (selectedEvent.status || '').toLowerCase() !== 'cancelled' && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" disabled={updatingStatus} className="ct-primary-button" onClick={() => updateEventStatus(selectedEvent, 'Completed')}>Mark completed</button>

                  <button type="button" disabled={updatingStatus} className="ct-secondary-button" onClick={() => updateEventStatus(selectedEvent, 'Cancelled')}>Cancel appointment</button>
                </div>
              )}
              {selectedEvent.eventType === 'appointment' && selectedEvent.temporalState === 'future' && (selectedEvent.status || '').toLowerCase() !== 'cancelled' && (
                <div className="mt-2">
                  <button type="button" disabled={updatingStatus} className="ct-secondary-button ct-full-button" onClick={() => updateEventStatus(selectedEvent, 'Cancelled')}>Cancel appointment</button>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {showSinceSummary && <SinceLastVisitModal date={sinceLastVisitDate} events={historicalEvents} onClose={() => setShowSinceSummary(false)} />}

      {/* ======================================================
          SELF-CONTAINED STYLES
      ====================================================== */}

      <style>{`
        .ct-shell {
          width: 100%;
          min-height: calc(100vh - 80px);
          box-sizing: border-box;
          padding: 24px;
          background: #f7f9fc;
          color: #182230;
        }

        .ct-shell *,
        .ct-shell *::before,
        .ct-shell *::after {
          box-sizing: border-box;
        }

        .ct-page-header {
          max-width: 1800px;
          margin: 0 auto 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          padding: 22px 24px;
          background: #ffffff;
          border: 1px solid #e6eaf0;
          border-radius: 14px;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
        }

        .ct-eyebrow {
          margin-bottom: 4px;
          color: #667085;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .ct-page-header h1 {
          margin: 0;
          font-size: 24px;
          line-height: 1.25;
          letter-spacing: -0.02em;
        }

        .ct-page-header p {
          max-width: 760px;
          margin: 6px 0 0;
          color: #667085;
          font-size: 14px;
          line-height: 1.5;
        }

        .ct-header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .ct-count {
          min-width: 90px;
          text-align: right;
        }

        .ct-count strong {
          display: block;
          font-size: 18px;
        }

        .ct-count span {
          color: #667085;
          font-size: 12px;
        }

        .ct-layout {
          max-width: 1800px;
          margin: 0 auto;
          display: grid;
          grid-template-columns:
            minmax(220px, 260px)
            minmax(460px, 1fr)
            minmax(280px, 340px);
          gap: 16px;
          align-items: start;
        }

        .ct-panel {
          background: #ffffff;
          border: 1px solid #e6eaf0;
          border-radius: 14px;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
          overflow: hidden;
        }

        .ct-filter-panel,
        .ct-details-panel {
          position: sticky;
          top: 16px;
        }

        .ct-panel-heading {
          min-height: 70px;
          padding: 16px 18px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 1px solid #edf0f4;
        }

        .ct-panel-heading h2 {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
        }

        .ct-panel-heading p {
          margin: 4px 0 0;
          color: #7a8493;
          font-size: 12px;
        }

        .ct-field {
          padding: 15px 18px 0;
        }

        .ct-field label {
          display: block;
          margin-bottom: 7px;
          color: #344054;
          font-size: 12px;
          font-weight: 600;
        }

        .ct-field input,
        .ct-field select {
          width: 100%;
          height: 38px;
          padding: 0 11px;
          border: 1px solid #d7dce3;
          border-radius: 8px;
          outline: none;
          background: #ffffff;
          color: #1d2939;
          font: inherit;
          font-size: 13px;
        }

        .ct-field input:focus,
        .ct-field select:focus {
          border-color: #6b6df6;
          box-shadow: 0 0 0 3px rgba(107, 109, 246, 0.12);
        }

        .ct-filter-summary {
          margin: 18px;
          padding: 12px;
          display: flex;
          justify-content: center;
          align-items: baseline;
          gap: 5px;
          background: #f7f8fb;
          border-radius: 8px;
          color: #667085;
          font-size: 12px;
        }

        .ct-filter-summary strong {
          color: #202939;
          font-size: 16px;
        }

        .ct-text-button {
          padding: 0;
          border: none;
          background: none;
          color: #4f46e5;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
        }

        .ct-events {
          width: 100%;
        }

        .ct-event {
          width: 100%;
          min-height: 112px;
          padding: 0 16px 0 0;
          display: grid;
          grid-template-columns: 48px minmax(0, 1fr) 20px;
          gap: 0;
          border: 0;
          border-bottom: 1px solid #edf0f4;
          background: #ffffff;
          color: inherit;
          text-align: left;
          cursor: pointer;
          transition:
            background 120ms ease,
            box-shadow 120ms ease;
        }

        .ct-event:hover {
          background: #fafbff;
        }

        .ct-event:focus-visible {
          outline: 2px solid #6466f1;
          outline-offset: -2px;
        }

        .ct-event-selected {
          background: #f6f6ff;
          box-shadow: inset 3px 0 0 #5b5fe9;
        }

        .ct-event-rail {
          position: relative;
          display: flex;
          justify-content: center;
        }

        .ct-event-dot {
          position: relative;
          z-index: 2;
          width: 12px;
          height: 12px;
          margin-top: 25px;
          border: 3px solid #ffffff;
          border-radius: 999px;
          background: #6466f1;
          box-shadow: 0 0 0 1px #cfd3ff;
        }

        .ct-event-line {
          position: absolute;
          top: 36px;
          bottom: -25px;
          width: 1px;
          background: #e5e7eb;
        }

        .ct-event-content {
          min-width: 0;
          padding: 19px 0 17px;
        }

        .ct-event-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .ct-event-type {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          min-height: 22px;
          padding: 3px 8px;
          background: #eef0ff;
          border: 1px solid #dfe1ff;
          border-radius: 999px;
          color: #4a4ec7;
          font-size: 11px;
          font-weight: 700;
        }

        .ct-event time {
          flex: 0 0 auto;
          color: #8a94a3;
          font-size: 11px;
        }

        .ct-event h3 {
          margin: 8px 0 0;
          color: #182230;
          font-size: 14px;
          line-height: 1.35;
        }

        .ct-event p {
          display: -webkit-box;
          margin: 5px 0 0;
          overflow: hidden;
          color: #667085;
          font-size: 12px;
          line-height: 1.5;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }

        .ct-event-meta {
          margin-top: 9px;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .ct-event-meta span {
          padding: 2px 6px;
          background: #f4f6f8;
          border-radius: 5px;
          color: #697386;
          font-size: 10px;
        }

        .ct-chevron {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #98a2b3;
          font-size: 22px;
        }

        .ct-details {
          padding: 18px;
        }

        .ct-details h3 {
          margin: 12px 0 18px;
          font-size: 17px;
          line-height: 1.4;
        }

        .ct-detail-row {
          padding: 11px 0;
          display: grid;
          grid-template-columns: 80px 1fr;
          gap: 12px;
          border-bottom: 1px solid #edf0f4;
          font-size: 12px;
        }

        .ct-detail-row span,
        .ct-detail-section > span {
          color: #7b8494;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .ct-detail-row strong {
          color: #344054;
          font-weight: 600;
          text-align: right;
        }

        .ct-detail-section {
          margin-top: 18px;
        }

        .ct-detail-section p {
          margin: 7px 0 0;
          color: #475467;
          font-size: 13px;
          line-height: 1.6;
        }

        .ct-details-empty,
        .ct-empty {
          padding: 50px 24px;
          text-align: center;
        }

        .ct-details-empty {
          min-height: 280px;
        }

        .ct-details-icon,
        .ct-empty-icon {
          width: 38px;
          height: 38px;
          margin: 0 auto 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0f1ff;
          border-radius: 999px;
          color: #5d60dc;
          font-weight: 700;
        }

        .ct-details-empty h3,
        .ct-empty h3 {
          margin: 0;
          font-size: 14px;
        }

        .ct-details-empty p,
        .ct-empty p {
          margin: 7px auto 15px;
          max-width: 280px;
          color: #7a8493;
          font-size: 12px;
          line-height: 1.5;
        }

        .ct-primary-button,
        .ct-secondary-button,
        .ct-error button {
          min-height: 36px;
          padding: 0 13px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 650;
        }

        .ct-primary-button {
          width: 100%;
          margin-top: 20px;
          border: 1px solid #5457de;
          background: #5f62e8;
          color: #ffffff;
        }

        .ct-secondary-button {
          border: 1px solid #d8dde5;
          background: #ffffff;
          color: #344054;
        }

        .ct-secondary-button:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .ct-error {
          max-width: 1800px;
          margin: 0 auto 16px;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          border: 1px solid #f6c7c7;
          border-radius: 10px;
          background: #fff7f7;
        }

        .ct-error strong {
          color: #a83232;
          font-size: 13px;
        }

        .ct-error p {
          margin: 3px 0 0;
          color: #7a4545;
          font-size: 12px;
        }

        .ct-error button {
          flex: 0 0 auto;
          border: 1px solid #e4a9a9;
          background: #ffffff;
          color: #9f3030;
        }

        .ct-quick-filters {
          max-width: 1800px;
          margin: 0 auto 8px;
        }

        .ct-filter-chip {
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid transparent;
          background: #f6f7fb;
          color: #283042;
          font-size: 13px;
          cursor: pointer;
        }

        .ct-filter-chip:focus {
          outline: 2px solid rgba(91,95,233,0.25);
        }

        .ct-filter-chip-active {
          background: #e9eefc;
          border-color: #cbd4ff;
          color: #2b2f7a;
          font-weight: 700;
        }

        .ct-loading {
          padding: 18px;
        }

        .ct-skeleton {
          height: 90px;
          margin-bottom: 10px;
          border-radius: 9px;
          background: linear-gradient(
            90deg,
            #f2f4f7 25%,
            #fafafa 50%,
            #f2f4f7 75%
          );
          background-size: 200% 100%;
          animation: ct-pulse 1.4s infinite;
        }

        .ct-header-actions .ct-primary-button,
        .ct-header-actions .ct-secondary-button,
        .ct-header-actions .ct-link-button {
          width: auto;
          margin-top: 0;
          white-space: nowrap;
        }

        .ct-link-button {
          display: inline-flex;
          align-items: center;
          text-decoration: none;
        }

        .ct-more-actions {
          position: relative;
        }

        .ct-more-menu {
          position: absolute;
          right: 0;
          top: calc(100% + 8px);
          z-index: 20;
          min-width: 180px;
          padding: 6px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: #ffffff;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
        }

        .ct-more-menu button {
          width: 100%;
          padding: 9px 10px;
          border: 0;
          border-radius: 7px;
          background: transparent;
          color: #344054;
          text-align: left;
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          font-weight: 600;
        }

        .ct-more-menu button:hover,
        .ct-more-menu button:focus-visible {
          background: #f8fafc;
          outline: none;
        }

        .ct-since-last {
          max-width: 1800px;
          margin: 14px auto;
          padding: 18px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          border: 1px solid #c8eee9;
          border-radius: 14px;
          background: linear-gradient(110deg, #f0fdfa, #ffffff 70%);
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
        }

        .ct-since-last h2 {
          margin: 2px 0 0;
          color: #0f172a;
          font-size: 18px;
        }

        .ct-since-last p {
          margin: 5px 0 0;
          color: #475467;
          font-size: 13px;
        }

        .ct-since-stats {
          margin-top: 10px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px 14px;
          color: #0f766e;
          font-size: 11px;
          font-weight: 700;
        }

        .ct-snapshot-strip {
          max-width: 1800px;
          margin: 14px auto;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .ct-snapshot-card {
          min-height: 112px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border: 1px solid;
          border-radius: 12px;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.03);
        }

        .ct-snapshot-card span,
        .ct-snapshot-card small {
          color: #667085;
          font-size: 11px;
        }

        .ct-snapshot-card span {
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .ct-snapshot-card strong {
          margin-top: 8px;
          color: #0f172a;
          font-size: 23px;
          line-height: 1.15;
        }

        .ct-snapshot-teal { border-color: #b8ebe4; background: #f0fdfa; }
        .ct-snapshot-blue { border-color: #bfdbfe; background: #eff6ff; }
        .ct-snapshot-cyan { border-color: #bae6fd; background: #f0f9ff; }
        .ct-snapshot-violet { border-color: #ddd6fe; background: #f5f3ff; }

        .ct-upcoming {
          max-width: 1800px;
          margin: 14px auto;
          padding: 18px 20px;
          border: 1px solid #ddd6fe;
          border-radius: 14px;
          background: #faf9ff;
        }

        .ct-upcoming-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
        }

        .ct-upcoming-heading h2 {
          margin: 2px 0 0;
          color: #1e1b4b;
          font-size: 18px;
        }

        .ct-upcoming-heading p {
          margin: 5px 0 0;
          color: #6b7280;
          font-size: 13px;
        }

        .ct-upcoming-count {
          min-width: 32px;
          height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: #ede9fe;
          color: #6d28d9;
          font-size: 13px;
          font-weight: 800;
        }

        .ct-upcoming-list {
          margin-top: 14px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 10px;
        }

        .ct-upcoming-item {
          min-height: 76px;
          padding: 12px;
          display: flex;
          align-items: center;
          gap: 11px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          background: #ffffff;
          text-align: left;
          cursor: pointer;
        }

        .ct-upcoming-item:hover,
        .ct-upcoming-item:focus-visible {
          border-color: #a78bfa;
          outline: none;
          box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.14);
        }

        .ct-upcoming-icon {
          width: 30px;
          height: 30px;
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          background: #ede9fe;
          color: #7c3aed;
          font-size: 19px;
        }

        .ct-upcoming-copy {
          min-width: 0;
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 3px;
        }

        .ct-upcoming-copy strong { color: #1f2937; font-size: 13px; }
        .ct-upcoming-copy span { color: #374151; font-size: 12px; }
        .ct-upcoming-copy small { color: #6b7280; font-size: 11px; }

        .ct-checkbox-field {
          margin: 16px 18px 0;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #475467;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .ct-checkbox-field input { width: 15px; height: 15px; accent-color: #0f766e; }

        .ct-full-button { width: 100%; }

        .ct-icon-button {
          width: 38px;
          height: 38px;
          border: 1px solid #e2e8f0;
          border-radius: 9px;
          background: #ffffff;
          color: #64748b;
          cursor: pointer;
          font-size: 22px;
        }

        .ct-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 50;
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(15, 23, 42, 0.32);
        }

        .ct-summary-modal {
          width: min(100%, 680px);
          max-height: 90vh;
          overflow-y: auto;
          padding: 24px;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          background: #ffffff;
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.2);
        }

        .ct-summary-modal-header,
        .ct-summary-footer { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
        .ct-summary-modal-header h2 { margin: 2px 0 0; color: #0f172a; font-size: 20px; }
        .ct-summary-modal-header p { margin: 5px 0 0; color: #64748b; font-size: 13px; }
        .ct-summary-grid { margin-top: 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 10px; }
        .ct-summary-grid div { padding: 13px; border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc; }
        .ct-summary-grid strong { display: block; color: #0f172a; font-size: 21px; }
        .ct-summary-grid span { display: block; margin-top: 4px; color: #64748b; font-size: 11px; font-weight: 700; text-transform: capitalize; }
        .ct-summary-list { margin-top: 20px; display: grid; gap: 8px; }
        .ct-summary-list button { padding: 11px 12px; display: grid; grid-template-columns: 80px minmax(0, 1fr); gap: 7px 12px; border: 1px solid #edf0f4; border-radius: 9px; background: #ffffff; text-align: left; cursor: pointer; }
        .ct-summary-list button:hover { background: #f8fafc; }
        .ct-summary-list span { color: #0f766e; font-size: 10px; font-weight: 800; text-transform: uppercase; }
        .ct-summary-list strong { color: #1f2937; font-size: 13px; }
        .ct-summary-list small { grid-column: 2; color: #64748b; font-size: 11px; }
        .ct-summary-list p { padding: 16px; color: #64748b; font-size: 13px; text-align: center; }
        .ct-summary-footer { margin-top: 20px; padding-top: 16px; border-top: 1px solid #edf0f4; justify-content: flex-end; }

        @keyframes ct-pulse {
          0% {
            background-position: 200% 0;
          }

          100% {
            background-position: -200% 0;
          }
        }

        @media (max-width: 1180px) {
          .ct-layout {
            grid-template-columns:
              minmax(210px, 240px)
              minmax(0, 1fr);
          }

          .ct-details-panel {
            position: static;
            grid-column: 1 / -1;
          }

          .ct-snapshot-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        @media (max-width: 780px) {
          .ct-shell {
            padding: 12px;
          }

          .ct-header-actions { flex-wrap: wrap; gap: 8px; }
          .ct-header-actions .ct-count { flex: 1 0 100%; }
          .ct-since-last { align-items: flex-start; flex-direction: column; }
          .ct-snapshot-strip { grid-template-columns: 1fr; }
          .ct-upcoming-list { grid-template-columns: 1fr; }
          .ct-summary-modal { padding: 18px; }

          .ct-page-header {
            padding: 18px;
            align-items: flex-start;
            flex-direction: column;
          }

          .ct-header-actions {
            width: 100%;
            justify-content: space-between;
          }

          .ct-count {
            text-align: left;
          }

          .ct-layout {
            grid-template-columns: 1fr;
          }

          .ct-filter-panel,
          .ct-details-panel {
            position: static;
          }

          .ct-details-panel {
            grid-column: auto;
          }

          .ct-event {
            grid-template-columns: 38px minmax(0, 1fr) 16px;
          }

          .ct-event-top {
            align-items: flex-start;
            flex-direction: column;
            gap: 5px;
          }
        }
      `}</style>
    </section>
  );
}

function SinceLastVisitModal({ date, events, onClose }: { date: string | null; events: TimelineEvent[]; onClose: () => void }) {
  const cutoff = date ? Date.parse(date) : NaN;
  const changes = events.filter((event) => Number.isFinite(cutoff) && (getEventDate(event)?.getTime() || 0) > cutoff);
  const counts = Array.from(new Set(changes.map((event) => getEventType(event)))).map((type) => ({ type, count: changes.filter((event) => getEventType(event) === type).length }));

  return (
    <div className="ct-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="ct-summary-modal" role="dialog" aria-modal="true" aria-labelledby="since-last-modal-title">
        <div className="ct-summary-modal-header">
          <div>
            <div className="ct-eyebrow">Longitudinal context</div>
            <h2 id="since-last-modal-title">Since Last Visit</h2>
            <p>{date ? formatEventDate({ id: 'summary-date', occurredAt: date }) : 'No qualifying completed encounter is documented.'}</p>
          </div>
          <button type="button" className="ct-icon-button" aria-label="Close summary" onClick={onClose}>×</button>
        </div>
        <div className="ct-summary-grid">
          <div><strong>{changes.length}</strong><span>documented events</span></div>
          {counts.slice(0, 5).map((item) => <div key={item.type}><strong>{item.count}</strong><span>{item.type}</span></div>)}
        </div>
        <div className="ct-summary-list">
          {changes.slice(0, 8).map((event) => <button key={event.id} type="button" onClick={onClose}><span>{getEventType(event)}</span><strong>{event.title}</strong><small>{formatEventDate(event)}{event.provider?.name ? ` · ${event.provider.name}` : ''}</small></button>)}
          {changes.length === 0 && <p>No clinically meaningful changes are documented after the last qualifying visit.</p>}
        </div>
        <div className="ct-summary-footer"><button type="button" className="ct-secondary-button" onClick={onClose}>Close</button></div>
      </section>
    </div>
  );
}

function ScheduleAppointmentModal({
  submitting,
  onCancel,
  onSubmit,
}: {
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (input: { doctor: string; type: string; date: string; location?: string }) => void;
}) {
  const [doctor, setDoctor] = useState('');
  const [type, setType] = useState('Follow-up');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!doctor.trim() || !type.trim() || !date) return;
    onSubmit({ doctor: doctor.trim(), type: type.trim(), date, location: location.trim() || undefined });
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white w-full md:w-[480px] rounded-t-lg md:rounded-lg p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-slate-900">Schedule Appointment</h3>
        <p className="text-sm text-slate-500 mt-1">This will appear immediately in the patient&apos;s timeline.</p>

        <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-3">
          <label className="block">
            <div className="text-xs text-gray-500">Provider</div>
            <input value={doctor} onChange={(e) => setDoctor(e.target.value)} placeholder="Dr. Aris Thorne" className="mt-1 w-full border rounded px-3 py-2" required />
          </label>

          <label className="block">
            <div className="text-xs text-gray-500">Appointment type</div>
            <input value={type} onChange={(e) => setType(e.target.value)} placeholder="Follow-up" className="mt-1 w-full border rounded px-3 py-2" required />
          </label>

          <label className="block">
            <div className="text-xs text-gray-500">Date & time</div>
            <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" required />
          </label>

          <label className="block">
            <div className="text-xs text-gray-500">Location (optional)</div>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Toronto Cardiology Clinic" className="mt-1 w-full border rounded px-3 py-2" />
          </label>

          <div className="flex items-center gap-2 mt-2">
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-teal-600 text-white rounded disabled:opacity-60">{submitting ? 'Scheduling…' : 'Schedule'}</button>
            <button type="button" onClick={onCancel} className="px-4 py-2 border rounded">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
