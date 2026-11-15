import type { ReactNode } from 'react';
import ClinicalWorkspaceShell from '@/components/ClinicalWorkspaceShell';

export default function DashboardLayout({ children }: { readonly children: ReactNode }) {
  return <ClinicalWorkspaceShell>{children}</ClinicalWorkspaceShell>;
}
