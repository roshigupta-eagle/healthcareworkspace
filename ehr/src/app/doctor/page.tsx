"use client";

import React from 'react';
import ProtectedLayout from '@/components/auth/ProtectedLayout';
import DashboardShell from '@/components/dashboard/DashboardShell';

export default function DoctorAliasPage() {
  return (
    <ProtectedLayout>
      <div className="min-h-screen py-8">
        <DashboardShell />
      </div>
    </ProtectedLayout>
  );
}

