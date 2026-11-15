import type { ReactNode } from 'react';
import ClinicalWorkspaceShell from '@/components/ClinicalWorkspaceShell';

export default function CommunicationLayout({ children }: { readonly children: ReactNode }) {
  return <ClinicalWorkspaceShell>{children}</ClinicalWorkspaceShell>;
}
