import { AdminWorkspacePage } from '../AdminWorkspacePage';

export default function PatientsAccountsPage() {
  return <AdminWorkspacePage title='Patients & Accounts' description='Administrative patient-account management. This workspace does not expose or edit clinical chart facts.' actions={[{ label: 'Open user directory', href: '/admin/users' }]} tabs={[
    { id: 'directory', label: 'Patient Directory', description: 'Canonical patient records remain in the existing patient services. Account-level lookup requires an authorized read model.', state: 'unknown' },
    { id: 'portal', label: 'Portal Accounts', description: 'Portal activation, suspension, and proxy access require a persisted identity workflow.', state: 'unknown' },
    { id: 'identity', label: 'Identity Matching', description: 'Potential matches must be reviewed with evidence. Patient identities are never merged automatically.', state: 'unknown' },
    { id: 'duplicates', label: 'Duplicates', description: 'Governed duplicate review needs explicit approval, audit history, and downstream reconciliation.', state: 'unknown' },
    { id: 'contact', label: 'Contact Verification', description: 'Contact changes require verified source and consent-aware notification handling.', state: 'unknown' },
  ]} />;
}
