import { AdminWorkspacePage } from '../AdminWorkspacePage';

export default function OperationsPage() {
  return <AdminWorkspacePage title='Scheduling & Encounters' description='Operational scheduling configuration without transforming the console into a clinical encounter workspace.' tabs={[
    { id: 'appointments', label: 'Appointments', description: 'Use the existing scheduling workspace for authorized appointment administration.', state: 'available' },
    { id: 'visit-types', label: 'Visit Types', description: 'Visit duration, provider eligibility, location and telehealth rules require a persisted configuration service.', state: 'unknown' },
    { id: 'locations', label: 'Locations', description: 'FHIR-aligned Location configuration must be governed by organization and effective status.', state: 'unknown' },
    { id: 'encounters', label: 'Encounter Types', description: 'Operational classifications must never alter completed clinical encounters.', state: 'unknown' },
    { id: 'policies', label: 'Policies', description: 'Cancellation and no-show policies are configuration, not frontend constants.', state: 'unknown' },
  ]} />;
}
