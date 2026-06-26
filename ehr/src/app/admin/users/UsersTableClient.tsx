"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { DataTable } from '@/design-system';

type User = { id: string; email?: string; name?: string; role?: string };

export default function UsersTableClient({ rows: initialRows }: { rows: User[] }) {
  const [rows, setRows] = useState<User[]>(initialRows ?? []);
  const [loading, setLoading] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setRows(data);
      }
    } catch (err) {
      // keep existing rows on error
      // eslint-disable-next-line no-console
      console.error('failed to fetch admin users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // If server-provided rows are empty, fetch from API
    if (!initialRows || initialRows.length === 0) fetchList();

    const handler = () => fetchList();
    window.addEventListener('users:changed', handler);
    return () => window.removeEventListener('users:changed', handler);
  }, []);

  const columns = useMemo(
    () => [
      { key: 'name', header: 'Name', render: (u: User) => u.name ?? '—' },
      { key: 'email', header: 'Email', render: (u: User) => u.email ?? '—' },
      { key: 'role', header: 'Role', render: (u: User) => u.role ?? '—' },
    ],
    []
  );

  return (
    <DataTable
      columns={columns as any}
      rows={rows}
      striped
      loading={loading}
      rowAction={(row: any) => (
        <a className="text-primary-600 hover:underline" href={`/admin/users/${row.id}`}>
          Open
        </a>
      )}
      emptyState={<span>No users found.</span>}
    />
  );
}
