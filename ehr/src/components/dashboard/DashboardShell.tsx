"use client";

import React from 'react';
import DashboardHeader from './DashboardHeader';
import DashboardSummaryCards from './DashboardSummaryCards';
import UrgentAlertsCard from './UrgentAlertsCard';
import QueueWorkbench from './QueueWorkbench';
import TodayAppointmentsCard from './TodayAppointmentsCard';
import ActionCenterCard from './ActionCenterCard';

export default function DashboardShell() {
  return (
    <div className="max-w-screen-xl mx-auto">
      <DashboardHeader />

      <div className="mt-6">
        <DashboardSummaryCards />
      </div>

      <div className="mt-6 grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <UrgentAlertsCard />
          <QueueWorkbench />
          {/* Today schedule and other large widgets would go here */}
        </div>

        <aside className="col-span-12 lg:col-span-4 space-y-6">
          <TodayAppointmentsCard />
          <ActionCenterCard />
        </aside>
      </div>
    </div>
  );
}
