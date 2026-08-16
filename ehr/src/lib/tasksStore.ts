import fs from "fs/promises";
import path from "path";
import { ClinicalTask, ClinicalTaskHistoryEntry } from "@/types/clinicalTask";

const DATA_DIR = path.join(process.cwd(), 'ehr', 'data');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const AUDIT_FILE = path.join(DATA_DIR, 'audit.json');

async function ensureData() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try { await fs.access(TASKS_FILE); } catch { await fs.writeFile(TASKS_FILE, JSON.stringify({}, null, 2)); }
  try { await fs.access(AUDIT_FILE); } catch { await fs.writeFile(AUDIT_FILE, JSON.stringify([], null, 2)); }
}

async function readAll(): Promise<Record<string, ClinicalTask[]>> {
  await ensureData();
  const raw = await fs.readFile(TASKS_FILE, 'utf8');
  try { return JSON.parse(raw || '{}'); } catch { return {}; }
}

async function writeAll(data: Record<string, ClinicalTask[]>) {
  await fs.writeFile(TASKS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

export async function listTasks(patientId: string): Promise<ClinicalTask[]> {
  const all = await readAll();
  return all[patientId] ? all[patientId].slice().sort((a,b)=> (a.dueDate||'').localeCompare(b.dueDate||'')) : [];
}

export async function getTask(patientId: string, taskId: string): Promise<ClinicalTask | null> {
  const tasks = await listTasks(patientId);
  return tasks.find(t => t.id === taskId) || null;
}

export async function createTask(patientId: string, input: Partial<ClinicalTask>, author?: { id?: string; name?: string; role?: string }): Promise<ClinicalTask> {
  const all = await readAll();
  const tasks = all[patientId] || [];
  const id = input.id || (crypto && (crypto as any).randomUUID ? (crypto as any).randomUUID() : 't' + Date.now());
  const now = new Date().toISOString();
  const newTask: ClinicalTask = {
    id: String(id),
    patientId,
    title: input.title || 'Untitled Task',
    description: input.description || '',
    category: input.category || 'Follow-up',
    priority: (input.priority as any) || 'normal',
    status: (input.status as any) || 'requested',
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
}

export async function updateTask(patientId: string, taskId: string, patch: Partial<ClinicalTask>, actor?: { id?: string; name?: string; role?: string }): Promise<ClinicalTask | null> {
  const all = await readAll();
  const tasks = all[patientId] || [];
  const idx = tasks.findIndex(t => t.id === taskId);
  if (idx === -1) return null;
  const existing = tasks[idx];
  const updated: ClinicalTask = { ...existing, ...patch, updatedAt: new Date().toISOString() };
  tasks[idx] = updated;
  all[patientId] = tasks;
  await writeAll(all);
  const historyEntry: ClinicalTaskHistoryEntry = {
    id: 'h-' + Date.now(),
    action: 'updated',
    userId: actor?.id,
    userName: actor?.name,
    role: actor?.role,
    timestamp: new Date().toISOString(),
    details: { patch }
  };
  updated.history = updated.history || [];
  updated.history.push(historyEntry);
  await writeAll(all);
  await appendAudit({ event: 'task.updated', taskId, patientId, timestamp: historyEntry.timestamp, actor: actor || null, details: { patch } });
  return updated;
}

export async function appendAudit(event: any) {
  await ensureData();
  try {
    const raw = await fs.readFile(AUDIT_FILE, 'utf8');
    const arr = JSON.parse(raw || '[]');
    arr.push(event);
    await fs.writeFile(AUDIT_FILE, JSON.stringify(arr, null, 2), 'utf8');
  } catch (e) {
    await fs.writeFile(AUDIT_FILE, JSON.stringify([event], null, 2), 'utf8');
  }
}

// Minimal FHIR Task mapper
export function mapToFhirTask(task: ClinicalTask) {
  const fhir: any = {
    resourceType: 'Task',
    id: task.id,
    status: task.status || 'requested',
    intent: 'order',
    priority: task.priority === 'high' ? 'urgent' : (task.priority === 'normal' ? 'routine' : task.priority),
    code: { text: task.title },
    description: task.description,
    for: { reference: `Patient/${task.patientId}` },
    authoredOn: task.createdAt,
    lastModified: task.updatedAt,
    requester: task.requester ? { agent: { display: task.requester.name, reference: `Practitioner/${task.requester.id}` } } : undefined,
    owner: task.assignee ? { reference: `Practitioner/${task.assignee.id}`, display: task.assignee.name } : undefined,
    executionPeriod: task.startDate || task.dueDate ? { start: task.startDate, end: task.dueDate } : undefined,
    note: task.history ? task.history.map(h=>({ text: `${h.action} by ${h.userName || h.userId || 'system'}: ${JSON.stringify(h.details||'')}` })) : undefined,
  };
  return fhir;
}
