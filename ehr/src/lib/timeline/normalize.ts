import type { TimelineEvent, ProvenanceInfo } from './types';

function parseIsoToEpoch(iso?: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isFinite(d.getTime())) return d.getTime();
  // try substring fixes for partial dates
  try {
    const parsed = Date.parse(iso as string);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function normalizeDateField(resource: any): { start?: number | null; end?: number | null; point?: number | null; imprecise?: boolean } {
  if (!resource) return {};

  // Period
  if (resource.period) {
    return { start: parseIsoToEpoch(resource.period.start), end: parseIsoToEpoch(resource.period.end) };
  }

  // R4/R5 encounter variants
  if (resource.actualPeriod) {
    return { start: parseIsoToEpoch(resource.actualPeriod.start), end: parseIsoToEpoch(resource.actualPeriod.end) };
  }

  // onset/abatement for Condition
  if (resource.onsetDateTime) return { point: parseIsoToEpoch(resource.onsetDateTime) };
  if (resource.onset) {
    if (typeof resource.onset === 'string') return { point: parseIsoToEpoch(resource.onset) };
    if (resource.onsetPeriod) return { start: parseIsoToEpoch(resource.onsetPeriod.start), end: parseIsoToEpoch(resource.onsetPeriod.end) };
  }

  // effective/issued/authoredOn
  if (resource.effectiveDateTime) return { point: parseIsoToEpoch(resource.effectiveDateTime) };
  if (resource.effectiveInstant) return { point: parseIsoToEpoch(resource.effectiveInstant) };
  if (resource.issued) return { point: parseIsoToEpoch(resource.issued) };
  if (resource.authoredOn) return { point: parseIsoToEpoch(resource.authoredOn) };

  // Timing
  if (resource.timing) {
    if (Array.isArray(resource.timing.event) && resource.timing.event.length) {
      return { point: parseIsoToEpoch(resource.timing.event[0]), imprecise: true };
    }
    if (resource.timing.repeat && resource.timing.repeat.boundsPeriod) {
      return { start: parseIsoToEpoch(resource.timing.repeat.boundsPeriod.start), end: parseIsoToEpoch(resource.timing.repeat.boundsPeriod.end), imprecise: true };
    }
  }

  // Observation effectivePeriod
  if (resource.effectivePeriod) return { start: parseIsoToEpoch(resource.effectivePeriod.start), end: parseIsoToEpoch(resource.effectivePeriod.end) };

  // fallback to meta.lastUpdated
  if (resource.meta && resource.meta.lastUpdated) return { point: parseIsoToEpoch(resource.meta.lastUpdated) };

  return {};
}

export function provenanceOf(resource: any): ProvenanceInfo {
  const src = resource?.meta?.source || (resource?.identifier && Array.isArray(resource.identifier) ? resource.identifier[0]?.assigner?.display || resource.identifier[0]?.assigner?.reference : undefined) || null;
  const prov: ProvenanceInfo = { system: 'UNKNOWN', source: src || null, identifiers: null, originalResourceType: resource?.resourceType ?? null, originalId: resource?.id ?? null };

  const s = (src || '').toString().toLowerCase();
  if (!s) {
    // try checking id prefixes or known system tags
    if (resource?._sourceSystem && typeof resource._sourceSystem === 'string') {
      const p = resource._sourceSystem.toLowerCase();
      if (p.includes('lims')) prov.system = 'LIMS';
      if (p.includes('pharm') || p.includes('pms')) prov.system = 'PMS';
      if (p.includes('ehr')) prov.system = 'EHR';
    }
    return prov;
  }

  if (s.includes('lims') || s.includes('lab')) prov.system = 'LIMS';
  else if (s.includes('pharm') || s.includes('pms')) prov.system = 'PMS';
  else prov.system = 'EHR';

  if (resource.identifier && Array.isArray(resource.identifier)) {
    prov.identifiers = resource.identifier.map((id:any) => ({ system: id.system, value: id.value }));
  }

  return prov;
}

export function businessKeyOf(resource: any): string | null {
  if (!resource) return null;
  if (resource.identifier && Array.isArray(resource.identifier) && resource.identifier.length) {
    return resource.identifier.map((id:any) => `${id.system ?? ''}|${id.value ?? ''}`).join(',');
  }
  // fallback: type + code + date
  const code = resource.code?.coding?.[0]?.code ?? resource.code?.text ?? '';
  const date = resource.effectiveDateTime ?? resource.issued ?? resource.authoredOn ?? resource.onsetDateTime ?? resource.meta?.lastUpdated ?? '';
  if (code || date) return `${resource.resourceType}:${code}:${date}`;
  if (resource.resourceType && resource.id) return `${resource.resourceType}/${resource.id}`;
  return null;
}

// Map a subset of common FHIR resources to TimelineEvent payloads
export function mapResourceToEvents(resource: any): TimelineEvent[] {
  if (!resource || !resource.resourceType) return [];

  const times = normalizeDateField(resource);
  const prov = provenanceOf(resource);
  const key = businessKeyOf(resource) ?? `${resource.resourceType}/${resource.id ?? Math.random().toString(36).slice(2,8)}`;

  switch (resource.resourceType) {
    case 'Encounter': {
      const title = (resource.type && resource.type[0] && (resource.type[0].text || resource.type[0].coding?.[0]?.display)) || (resource.class && resource.class.display) || 'Encounter';
      return [{
        id: `${resource.resourceType}/${resource.id ?? key}`,
        resourceType: 'Encounter',
        resourceId: resource.id ?? null,
        businessKey: key,
        start: times.start ?? times.point ?? null,
        end: times.end ?? null,
        lane: 'encounter',
        title: title,
        subtitle: resource.serviceType?.text ?? null,
        provenance: prov,
        fhir: { snapshot: { status: resource.status, class: resource.class }, raw: null }
      }];
    }

    case 'Condition': {
      const title = resource.code?.text ?? resource.code?.coding?.[0]?.display ?? 'Condition';
      return [{
        id: `${resource.resourceType}/${resource.id ?? key}`,
        resourceType: 'Condition',
        resourceId: resource.id ?? null,
        businessKey: key,
        start: times.start ?? times.point ?? null,
        end: times.end ?? null,
        lane: 'condition',
        title,
        subtitle: resource.clinicalStatus?.text ?? null,
        provenance: prov,
        fhir: { snapshot: { verificationStatus: resource.verificationStatus }, raw: null }
      }];
    }

    case 'Observation': {
      const codeText = resource.code?.text ?? resource.code?.coding?.[0]?.display ?? 'Observation';
      let val: any = null;
      if (resource.valueQuantity) val = { value: resource.valueQuantity.value, unit: resource.valueQuantity.unit };
      else if (resource.valueString) val = resource.valueString;

      return [{
        id: `${resource.resourceType}/${resource.id ?? key}`,
        resourceType: 'Observation',
        resourceId: resource.id ?? null,
        businessKey: key,
        point: times.point ?? null,
        lane: 'lab',
        subtype: resource.code?.coding?.[0]?.code ?? null,
        title: codeText,
        subtitle: resource.code?.coding?.[0]?.display ?? null,
        value: val,
        unit: resource.valueQuantity?.unit ?? null,
        referenceRange: resource.referenceRange && resource.referenceRange.length ? { low: resource.referenceRange[0].low?.value ?? null, high: resource.referenceRange[0].high?.value ?? null, unit: resource.referenceRange[0].low?.unit ?? null } : null,
        interpretation: resource.interpretation?.[0]?.coding?.[0]?.code ?? resource.interpretation?.text ?? null,
        critical: (resource.interpretation || []).some ? (resource.interpretation || []).some((i:any) => (i.code || '').toString().toUpperCase().includes('H')) : false,
        provenance: prov,
        fhir: { snapshot: { status: resource.status }, raw: null }
      }];
    }

    case 'DiagnosticReport': {
      const title = resource.code?.text ?? resource.code?.coding?.[0]?.display ?? 'Diagnostic Report';
      return [{
        id: `${resource.resourceType}/${resource.id ?? key}`,
        resourceType: 'DiagnosticReport',
        resourceId: resource.id ?? null,
        businessKey: key,
        point: times.point ?? null,
        lane: 'lab',
        title,
        subtitle: resource.status ?? null,
        provenance: prov,
        fhir: { snapshot: { conclusion: resource.conclusion }, raw: null }
      }];
    }

    case 'MedicationRequest': {
      const med = resource.medicationCodeableConcept?.text ?? resource.medicationReference?.display ?? 'Medication';
      return [{
        id: `${resource.resourceType}/${resource.id ?? key}`,
        resourceType: 'MedicationRequest',
        resourceId: resource.id ?? null,
        businessKey: key,
        point: times.point ?? null,
        lane: 'medication',
        title: med,
        subtitle: resource.status ?? null,
        provenance: prov,
        fhir: { snapshot: { intent: resource.intent }, raw: null }
      }];
    }

    case 'MedicationAdministration': {
      const med = resource.medicationCodeableConcept?.text ?? resource.medicationReference?.display ?? 'Medication Administration';
      return [{
        id: `${resource.resourceType}/${resource.id ?? key}`,
        resourceType: 'MedicationAdministration',
        resourceId: resource.id ?? null,
        businessKey: key,
        point: times.point ?? null,
        lane: 'medication',
        title: med,
        subtitle: resource.status ?? null,
        provenance: prov,
        fhir: { snapshot: { note: resource.note }, raw: null }
      }];
    }

    default:
      return [];
  }
}

// Deduplicate events by businessKey; prefer certain provenance depending on lane/resource
export function dedupeEvents(events: TimelineEvent[]): TimelineEvent[] {
  const byKey = new Map<string, TimelineEvent[]>();

  for (const ev of events) {
    const key = ev.businessKey ?? `${ev.resourceType}/${ev.resourceId ?? ev.id}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(ev);
  }

  const out: TimelineEvent[] = [];

  for (const [key, group] of byKey.entries()) {
    if (group.length === 1) { out.push(group[0]); continue; }
    // choose winner based on lane & provenance
    group.sort((a,b) => {
      const order = (p:any) => p.provenance.system === 'LIMS' ? 0 : p.provenance.system === 'PMS' ? 1 : 2;
      return order(a) - order(b);
    });
    // the first is preferred; but if content differs keep all with cluster flag
    const preferred = group[0];
    const conflict = group.some(g => JSON.stringify(g) !== JSON.stringify(preferred));
    if (conflict) {
      // attach related resources metadata
      preferred.related = group.filter(g => g.id !== preferred.id).map(g => ({ resourceType: g.resourceType, id: g.resourceId ?? g.id, relation: 'duplicate' }));
    }
    out.push(preferred);
  }

  // sort by time (point/start)
  out.sort((a,b) => {
    const ta = a.point ?? a.start ?? a.lastUpdated ?? 0;
    const tb = b.point ?? b.start ?? b.lastUpdated ?? 0;
    return (ta || 0) - (tb || 0);
  });

  return out;
}

export default { parseIsoToEpoch, normalizeDateField, provenanceOf, businessKeyOf, mapResourceToEvents, dedupeEvents };
