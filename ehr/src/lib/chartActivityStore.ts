import fs from 'fs/promises';
import path from 'path';
import { resolveDataPath } from '@/lib/dataPath';
import type { ChartActivityEvent } from '@/lib/chartActivity';

const ACTIVITY_FILE = resolveDataPath('chart_activity.json');

async function readAll(): Promise<ChartActivityEvent[]> {
  try {
    const raw = await fs.readFile(ACTIVITY_FILE, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

async function writeAll(items: ChartActivityEvent[]) {
  await fs.mkdir(path.dirname(ACTIVITY_FILE), { recursive: true });
  await fs.writeFile(ACTIVITY_FILE, JSON.stringify({ items }, null, 2), 'utf8');
}

export async function listStoredChartActivity(patientId: string) {
  return (await readAll()).filter((event) => String(event.patientId) === String(patientId));
}

export async function appendChartActivity(event: ChartActivityEvent) {
  const all = await readAll();
  if (event.correlationKey && all.some((item) => item.correlationKey === event.correlationKey)) return all.find((item) => item.correlationKey === event.correlationKey) || event;
  if (all.some((item) => item.id === event.id)) return all.find((item) => item.id === event.id) || event;
  all.push(event);
  await writeAll(all);
  return event;
}