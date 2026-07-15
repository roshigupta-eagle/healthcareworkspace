"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function CommandPaletteClient() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((s) => !s);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const commands = [
    { id: 'records', title: 'Open Records', href: '/dashboard/records' },
    { id: 'appointments', title: 'Open Appointments', href: '/dashboard/appointments' },
    { id: 'new-record', title: 'New Patient Record', href: '/dashboard/records/new' },
    { id: 'dashboard', title: 'Go to Dashboard', href: '/dashboard' },
  ];

  const filtered = commands.filter(c => c.title.toLowerCase().includes(query.toLowerCase()));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24">
      <div className="w-full max-w-2xl mx-4">
        <div className="bg-white rounded-lg shadow-xl ring-1 ring-gray-200">
          <div className="p-3 border-b border-gray-100">
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type a command or search..." className="w-full px-3 py-2 rounded-md border border-gray-200" />
          </div>
          <div className="p-2">
            {filtered.map(cmd => (
              <Link key={cmd.id} href={cmd.href} className="block px-3 py-2 rounded hover:bg-gray-50">{cmd.title}</Link>
            ))}
            {filtered.length === 0 && <div className="px-3 py-2 text-sm text-gray-500">No commands found</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
