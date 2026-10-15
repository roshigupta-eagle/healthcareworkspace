'use client';

import DashboardHomeClient from '@/app/dashboard/DashboardHomeClient';
import type { DashboardSummary } from '@/lib/dashboardSummary';

export default function ClinicalCommandCenter({ initialData, preview }: { initialData: DashboardSummary; preview: string }) {
  return <DashboardHomeClient initialData={initialData} preview={preview} />;
}
