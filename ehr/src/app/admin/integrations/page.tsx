import { AdminWorkspacePage } from '../AdminWorkspacePage';

export default function IntegrationsPage() {
  return <AdminWorkspacePage title='FHIR & Integrations' description='A human-readable interoperability command center. Resource names appear only where they clarify the operational task.' tabs={[
    { id: 'overview', label: 'Overview', description: 'Connection status must come from verified endpoint checks and exchange records.', state: 'unknown' },
    { id: 'fhir', label: 'FHIR', description: 'The configured FHIR release and capability data must be read from the service. This UI does not claim conformance.', state: 'unknown' },
    { id: 'laboratory', label: 'Laboratory', description: 'Laboratory operations map to ServiceRequest, Specimen, Observation, and DiagnosticReport when the integration is configured.', state: 'unknown' },
    { id: 'pharmacy', label: 'Pharmacy', description: 'Prescription and dispense interfaces need server-authorized health and error read models.', state: 'unknown' },
    { id: 'sync', label: 'Sync & Errors', description: 'Retries and resolutions require a durable integration queue; no error queue is currently exposed here.', state: 'unknown' },
  ]} />;
}
