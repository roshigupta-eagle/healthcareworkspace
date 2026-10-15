import { AdminWorkspacePage } from '../AdminWorkspacePage';

export default function SettingsPage() {
  return <AdminWorkspacePage title='System & Settings' description='Organization-level settings are progressive and governed; the console never exposes secrets or bypasses retention requirements.' tabs={[
    { id: 'organization', label: 'Organization', description: 'Organization identity, timezone, and contact data must use a canonical organization service.', state: 'unknown' },
    { id: 'locations', label: 'Locations', description: 'Location administration must preserve active status, organization, address, and type with server validation.', state: 'unknown' },
    { id: 'features', label: 'Features', description: 'Only approved product flags belong here; raw engineering flags are not an ordinary admin control.', state: 'unknown' },
    { id: 'retention', label: 'Retention', description: 'Retention and legal-hold controls require Privacy Officer and custodian governance.', state: 'unknown' },
    { id: 'recovery', label: 'Backup & Recovery', description: 'Backup status must report observed success, age, and restore evidence, not configuration intent.', state: 'unknown' },
  ]} />;
}
