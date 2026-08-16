import fs from 'fs';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'ehr', 'data', 'care_gaps.json');

export async function readCareGapsRaw(): Promise<any> {
  try {
    const raw = await fs.promises.readFile(DATA_PATH, 'utf-8');
    return JSON.parse(raw || '{}');
  } catch (e) {
    return { items: [] };
  }
}

export type ListOpts = {
  status?: string;
  category?: string;
  cursor?: string;
  limit?: number;
};

export async function listCareGaps(patientId: string, opts: ListOpts = {}) {
  const data = await readCareGapsRaw();
  const all: any[] = Array.isArray(data.items) ? data.items : [];
  const patientItems = all.filter((i) => i.patientId === String(patientId));

  const summary = {
    critical: patientItems.filter((i) => (i.status || '').toLowerCase() === 'critical').length,
    overdue: patientItems.filter((i) => (i.status || '').toLowerCase() === 'overdue').length,
    dueSoon: patientItems.filter((i) => (i.status || '').toLowerCase() === 'due-soon' || (i.status || '').toLowerCase() === 'due soon').length,
    recommended: patientItems.filter((i) => (i.status || '').toLowerCase() === 'recommended').length,
  };

  let items = patientItems.slice();
  if (opts.status) {
    const s = opts.status.toLowerCase();
    if (s === 'due-soon' || s === 'due soon') {
      items = items.filter((i) => (i.status || '').toLowerCase() === 'due-soon' || (i.status || '').toLowerCase() === 'due soon');
    } else {
      items = items.filter((i) => (i.status || '').toLowerCase() === s);
    }
  }
  if (opts.category) {
    const c = opts.category.toLowerCase();
    items = items.filter((i) => (i.category || '').toLowerCase() === c);
  }

  // Basic cursor/limit support (cursor is the last item's id)
  if (opts.cursor) {
    const idx = items.findIndex((it) => it.id === opts.cursor);
    if (idx >= 0) items = items.slice(idx + 1);
  }
  const limit = opts.limit || 200;
  const sliced = items.slice(0, limit);

  return { summary, items: sliced };
}
