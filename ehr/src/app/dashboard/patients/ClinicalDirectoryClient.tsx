'use client';

import Link from 'next/link';
import { useDeferredValue, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SchedulingPatient } from '@/lib/schedulingData';
import './clinical-directory.css';

type DirectorySource = {
  state: 'ready' | 'unavailable';
  source: string;
  error?: string;
  fallback?: boolean;
};

type PatientRecord = SchedulingPatient;
type CreateForm = {
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: string;
  mrn: string;
  phone: string;
  email: string;
  address: string;
  emergencyContact: string;
  insuranceProvider: string;
  insurancePlan: string;
};
type Duplicate = { patientId: string; displayName: string; birthDate: string; mrn: string; status: string };

const EMPTY_FORM: CreateForm = {
  firstName: '',
  lastName: '',
  birthDate: '',
  gender: '',
  mrn: '',
  phone: '',
  email: '',
  address: '',
  emergencyContact: '',
  insuranceProvider: '',
  insurancePlan: '',
};

const AVATAR_TONES = ['is-sky', 'is-teal', 'is-violet', 'is-mint', 'is-blue'];

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'NA';
}

function avatarTone(name: string): string {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) hash = (hash * 31 + name.charCodeAt(index)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

function formatBirthDate(value?: string): string {
  if (!value) return 'DOB Not Documented';
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return 'DOB Not Documented';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

function searchDate(value?: string): string {
  return value ? `${value} ${formatBirthDate(value)}`.toLowerCase() : '';
}

function withPreview(path: string, query = ''): string {
  return query ? `${path}${path.includes('?') ? '&' : '?'}${query}` : path;
}

function Field({ label, name, value, type = 'text', required, onChange }: { label: string; name: keyof CreateForm; value: string; type?: string; required?: boolean; onChange: (name: keyof CreateForm, value: string) => void }) {
  return (
    <label className="directory-form-field">
      <span>{label}{required && <span aria-hidden="true"> *</span>}</span>
      <input name={name} type={type} value={value} required={required} onChange={(event) => onChange(name, event.target.value)} />
    </label>
  );
}

function CreatePatientDrawer({ preview, onClose, onCreated }: { preview: string; onClose: () => void; onCreated: (patientId: string) => void }) {
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [duplicate, setDuplicate] = useState<Duplicate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update(name: keyof CreateForm, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>, confirmDuplicate = false) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/health-records?${preview}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, confirmDuplicate }),
      });
      const payload = await response.json().catch(() => ({})) as { data?: { id: string }; error?: string; code?: string; duplicates?: Duplicate[] };
      if (response.status === 409 && payload.code === 'POTENTIAL_DUPLICATE') {
        setDuplicate(payload.duplicates || []);
        return;
      }
      if (!response.ok || !payload.data) throw new Error(payload.error || 'Patient record could not be created.');
      onCreated(payload.data.id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Patient record could not be created.');
    } finally {
      setSaving(false);
    }
  }

  if (duplicate) {
    return (
      <div className="directory-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
        <aside className="directory-drawer" role="dialog" aria-modal="true" aria-labelledby="duplicate-patient-title">
          <div className="directory-drawer-header"><div><span className="directory-eyebrow">Identity review</span><h2 id="duplicate-patient-title">Possible Existing Patient</h2></div><button type="button" onClick={onClose} className="directory-close" aria-label="Close patient creation"><span aria-hidden="true">×</span></button></div>
          <div className="directory-drawer-body"><p className="directory-drawer-copy">Review these existing records before creating a new patient. No new record has been saved yet.</p><div className="directory-duplicate-list">{duplicate.map((match) => <div className="directory-duplicate" key={match.patientId}><div><strong>{match.displayName}</strong><span>DOB {formatBirthDate(match.birthDate)} · MRN {match.mrn || 'Not Documented'}</span><small>{match.status}</small></div><Link href={withPreview(`/dashboard/records/${encodeURIComponent(match.patientId)}`, preview)} className="directory-open">Open Existing Record <span aria-hidden="true">→</span></Link></div>)}</div></div>
          <div className="directory-drawer-footer"><button type="button" onClick={() => setDuplicate(null)} className="directory-secondary-button">Back to Form</button><button type="button" disabled={saving} onClick={(event) => void submit(event as unknown as React.FormEvent<HTMLFormElement>, true)} className="directory-primary-button">{saving ? 'Creating…' : 'Continue Creating'}</button></div>
        </aside>
      </div>
    );
  }

  return (
    <div className="directory-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="directory-drawer" role="dialog" aria-modal="true" aria-labelledby="create-patient-title">
        <div className="directory-drawer-header"><div><span className="directory-eyebrow">Patient identity</span><h2 id="create-patient-title">New Patient Record</h2></div><button type="button" onClick={onClose} className="directory-close" aria-label="Close patient creation"><span aria-hidden="true">×</span></button></div>
        <form onSubmit={(event) => void submit(event)} className="directory-create-form">
          <p className="directory-drawer-copy">Enter the minimum identity and contact information. Clinical details can be documented after the record is created.</p>
          {error && <div className="directory-form-error" role="alert"><strong>Unable to create patient record</strong><span>{error}</span></div>}
          <fieldset><legend>Identity</legend><div className="directory-form-grid"><Field label="First Name" name="firstName" value={form.firstName} required onChange={update} /><Field label="Last Name" name="lastName" value={form.lastName} required onChange={update} /><Field label="Date of Birth" name="birthDate" value={form.birthDate} type="date" required onChange={update} /><label className="directory-form-field"><span>Gender <span aria-hidden="true"> *</span></span><select name="gender" value={form.gender} required onChange={(event) => update('gender', event.target.value)}><option value="">Select Gender</option><option>Female</option><option>Male</option><option>Other</option><option>Unknown</option></select></label><Field label="MRN" name="mrn" value={form.mrn} required onChange={update} /></div></fieldset>
          <fieldset><legend>Contact and Insurance</legend><div className="directory-form-grid"><Field label="Phone" name="phone" value={form.phone} type="tel" onChange={update} /><Field label="Email" name="email" value={form.email} type="email" onChange={update} /><Field label="Address" name="address" value={form.address} onChange={update} /><Field label="Emergency Contact" name="emergencyContact" value={form.emergencyContact} onChange={update} /><Field label="Insurance Provider" name="insuranceProvider" value={form.insuranceProvider} onChange={update} /><Field label="Insurance Plan" name="insurancePlan" value={form.insurancePlan} onChange={update} /></div></fieldset>
          <div className="directory-drawer-footer"><button type="button" onClick={onClose} className="directory-secondary-button">Cancel</button><button type="submit" disabled={saving} className="directory-primary-button">{saving ? 'Creating…' : 'Create Patient Record'}</button></div>
        </form>
      </aside>
    </div>
  );
}

function PatientRow({ patient, preview }: { patient: PatientRecord; preview: string }) {
  const recordHref = `/doctor/health-records/patient/${encodeURIComponent(patient.id)}`;
  const status = patient.status || 'Unknown';
  const statusClass = status === 'Active' ? 'is-active' : status === 'Inactive' ? 'is-inactive' : 'is-unknown';
  return (
    <article className="directory-patient-row">
      <Link href={withPreview(recordHref, preview)} className="directory-patient-main" aria-label={`Open record for ${patient.name}`}>
        <span className={`directory-avatar ${avatarTone(patient.name)}`} aria-hidden="true">{initials(patient.name)}</span>
        <span className="directory-patient-identity"><strong>{patient.name}</strong><small>{formatBirthDate(patient.birthDate)} · {patient.mrn ? `MRN ${patient.mrn}` : 'MRN Not Documented'}</small></span>
      </Link>
      <span className={`directory-patient-status ${statusClass}`}>{status === 'Active' ? 'Active Record' : status === 'Inactive' ? 'Inactive Record' : 'Status Not Recorded'}</span>
      <Link href={withPreview(recordHref, preview)} className="directory-open">Open Record <span aria-hidden="true">→</span></Link>
    </article>
  );
}

function DirectorySkeleton() {
  return <section className="directory-surface" aria-busy="true" aria-label="Loading patient directory"><div className="directory-skeleton-list">{Array.from({ length: 6 }).map((_, index) => <div className="directory-skeleton-row" key={index}><span /><div><span /><small /></div><i /><b /></div>)}</div></section>;
}

export default function ClinicalDirectoryClient({ patients, source, preview }: { patients: PatientRecord[]; source: DirectorySource; preview: string }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const [createOpen, setCreateOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() => {
    if (!deferredQuery) return patients;
    return patients.filter((patient) => [patient.name, patient.mrn, patient.birthDate, searchDate(patient.birthDate)].filter(Boolean).join(' ').toLowerCase().includes(deferredQuery));
  }, [deferredQuery, patients]);

  function retry() {
    setRefreshing(true);
    router.refresh();
  }

  function openCreated(patientId: string) {
    setCreateOpen(false);
    router.push(withPreview(`/dashboard/records/${encodeURIComponent(patientId)}`, preview));
  }

  return (
    <main className="clinical-directory" aria-labelledby="directory-title">
      <header className="directory-header">
        <div className="directory-heading"><span className="directory-eyebrow">Clinical Directory</span><h1 id="directory-title">Patients</h1><p>Find a patient record and move directly into the clinical chart.</p><span className="directory-context">{source.state === 'ready' ? `${patients.length} Patient${patients.length === 1 ? '' : 's'} Available · ${source.source}` : 'Patient Directory Unavailable'}</span></div>
        <div className="directory-header-actions"><Link href={withPreview('/dashboard/records', preview)} className="directory-secondary-button">Health Records</Link><button type="button" onClick={() => setCreateOpen(true)} className="directory-primary-button">New Patient Record</button></div>
      </header>

      {source.state === 'unavailable' && <div className="directory-error" role="alert"><div><strong>Unable to Load Patient Directory</strong><span>{source.error || 'The clinical directory could not be retrieved.'}</span></div><button type="button" onClick={retry} disabled={refreshing}>{refreshing ? 'Retrying…' : 'Try Again'}</button></div>}
      {source.fallback && <div className="directory-fallback" role="status"><strong>Live directory unavailable</strong><span>Showing local demo records. These records are not live patient data.</span></div>}

      <section className="directory-toolbar" aria-label="Patient Search"><label className="directory-search"><span className="directory-search-icon" aria-hidden="true">⌕</span><span className="sr-only">Search Patients</span><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') setQuery(''); }} placeholder="Search by Name, MRN, or Date of Birth..." /><span className="directory-matching">{source.state === 'ready' ? `${filtered.length} Matching` : 'Unavailable'}</span></label></section>

      {source.state === 'ready' && filtered.length > 0 ? <section className="directory-surface" aria-label="Patient Directory"><div className="directory-list">{filtered.map((patient) => <PatientRow key={patient.id} patient={patient} preview={preview} />)}</div></section> : source.state === 'ready' ? <section className="directory-surface directory-empty" aria-live="polite"><div className="directory-empty-icon" aria-hidden="true">⌕</div><strong>{query ? 'No Patients Found' : 'No Patient Records Found'}</strong><p>{query ? 'Try searching by Patient Name, MRN, or Date of Birth.' : 'Create a New Patient Record to begin.'}</p>{query && <button type="button" onClick={() => setQuery('')} className="directory-secondary-button">Clear Search</button>}</section> : <DirectorySkeleton />}

      {createOpen && <CreatePatientDrawer preview={preview} onClose={() => setCreateOpen(false)} onCreated={openCreated} />}
    </main>
  );
}
