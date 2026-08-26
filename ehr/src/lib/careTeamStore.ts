import fs from 'fs/promises';
import crypto from 'crypto';
import path from 'path';
import { resolveDataPath } from './dataPath';
import type { Patient } from '../app/dashboard/records/mockPatients';

const CARE_TEAM_FILE = resolveDataPath('care_team.json');

export type CareTeamStatus = 'active' | 'pending' | 'inactive' | 'ended';

export interface CareTeamHistoryEntry {
  action: string;
  actor: string;
  timestamp: string;
  details?: string;
}

export interface CareTeamMember {
  id: string;
  patientId: string;
  name: string;
  role: string;
  specialty?: string;
  initials?: string;
  organization?: string;
  careTeamRole?: string;
  responsibilities?: string[];
  status: CareTeamStatus;
  startDate?: string;
  endDate?: string;
  source: 'patient-record' | 'native';
  history: CareTeamHistoryEntry[];
}

async function readAll(): Promise<{ items: CareTeamMember[] }> {
  try {
    const raw = await fs.readFile(CARE_TEAM_FILE, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    return { items: Array.isArray(parsed.items) ? parsed.items : [] };
  } catch {
    return { items: [] };
  }
}

async function writeAll(data: { items: CareTeamMember[] }) {
  await fs.mkdir(path.dirname(CARE_TEAM_FILE), { recursive: true });
  await fs.writeFile(CARE_TEAM_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function initialsFor(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

export function mapLegacyMember(patientId: string, member: NonNullable<Patient['careTeam']>[number]): CareTeamMember {
  const careTeamRole = /primary/i.test(member.role) ? 'Primary Physician' : /coordinator/i.test(member.role) ? 'Care Coordinator' : 'Specialist';
  return {
    id: member.id,
    patientId,
    name: member.name,
    role: member.role,
    specialty: member.specialty,
    initials: member.initials || initialsFor(member.name),
    careTeamRole,
    status: 'active',
    source: 'patient-record',
    history: [],
  };
}

export async function listCareTeam(patientId: string, patient: Patient): Promise<CareTeamMember[]> {
  const data = await readAll();
  const stored = data.items.filter((item) => String(item.patientId) === String(patientId));
  const legacy = (patient.careTeam || []).map((member) => mapLegacyMember(patientId, member));
  const known = new Set(stored.map((item) => item.id));
  return [...stored, ...legacy.filter((item) => !known.has(item.id))];
}

export async function createCareTeamMember(patientId: string, input: Partial<CareTeamMember>, actor: string, patient: Patient): Promise<CareTeamMember> {
  const existing = await listCareTeam(patientId, patient);
  const duplicate = existing.find((member) => member.status === 'active' && member.name.trim().toLowerCase() === input.name?.trim().toLowerCase());
  if (duplicate) throw new Error(`This person is already on the active care team as ${duplicate.careTeamRole || duplicate.role}.`);

  const data = await readAll();
  const now = new Date().toISOString();
  const member: CareTeamMember = {
    id: input.id || `team-${crypto.randomUUID()}`,
    patientId,
    name: input.name?.trim() || 'Unnamed care-team member',
    role: input.role?.trim() || 'Care-team participant',
    specialty: input.specialty?.trim() || undefined,
    initials: input.initials?.trim() || initialsFor(input.name?.trim() || 'Care Team'),
    organization: input.organization?.trim() || undefined,
    careTeamRole: input.careTeamRole?.trim() || 'Care Team Member',
    responsibilities: input.responsibilities?.filter(Boolean),
    status: input.status || 'active',
    startDate: input.startDate || now.slice(0, 10),
    source: 'native',
    history: [{ action: 'added to care team', actor, timestamp: now }],
  };
  data.items.push(member);
  await writeAll(data);
  return member;
}