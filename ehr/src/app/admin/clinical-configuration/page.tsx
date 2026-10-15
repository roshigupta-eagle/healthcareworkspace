import { AdminWorkspacePage } from '../AdminWorkspacePage';

export default function ClinicalConfigurationPage() {
  return <AdminWorkspacePage title='Clinical Configuration' description='Configure governed clinical capabilities without providing a path to edit patient clinical facts.' tabs={[
    { id: 'departments', label: 'Departments', description: 'Department, service and lead configuration requires a canonical organization service.', state: 'unknown' },
    { id: 'specialties', label: 'Specialties', description: 'Specialty mappings belong with verified PractitionerRole administration.', state: 'unknown' },
    { id: 'teams', label: 'Care Teams', description: 'Care team membership must be governed, time-bounded, and fully audited.', state: 'unknown' },
    { id: 'catalogs', label: 'Order Catalogs', description: 'Order catalogs and clinical dictionaries require terminology stewardship and server validation.', state: 'unknown' },
    { id: 'workflows', label: 'Workflow Configuration', description: 'Workflow templates need clinical governance, versioning, and rollback before activation.', state: 'unknown' },
  ]} />;
}
