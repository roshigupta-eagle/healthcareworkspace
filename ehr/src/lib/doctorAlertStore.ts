import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { resolveDataPath } from '@/lib/dataPath';

const ACKNOWLEDGEMENTS_FILE = resolveDataPath('doctor_alert_acknowledgements.json');

type AlertAcknowledgement = {
  key: string;
  alertId: string;
  sourceSystem: string;
  acknowledgedBy: { id: string; name: string };
  acknowledgedAt: string;
  correlationId: string;
};

let writeQueue = Promise.resolve();

async function readAll(): Promise<AlertAcknowledgement[]> {
  try {
    const raw = await fs.readFile(ACKNOWLEDGEMENTS_FILE, 'utf8');
    const parsed: unknown = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is AlertAcknowledgement => Boolean(item && typeof item === 'object' && typeof (item as { key?: unknown }).key === 'string')) : [];
  } catch {
    return [];
  }
}

async function writeAll(items: AlertAcknowledgement[]) {
  await fs.mkdir(path.dirname(ACKNOWLEDGEMENTS_FILE), { recursive: true });
  const temporaryFile = `${ACKNOWLEDGEMENTS_FILE}.${process.pid}.tmp`;
  await fs.writeFile(temporaryFile, JSON.stringify(items, null, 2), 'utf8');
  await fs.rename(temporaryFile, ACKNOWLEDGEMENTS_FILE);
}

function keyFor(alertId: string, sourceSystem: string) {
  return `${sourceSystem}:${alertId}`;
}

export async function listAlertAcknowledgements() {
  return readAll();
}

export async function acknowledgeDoctorAlert(input: { alertId: string; sourceSystem: string; actorId: string; actorName: string; correlationId?: string }) {
  const correlationId = input.correlationId || randomUUID();
  const acknowledgement: AlertAcknowledgement = {
    key: keyFor(input.alertId, input.sourceSystem),
    alertId: input.alertId,
    sourceSystem: input.sourceSystem,
    acknowledgedBy: { id: input.actorId, name: input.actorName },
    acknowledgedAt: new Date().toISOString(),
    correlationId,
  };
  let result = acknowledgement;
  const operation = async () => {
    const items = await readAll();
    const existing = items.find((item) => item.key === acknowledgement.key);
    if (existing) { result = existing; return; }
    await writeAll([...items, acknowledgement]);
  };
  const previous = writeQueue;
  let release!: () => void;
  writeQueue = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try { await operation(); } finally { release(); }
  return result;
}
