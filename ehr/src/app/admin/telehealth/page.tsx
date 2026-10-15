import { AdminWorkspacePage } from '../AdminWorkspacePage';

export default function TelehealthPage() {
  return <AdminWorkspacePage title='Telehealth & Communication' description='Infrastructure and policy administration for communication services. Media content is not surfaced here.' tabs={[
    { id: 'overview', label: 'Overview', description: 'Telehealth service telemetry is only shown when a verified health source is available.', state: 'unknown' },
    { id: 'waiting', label: 'Waiting Room', description: 'Check-in, identity, consent, and timeout policies require a persisted and audited policy service.', state: 'unknown' },
    { id: 'providers', label: 'Providers', description: 'Communication-provider configuration is controlled server-side; secrets are never exposed to this console.', state: 'unknown' },
    { id: 'history', label: 'Call History', description: 'Call metadata must be sourced from governed operational records, without exposing recordings.', state: 'unknown' },
    { id: 'diagnostics', label: 'Diagnostics', description: 'LiveKit and TURN states require direct verified probes before a status can be displayed.', state: 'unknown' },
  ]} />;
}
