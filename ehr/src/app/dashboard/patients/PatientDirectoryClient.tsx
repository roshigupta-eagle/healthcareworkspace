"use client";

import Link from 'next/link';
import { useDeferredValue, useState } from 'react';
import type { SchedulingPatient } from '@/lib/schedulingData';
import './patient-directory.css';

function formatBirthDate(value?: string) {
  if (!value) return 'DOB not documented';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? 'DOB not documented' : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function patientHref(patient: SchedulingPatient) {
  return `/doctor/health-records/patient/${encodeURIComponent(patient.id)}`;
}

export default function PatientDirectoryClient({ patients, source }: { patients: SchedulingPatient[]; source: { state: 'ready' | 'unavailable'; source: string; error?: string } }) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const filtered = patients.filter((patient) => !deferredQuery || [patient.name, patient.mrn, patient.birthDate].filter(Boolean).join(' ').toLowerCase().includes(deferredQuery));
  return <div className="patient-directory-page" aria-labelledby="patient-directory-title"><header className="patient-directory-header"><div><span className="patient-directory-eyebrow">Clinical directory</span><h1 id="patient-directory-title">Patients</h1><p>Find a patient record and move directly into the clinical chart.</p><span className="patient-directory-context">{source.state === 'ready' ? `${patients.length} patients available from ${source.source}` : 'Patient directory temporarily unavailable'}</span></div><div className="patient-directory-header-actions"><Link href="/dashboard/records" className="patient-directory-secondary-button">Health Records</Link><Link href="/dashboard/records" className="patient-directory-primary-button">New Patient Record</Link></div></header>{source.state === 'unavailable' && <div className="patient-directory-error" role="alert">Patient directory could not be loaded. Try again later.</div>}<section className="patient-directory-toolbar" aria-label="Patient search"><label><span className="sr-only">Search patients</span><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') setQuery(''); }} placeholder="Search by name, MRN, or date of birth..." /></label><span>{source.state === 'ready' ? `${filtered.length} matching` : 'Unavailable'}</span></section><section className="patient-directory-surface" aria-label="Patient directory">{source.state === 'ready' && filtered.length ? <div className="patient-directory-list">{filtered.map((patient) => <article className="patient-directory-row" key={patient.id}><div className="patient-directory-avatar" aria-hidden="true">{patient.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')}</div><div className="patient-directory-identity"><h2>{patient.name}</h2><p>{formatBirthDate(patient.birthDate)} · {patient.mrn ? `MRN ${patient.mrn}` : 'MRN not documented'}</p></div><span className="patient-directory-status">Active record</span><Link href={patientHref(patient)} className="patient-directory-open">Open Record <span aria-hidden="true">-&gt;</span></Link></article>)}</div> : <div className="patient-directory-empty"><strong>{source.state === 'ready' ? 'No patients found' : 'Patient directory unavailable'}</strong><p>{source.state === 'ready' ? 'Try a different name, MRN, or date of birth.' : 'The connected patient source did not respond.'}</p>{source.state === 'ready' && <button type="button" className="patient-directory-secondary-button" onClick={() => setQuery('')}>Clear Search</button>}</div>}</section></div>;
}
