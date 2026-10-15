import { NextResponse } from 'next/server';
import { logAuditEvent } from '@/lib/audit';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';
import {
  FHIR_ENCOUNTER_STATUSES,
  isEncounterFhirStatus,
} from '@/lib/encounterWorkflow';
import {
  getEncounterWorkspace,
  type EncounterWorkspaceFilter,
  type EncounterWorkspaceFilters,
  type EncounterWorkspaceSort,
} from '@/lib/encounterWorkspace';

export const dynamic = 'force-dynamic';

const FILTERS = new Set<EncounterWorkspaceFilter>([
  'all',
  'waiting',
  'in-progress',
  'needs-attention',
  'procedure',
  'completed',
  'cancelled',
]);
const SORTS = new Set<EncounterWorkspaceSort>([
  'clinical-priority',
  'arrival',
  'longest-waiting',
  'recently-updated',
  'patient',
  'encounter-start',
  'location',
]);

function text(value: string | null, maximum = 160): string | undefined {
  const trimmed = value?.trim().slice(0, maximum);
  return trimmed || undefined;
}

function positiveInteger(value: string | null): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function queryFilters(request: Request): EncounterWorkspaceFilters {
  const params = new URL(request.url).searchParams;
  const filter = text(params.get('filter')) as EncounterWorkspaceFilter | undefined;
  const sort = text(params.get('sort')) as EncounterWorkspaceSort | undefined;
  const fhirStatus = text(params.get('fhirStatus'));
  return {
    q: text(params.get('q'), 240),
    filter: filter && FILTERS.has(filter) ? filter : undefined,
    fhirStatus: isEncounterFhirStatus(fhirStatus) ? fhirStatus : undefined,
    type: text(params.get('type')),
    priority: text(params.get('priority'), 40),
    location: text(params.get('location')),
    practitioner: text(params.get('practitioner')),
    dateFrom: text(params.get('dateFrom'), 10),
    dateTo: text(params.get('dateTo'), 10),
    sort: sort && SORTS.has(sort) ? sort : undefined,
    page: positiveInteger(params.get('page')),
    pageSize: positiveInteger(params.get('pageSize')),
  };
}

export async function GET(request: Request) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  const snapshot = await getEncounterWorkspace(access.actor!, queryFilters(request));
  await logAuditEvent({
    agentId: access.actor!.id,
    entityType: 'Encounter',
    action: 'R',
    outcome: snapshot.sources.encounter.state === 'unavailable' ? 'failure' : 'success',
    description: 'Viewed encounter command-center worklist',
    detail: {
      sourceState: snapshot.sources.encounter.state,
      fhirStatuses: FHIR_ENCOUNTER_STATUSES.length,
    },
  });
  return NextResponse.json(snapshot, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
}