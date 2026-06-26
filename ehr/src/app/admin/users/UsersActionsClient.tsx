"use client";

import React, { useState } from 'react';
import { Button, Modal, FormField, Input } from '@/design-system';

export default function UsersActionsClient() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, role }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || 'Failed to create user');
      }

      // Notify other components to refresh
      window.dispatchEvent(new CustomEvent('users:changed'));
      setOpen(false);
      setName('');
      setEmail('');
      setRole('');
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
        New User
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create New User"
        description="Create a new user account"
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreate} disabled={submitting}>
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <p className="text-sm text-critical-700">{error}</p>}

          <FormField label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} fullWidth />
          </FormField>

          <FormField label="Email">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
          </FormField>

          <FormField label="Role" hint="Optional (ADMIN, DOCTOR, NURSE, PATIENT)">
            <Input value={role} onChange={(e) => setRole(e.target.value)} fullWidth />
          </FormField>
        </div>
      </Modal>
    </>
  );
}
