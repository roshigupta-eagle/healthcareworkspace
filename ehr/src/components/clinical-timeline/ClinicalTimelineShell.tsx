'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';

type DateRange = '30d' | '6m' | '1y' | 'all';

type TimelineEvent = {
  id: string;
  title?: string | null;
  eventType?: string | null;
  occurredAt?: string | null;
  recordedAt?: string | null;
  summary?: string | null;

  // Optional fields. These will automatically display if your API provides them.
  status?: string | null;
  clinicianName?: string | null;
  source?: string | null;
};

type TimelineApiResponse = {
  data?: TimelineEvent[];
  error?: string;
  message?: string;
};

interface ClinicalTimelineShellProps {
  patientId: string;
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

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
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
}: ClinicalTimelineShellProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedEventId, setSelectedEventId] =
    useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>('1y');
  const [eventType, setEventType] = useState('all');
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const announcerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

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

        const body: any = await response.json().catch(() => null);

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

        setSelectedEventId((currentId) => {
          if (currentId && nextEvents.some((event) => event.id === currentId)) return currentId;
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

    loadEvents(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadEvents]);

  const loadMore = useCallback(() => {
    if (!cursor) return;
    const controller = new AbortController();
    loadEvents(controller.signal, { append: true, cursor });
  }, [cursor, loadEvents]);

  /**
   * Available event types
   */
  const eventTypes = useMemo(() => {
    return Array.from(
      new Set(events.map((event) => getEventType(event))),
    ).sort((a, b) => a.localeCompare(b));
  }, [events]);

  function isCriticalEvent(event: TimelineEvent) {
    return (event.severity || '').toLowerCase() === 'critical' || (event.summary || '').toLowerCase().includes('critical');
  }

  const summary = useMemo(() => {
    const total = events.length;
    const critical = events.filter((e) => isCriticalEvent(e)).length;
    const abnormal = events.filter((e) => (e.severity || '').toLowerCase() === 'abnormal' || ((e.eventType || '').toLowerCase() === 'result' && (e.severity || '').toLowerCase() === 'abnormal')).length;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const last30 = events.filter((e) => {
      const d = getEventDate(e);
      return d && d >= cutoff;
    }).length;
    return { total, critical, abnormal, last30 };
  }, [events]);

  /**
   * Search + type + date filtering
   */
  const filteredEvents = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase();

    const cutoff = getRangeCutoff(dateRange);

    return [...events]
      .filter((event) => {
        if (eventType !== 'all' && getEventType(event) !== eventType) return false;

        if (criticalOnly && !isCriticalEvent(event)) return false;

        if (cutoff) {
          const date = getEventDate(event);
          if (!date || date < cutoff) return false;
        }

        if (normalizedSearch) {
          const searchableText = [event.title, event.summary, event.eventType, event.status, event.clinicianName, event.source]
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
  }, [events, search, eventType, dateRange]);

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
        return [d ? d.toISOString() : '', getEventType(e), e.title || '', (e.severity || '') as any, e.status || '', e.clinicianName || '', e.organization?.name || '', e.source?.display || '', (e.summary || '').replace(/\n/g, ' '), e.source?.system || ''];
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
    } catch (err) {
      toast.push({ message: 'Failed to export timeline.', level: 'error' });
    }
  }

  function copySummary(event: TimelineEvent) {
    try {
      const date = formatEventDate(event);
      const text = `${event.title || ''}\nType: ${getEventType(event)}\nDate: ${date}\nClinician: ${event.clinicianName || ''}\nStatus: ${event.status || ''}\n\n${event.summary || ''}`;
      navigator.clipboard.writeText(text).then(() => {
        toast.push({ message: 'Event summary copied.', level: 'success' });
      }, () => {
        toast.push({ message: 'Unable to copy this event.', level: 'error' });
      });
    } catch (err) {
      toast.push({ message: 'Unable to copy this event.', level: 'error' });
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

  const clearFilters = () => {
    setSearch('');
    setEventType('all');
    setDateRange('1y');
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

          <p>
            Review encounters, results, medications,
            documents, notes, and other clinical events in
            chronological order.
          </p>
        </div>

        <div className="ct-header-actions">
          <div className="ct-count">
            <strong>{events.length}</strong>
            <span>Total events</span>
          </div>

          <button
            type="button"
            className="ct-secondary-button"
            disabled={loading}
            onClick={() => loadEvents()}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

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
              placeholder="Notes, medications, labs..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

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
                  {items.map((event, idx) => {
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
                            {event.clinicianName && <span>{event.clinicianName}</span>}
                            {event.status && <span>{event.status}</span>}
                            {event.source && <span>{event.source}</span>}
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

              {selectedEvent.clinicianName && (
                <div className="ct-detail-row">
                  <span>Clinician</span>

                  <strong>
                    {
                      selectedEvent.clinicianName
                    }
                  </strong>
                </div>
              )}

              {selectedEvent.source && (
                <div className="ct-detail-row">
                  <span>Source</span>

                  <strong>
                    {selectedEvent.source}
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
            </div>
          )}
        </aside>
      </div>

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
        }

        @media (max-width: 780px) {
          .ct-shell {
            padding: 12px;
          }

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