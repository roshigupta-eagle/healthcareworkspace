import React from 'react';
import ProtectedLayout from '@/components/auth/ProtectedLayout';
import DashboardShell from '@/components/dashboard/DashboardShell';

export default function DashboardPage() {
  return (
    <ProtectedLayout>
      <div className="min-h-screen py-8">
        <DashboardShell />
      </div>
    </ProtectedLayout>
  );
}
