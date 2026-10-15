import { AdminWorkspacePage } from '../AdminWorkspacePage';

export default function AnalyticsPage() {
  return <AdminWorkspacePage title='Analytics & Reports' description='Operational reporting is intentionally separate from real-time clinical charting and must respect organization and export policies.' tabs={[
    { id: 'operations', label: 'Operations', description: 'Operational backlog, appointment, and workflow reporting requires an approved reporting read model.', state: 'unknown' },
    { id: 'access', label: 'Patient Access', description: 'Portal adoption requires real portal-account states, not a count of patient records.', state: 'unknown' },
    { id: 'telehealth', label: 'Telehealth', description: 'Success, reconnect, and setup analytics need privacy-minimized verified telemetry.', state: 'unknown' },
    { id: 'integrations', label: 'Integrations', description: 'Failure-rate analytics depend on durable synchronization events.', state: 'unknown' },
    { id: 'reports', label: 'Custom Reports', description: 'CSV, PDF, and scheduled reporting require tenant-aware authorization and export audit.', state: 'unknown' },
  ]} />;
}
