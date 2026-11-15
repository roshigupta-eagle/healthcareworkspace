'use client';

import DashboardHomeClient from '@/app/dashboard/DashboardHomeClient';
import type { DashboardSummary } from '@/lib/dashboardSummary';

export default function ClinicalCommandCenter({ initialData }: { initialData: DashboardSummary }) {
  return <DashboardHomeClient initialData={initialData} />;
}
