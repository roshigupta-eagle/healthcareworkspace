/**
 * Defensive rendering helpers for clinical concepts that may arrive as plain
 * strings OR structured objects (e.g. FHIR-ish `{ code, display }`, or mock
 * records like `{ title, status }`). Never render a bare object into JSX —
 * always resolve it to a human-readable string first.
 */

export function toDisplayLabel(value: unknown, fallback = 'Unknown'): string {
  if (value == null) return fallback;
  if (typeof value === 'string') return value.trim() || fallback;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const candidate = record.display ?? record.title ?? record.name ?? record.label ?? record.text ?? record.code;
    if (typeof candidate === 'string' && candidate.trim()) return candidate;
  }
  return fallback;
}

export function toDisplayList(values: unknown[] | undefined | null): string[] {
  if (!Array.isArray(values)) return [];
  return values.map((v) => toDisplayLabel(v)).filter((v) => v && v !== 'Unknown');
}

/** Extracts an optional status/badge string from a clinical concept, string or object alike. */
export function toDisplayStatus(value: unknown): string | undefined {
  if (value && typeof value === 'object') {
    const status = (value as Record<string, unknown>).status;
    if (typeof status === 'string' && status.trim()) return status;
  }
  return undefined;
}
