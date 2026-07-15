"use client";

import React from 'react';

type Props = {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  accent?: string;
};

export default function StatCard({ title, value, subtitle, icon, accent = 'border-primary-600' }: Props) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border-l-4 ${accent} p-4 transition-transform duration-300 transform hover:-translate-y-1`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-neutral-500 uppercase">{title}</div>
          <div className="mt-1 text-2xl font-bold text-neutral-900">{value}</div>
          {subtitle && <div className="text-sm text-neutral-500 mt-1">{subtitle}</div>}
        </div>
        {icon && <div className="ml-4">{icon}</div>}
      </div>
    </div>
  );
}
