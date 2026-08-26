"use client";

import { useState } from 'react';
import Drawer from '@/components/doctor-notes/Drawer';

const TERM_OPTIONS = ['Elevated Blood Pressure Readings', 'Occasional Dizziness', 'Weight Management', 'Diabetes', 'Thyroid Concern', 'Exertional Chest Discomfort', 'Worsening Cough'];

type Props = {
  patientId: string;
  defaultProvider?: string;
  onClose: () => void;
  onSaved: () => void;
  onToast: (message: string, level?: 'success' | 'error' | 'info') => void;
};

export default function AddConcernDrawer({ patientId, defaultProvider, onClose, onSaved, onToast }: Props) {
  const [termQuery, setTermQuery] = useState('');
  const [term, setTerm] = useState('');
  const [category, setCategory] = useState('Health concern');
  const [clinicalStatus, setClinicalStatus] = useState<'active' | 'monitoring' | 'resolved'>('active');
  const [verification, setVerification] = useState<'confirmed' | 'provisional' | 'unconfirmed'>('provisional');
  const [severity, setSeverity] = useState('');
  const [onset, setOnset] = useState('');
  const [provider, setProvider] = useState(defaultProvider || '');
  const [encounter, setEncounter] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = termQuery.trim() ? TERM_OPTIONS.filter((t) => t.toLowerCase().includes(termQuery.toLowerCase())) : [];

  async function submit() {
    if (!term.trim()) {
      setError('Choose a structured concern term before saving.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/health-concerns`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ term, category, clinicalStatus, verification, severity: severity || undefined, onset: onset || undefined, provider: provider || undefined, encounter: encounter || undefined, notes: notes || undefined }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || "We couldn't save this health concern.");
      onToast('Health concern added.', 'success');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't save this health concern.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer
      title="Add Health Concern"
      onClose={onClose}
      footer={
        <div className="space-y-2">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-2 text-sm font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button type="button" disabled={submitting} onClick={submit} className="px-4 py-2 text-sm font-semibold rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60">
              {submitting ? 'Saving…' : error ? 'Try Again' : 'Save Concern'}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Concern</label>
          <input
            value={term || termQuery}
            onChange={(e) => {
              setTerm('');
              setTermQuery(e.target.value);
            }}
            placeholder="Search Term, Synonym or Code..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200"
          />
          {matches.length > 0 && !term && (
            <div className="mt-1 rounded-lg border border-slate-200 bg-white shadow-sm">
              {matches.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setTerm(m);
                    setTermQuery('');
                  }}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200">
              <option>Health Concern</option>
              <option>Problem</option>
              <option>Symptom</option>
              <option>Diagnosis</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Clinical Status</label>
            <select value={clinicalStatus} onChange={(e) => setClinicalStatus(e.target.value as typeof clinicalStatus)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200">
              <option value="active">Active</option>
              <option value="monitoring">Monitoring</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Verification</label>
            <select value={verification} onChange={(e) => setVerification(e.target.value as typeof verification)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200">
              <option value="provisional">Provisional</option>
              <option value="confirmed">Confirmed</option>
              <option value="unconfirmed">Unconfirmed</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Severity (Optional)</label>
            <input value={severity} onChange={(e) => setSeverity(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Onset</label>
            <input type="date" value={onset} onChange={(e) => setOnset(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Responsible Clinician</label>
            <input value={provider} onChange={(e) => setProvider(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Related Encounter (Optional)</label>
          <input value={encounter} onChange={(e) => setEncounter(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200" />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Description / Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200" />
        </div>
      </div>
    </Drawer>
  );
}
