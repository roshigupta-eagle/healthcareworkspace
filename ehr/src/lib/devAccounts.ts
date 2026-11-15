export type DevAccount = {
  readonly id: string;
  readonly role: string;
  readonly name: string;
  readonly email: string;
  readonly password: string;
  // For patient accounts: the one patient record the account may read.
  readonly patientId?: string;
};

// Local development only: devAuthStore seeds these in memory when NODE_ENV is not "production".
// They are not real credentials and must never be created in a deployed environment.
// Doctor and nurse names match members of the seeded care team of patient-001, which is what
// grants them access to that record.
export const DEV_ACCOUNTS: readonly DevAccount[] = [
  { id: 'dev-admin', role: 'ADMIN', name: 'Admin User', email: 'admin@example.com', password: 'Admin#Local2026' },
  { id: 'dev-doctor', role: 'DOCTOR', name: 'Dr. Aris Thorne', email: 'doctor@example.com', password: 'Doctor#Local2026' },
  { id: 'dev-nurse', role: 'NURSE', name: 'Nurse Sarah Lee', email: 'nurse@example.com', password: 'Nurse#Local2026' },
  { id: 'dev-pharmacist', role: 'PHARMACIST', name: 'Pharmacist User', email: 'pharmacist@example.com', password: 'Pharmacist#Local2026' },
  { id: 'dev-lab-tech', role: 'LAB_TECH', name: 'Lab Technician User', email: 'labtech@example.com', password: 'LabTech#Local2026' },
  { id: 'dev-receptionist', role: 'RECEPTIONIST', name: 'Receptionist User', email: 'receptionist@example.com', password: 'Reception#Local2026' },
  { id: 'dev-billing', role: 'BILLING', name: 'Billing User', email: 'billing@example.com', password: 'Billing#Local2026' },
  { id: 'dev-pca', role: 'PCA', name: 'Patient Care Assistant User', email: 'pca@example.com', password: 'Pca#Local2026' },
  { id: 'dev-patient', role: 'PATIENT', name: 'Sarah Jenkins', email: 'patient@example.com', password: 'Patient#Local2026', patientId: 'patient-001' },
  { id: 'dev-pending', role: 'PENDING', name: 'Pending User', email: 'pending@example.com', password: 'Pending#Local2026' },
];

export function devAccountFor(role: string): DevAccount {
  const account = DEV_ACCOUNTS.find((entry) => entry.role === role);
  if (!account) throw new Error(`No development account for role ${role}`);
  return account;
}
