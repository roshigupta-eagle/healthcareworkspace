import type { ReactNode } from 'react';
import ClinicalWorkspaceShell from '@/components/ClinicalWorkspaceShell';

export default function ScheduleLayout({ children }: { readonly children: ReactNode }) {
  return <ClinicalWorkspaceShell>{children}</ClinicalWorkspaceShell>;
}
