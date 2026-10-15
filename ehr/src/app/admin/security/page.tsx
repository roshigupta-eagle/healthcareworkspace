import { AdminWorkspacePage } from '../AdminWorkspacePage';

export default function SecurityPage() {
  return <AdminWorkspacePage title='Audit & Security' description='Governance and security review. Audit entries remain immutable and clinical provenance remains separate from access audit.' actions={[{ label: 'Open audit trail', href: '/admin/audit' }, { label: 'Manage users', href: '/admin/users' }]} tabs={[
    { id: 'audit', label: 'Audit Trail', description: 'Review current PHIPA audit events through the existing secure audit workflow.', state: 'available' },
    { id: 'access', label: 'Access History', description: 'Actor, resource, outcome, and source filtering requires the expanded audit API contract.', state: 'unknown' },
    { id: 'events', label: 'Security Events', description: 'Security alerts require verified detection sources and cannot be inferred from ordinary activity.', state: 'unknown' },
    { id: 'break-glass', label: 'Break Glass', description: 'Emergency access needs reason, expiry, patient scope, notification, and retrospective review.', state: 'unknown' },
    { id: 'sessions', label: 'Sessions', description: 'Session revocation and MFA policy require an identity-provider integration.', state: 'unknown' },
  ]} />;
}
