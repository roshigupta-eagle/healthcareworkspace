import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { ClinicalTask, ClinicalTaskHistoryEntry } from "@/types/clinicalTask";
import { resolveDataPath } from "@/lib/dataPath";

const TASKS_FILE = resolveDataPath('tasks.json');
const AUDIT_FILE = resolveDataPath('audit.json');
const DATA_DIR = path.dirname(TASKS_FILE);
const LEGACY_TASKS_FILE = path.join(DATA_DIR, '..', 'ehr', 'data', 'tasks.json');
const WRITE_LOCK_FILE = `${TASKS_FILE}.lock`;
let writeQueue = Promise.resolve();
let migrationPromise: Promise<void> | null = null;

function parseJson<T>(raw: string, fallback: T): T {
  try { return JSON.parse(raw.replace(/^\uFEFF/, '')) as T; } catch { return fallback; }
}

async function ensureData() {
  if (migrationPromise) {
    await migrationPromise;
    return;
  }
  migrationPromise = migrateLegacyData();
  await migrationPromise;
}

async function migrateLegacyData() {
  const lockToken = await acquireFileLock();
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try { await fs.access(TASKS_FILE); } catch { await fs.writeFile(TASKS_FILE, JSON.stringify({}, null, 2)); }
    try { await fs.access(AUDIT_FILE); } catch { await fs.writeFile(AUDIT_FILE, JSON.stringify([], null, 2)); }
    if (path.resolve(LEGACY_TASKS_FILE) === path.resolve(TASKS_FILE)) return;
    try {
      const [currentRaw, legacyRaw] = await Promise.all([fs.readFile(TASKS_FILE, 'utf8'), fs.readFile(LEGACY_TASKS_FILE, 'utf8')]);
      const current = parseJson<Record<string, ClinicalTask[]>>(currentRaw || '{}', {});
      const legacy = parseJson<Record<string, ClinicalTask[]>>(legacyRaw || '{}', {});
      let changed = false;
      for (const [patientId, legacyTasks] of Object.entries(legacy)) {
        const existingIds = new Set((current[patientId] || []).map((task) => task.id));
        const missing = legacyTasks.filter((task) => !existingIds.has(task.id));
        if (missing.length) {
          current[patientId] = [...(current[patientId] || []), ...missing];
          changed = true;
        }
      }
      if (changed) await fs.writeFile(TASKS_FILE, JSON.stringify(current, null, 2), 'utf8');
    } catch {
      // The canonical store remains usable if an older local store is absent or malformed.
    }
  } finally {
    await releaseFileLock(lockToken);
  }
}

async function readAll(): Promise<Record<string, ClinicalTask[]>> {
  await ensureData();
  const raw = await fs.readFile(TASKS_FILE, 'utf8');
  return parseJson<Record<string, ClinicalTask[]>>(raw || '{}', {});
}

async function writeAll(data: Record<string, ClinicalTask[]>) {
  const temporaryFile = `${TASKS_FILE}.${process.pid}.tmp`;
  await fs.writeFile(temporaryFile, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(temporaryFile, TASKS_FILE);
}

async function withWriteLock<T>(operation: () => Promise<T>) {
  const previous = writeQueue;
  let release!: () => void;
  writeQueue = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  const lockToken = await acquireFileLock();
  try { return await operation(); } finally { await releaseFileLock(lockToken); release(); }
}

async function acquireFileLock() {
  const token = `${process.pid}:${randomUUID()}`;
  for (;;) {
    try {
      await fs.writeFile(WRITE_LOCK_FILE, token, { encoding: 'utf8', flag: 'wx' });
      return token;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      try {
        const lockStats = await fs.stat(WRITE_LOCK_FILE);
        if (Date.now() - lockStats.mtimeMs > 30_000) await fs.rm(WRITE_LOCK_FILE, { force: true });
      } catch {
        // Another writer may have released the lock between stat and cleanup.
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
}

async function releaseFileLock(token: string) {
  try {
    if ((await fs.readFile(WRITE_LOCK_FILE, 'utf8')) === token) await fs.rm(WRITE_LOCK_FILE, { force: true });
  } catch {
    // The lock may already have been recovered after a process failure.
  }
}

export async function listTasks(patientId: string): Promise<ClinicalTask[]> {
  const all = await readAll();
  return all[patientId] ? all[patientId].slice().sort((a,b)=> (a.dueDate||'').localeCompare(b.dueDate||'')) : [];
}

export async function listAllTasks(): Promise<Record<string, ClinicalTask[]>> {
  return readAll();
}

export async function getTask(patientId: string, taskId: string): Promise<ClinicalTask | null> {
  const tasks = await listTasks(patientId);
  return tasks.find(t => t.id === taskId) || null;
}

export async function createTask(patientId: string, input: Partial<ClinicalTask>, author?: { id?: string; name?: string; role?: string }): Promise<ClinicalTask> {
  return withWriteLock(async () => {
    const all = await readAll();
    const tasks = all[patientId] || [];
    const id = input.id || randomUUID();
    const existing = tasks.find((task) => task.id === String(id));
    if (existing) return existing;
    const now = new Date().toISOString();
    const newTask: ClinicalTask = {
      id: String(id),
      patientId,
      title: input.title || 'Untitled Task',
      description: input.description || '',
      category: input.category || 'Follow-up',
      priority: input.priority || 'normal',
      status: input.status || 'requested',
      startDate: input.startDate || null,
      dueDate: input.dueDate || null,
      reminderDate: input.reminderDate || null,
      requester: input.requester || (author ? { id: author.id, name: author.name } : null),
      assignee: input.assignee || null,
      assignedTeam: input.assignedTeam || null,
      relatedResources: input.relatedResources || [],
      dependencies: input.dependencies || [],
      history: input.history || [],
      createdAt: now,
      updatedAt: now,
      closedAt: null,
    };
    tasks.push(newTask);
    all[patientId] = tasks;
    await writeAll(all);
    await appendAudit({ event: 'task.created', taskId: newTask.id, patientId, timestamp: now, actor: author || null });
    return newTask;
  });
}

export async function updateTask(patientId: string, taskId: string, patch: Partial<ClinicalTask>, actor?: { id?: string; name?: string; role?: string }, expectedUpdatedAt?: string): Promise<ClinicalTask | null> {
  return withWriteLock(async () => {
    const all = await readAll();
    const tasks = all[patientId] || [];
    const idx = tasks.findIndex((task) => task.id === taskId);
    if (idx === -1) return null;
    const existing = tasks[idx];
    if (expectedUpdatedAt && existing.updatedAt !== expectedUpdatedAt) throw new Error('TASK_VERSION_CONFLICT');
    const now = new Date().toISOString();
    const historyEntry: ClinicalTaskHistoryEntry = {
      id: `h-${Date.now()}`,
      action: 'updated',
      userId: actor?.id,
      userName: actor?.name,
      role: actor?.role,
      timestamp: now,
      details: { patch },
    };
    const updated: ClinicalTask = { ...existing, ...patch, updatedAt: now, history: [...(existing.history || []), historyEntry] };
    tasks[idx] = updated;
    all[patientId] = tasks;
    await writeAll(all);
    await appendAudit({ event: 'task.updated', taskId, patientId, timestamp: now, actor: actor || null, details: { patch } });
    return updated;
  });
}

export async function addTaskNote(patientId: string, taskId: string, body: string, actor?: { id?: string; name?: string; role?: string }): Promise<ClinicalTask | null> {
  return withWriteLock(async () => {
    const all = await readAll();
    const tasks = all[patientId] || [];
    const idx = tasks.findIndex((task) => task.id === taskId);
    if (idx === -1) return null;
    const now = new Date().toISOString();
    const existing = tasks[idx];
    const historyEntry: ClinicalTaskHistoryEntry = {
      id: `h-${Date.now()}`,
      action: 'note-added',
      userId: actor?.id,
      userName: actor?.name,
      role: actor?.role,
      timestamp: now,
      details: { body },
    };
    const updated: ClinicalTask = { ...existing, updatedAt: now, history: [...(existing.history || []), historyEntry] };
    tasks[idx] = updated;
    all[patientId] = tasks;
    await writeAll(all);
    await appendAudit({ event: 'task.note-added', taskId, patientId, timestamp: now, actor: actor || null });
    return updated;
  });
}

export async function deleteTask(patientId: string, taskId: string, actor?: { id?: string; name?: string; role?: string }): Promise<boolean> {
  return withWriteLock(async () => {
    const all = await readAll();
    const tasks = all[patientId] || [];
    const remaining = tasks.filter((task) => task.id !== taskId);
    if (remaining.length === tasks.length) return false;
    all[patientId] = remaining;
    await writeAll(all);
    await appendAudit({ event: 'task.deleted', taskId, patientId, timestamp: new Date().toISOString(), actor: actor || null });
    return true;
  });
}

export async function appendAudit(event: unknown) {
  await ensureData();
  let events: unknown[] = [];
  try {
    const raw = await fs.readFile(AUDIT_FILE, 'utf8');
    const parsed: unknown = parseJson<unknown>(raw || '[]', []);
    events = Array.isArray(parsed) ? parsed : [];
  } catch {
    events = [];
  }
  events.push(event);
  const temporaryFile = `${AUDIT_FILE}.${process.pid}.tmp`;
  await fs.writeFile(temporaryFile, JSON.stringify(events, null, 2), 'utf8');
  await fs.rename(temporaryFile, AUDIT_FILE);
}

// Minimal FHIR Task mapper
export function mapToFhirTask(task: ClinicalTask) {
  const status = task.status || 'requested';
  const priority = task.priority === 'urgent' ? 'stat' : task.priority === 'high' ? 'urgent' : 'routine';
  const related = task.relatedResources || [];
  const focus = related[0];
  const focusType = focus?.type === 'DoctorNote' || focus?.type === 'ClinicalNote' ? 'DocumentReference' : focus?.type === 'HealthConcern' ? 'Condition' : focus?.type;
  const fhir: Record<string, unknown> = {
    resourceType: 'Task',
    id: task.id,
    status,
    intent: 'order',
    priority,
    code: { text: task.title },
    focus: focus && focusType ? { reference: `${focusType}/${focus.id}`, display: focus.display } : undefined,
    basedOn: related.slice(1).map((resource) => ({ reference: `${resource.type}/${resource.id}`, display: resource.display })),
    description: task.description,
    for: { reference: `Patient/${task.patientId}` },
    authoredOn: task.createdAt,
    lastModified: task.updatedAt,
    requester: task.requester ? { display: task.requester.name, reference: `Practitioner/${task.requester.id}` } : undefined,
    owner: task.assignee ? { reference: `Practitioner/${task.assignee.id}`, display: task.assignee.name } : undefined,
    restriction: task.dueDate ? { period: { end: task.dueDate } } : undefined,
    note: task.history ? task.history.map(h=>({ text: `${h.action} by ${h.userName || h.userId || 'system'}: ${JSON.stringify(h.details||'')}` })) : undefined,
  };
  return fhir;
}
