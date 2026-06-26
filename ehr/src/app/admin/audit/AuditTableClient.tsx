"use client";

import React from 'react';
import { DataTable } from '@/design-system';

type AuditEvent = { id: string; ts: string; user: string; action: string };

export default function AuditTableClient({ rows }: { rows: AuditEvent[] }) {
  const columns = [
    { key: 'time', header: 'Time', render: (r: AuditEvent) => new Date(r.ts).toLocaleString() },
    { key: 'user', header: 'User', render: (r: AuditEvent) => r.user },
    { key: 'action', header: 'Action', render: (r: AuditEvent) => r.action },
  ];

  return (
    <DataTable columns={columns as any} rows={rows} striped emptyState={<span>No audit events.</span>} />
  );
}
                                                                                 