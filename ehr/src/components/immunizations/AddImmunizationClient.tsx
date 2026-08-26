"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from './ImmunizationIcons';

export default function AddImmunizationClient({ patientId, patientName }: { patientId: string; patientName: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', date: '', status: 'completed', nextReview: '', manufacturer: '', lotNumber: '', site: '', route: '', provider: '', notes: '' });

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) {
      setError('Enter the vaccine or immunization name.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/patients/${encodeURIComponent(patientId)}/immunizations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const json = await response.json() as { error?: string };
      if (!response.ok) throw new Error(json.error || 'Unable to save the immunization.');
      router.push(`/dashboard/records/${patientId}/immunizations`);
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save the immunization.');
    } finally {
      setSaving(false);
    }
  }

  const inputClass = 'mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100';
  const labelClass = 'text-sm font-bold text-slate-800';

  return (
    <main className="w-full max-w-[980px] mx-auto px-4 sm:px-6" aria-labelledby="add-immunization-title">
      <Link href={`/dashboard/records/${patientId}/immunizations`} className="inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-teal-700 hover:bg-teal-50 focus-visible:ring-2 focus-visible:ring-teal-500"><span aria-hidden>←</span>Back to immunization history</Link>
      <section className="mt-5 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-9">
        <div className="flex items-start gap-4 border-b border-slate-100 pb-6"><div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-teal-50 text-teal-700"><Icon size={24} /></div><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-teal-700">Clinical record</p><h1 id="add-immunization-title" className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Add immunization</h1><p className="mt-2 text-sm text-slate-600">Record a documented vaccine for {patientName}. Add only information supported by the source record.</p></div></div>
        {error && <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-900" role="alert">{error}</div>}
        <form onSubmit={submit} className="mt-7 space-y-8">
          <fieldset><legend className="text-base font-bold text-slate-950">Administration</legend><div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2"><label className={labelClass}>Vaccine or immunization name<span className="ml-1 text-rose-600">*</span><input required value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="e.g. Influenza, COVID-19, MMR" className={inputClass} /></label><label className={labelClass}>Administration date<input type="date" value={form.date} onChange={(event) => updateField('date', event.target.value)} className={inputClass} /></label><label className={labelClass}>Record status<select value={form.status} onChange={(event) => updateField('status', event.target.value)} className={inputClass}><option value="completed">Completed</option><option value="planned">Planned</option><option value="not-done">Not given</option></select></label><label className={labelClass}>Next review date<input type="date" value={form.nextReview} onChange={(event) => updateField('nextReview', event.target.value)} className={inputClass} /></label></div></fieldset>
          <fieldset className="border-t border-slate-100 pt-7"><legend className="text-base font-bold text-slate-950">Source details <span className="font-normal text-slate-500">(optional)</span></legend><div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2"><label className={labelClass}>Manufacturer<input value={form.manufacturer} onChange={(event) => updateField('manufacturer', event.target.value)} className={inputClass} /></label><label className={labelClass}>Lot number<input value={form.lotNumber} onChange={(event) => updateField('lotNumber', event.target.value)} className={inputClass} /></label><label className={labelClass}>Administration site<input value={form.site} onChange={(event) => updateField('site', event.target.value)} placeholder="e.g. Left deltoid" className={inputClass} /></label><label className={labelClass}>Route<input value={form.route} onChange={(event) => updateField('route', event.target.value)} placeholder="e.g. Intramuscular" className={inputClass} /></label><label className={`${labelClass} sm:col-span-2`}>Administering provider<input value={form.provider} onChange={(event) => updateField('provider', event.target.value)} className={inputClass} /></label><label className={`${labelClass} sm:col-span-2`}>Clinical note<textarea value={form.notes} onChange={(event) => updateField('notes', event.target.value)} rows={4} className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100" /></label></div></fieldset>
          <div className="flex flex-col-reverse justify-end gap-3 border-t border-slate-100 pt-6 sm:flex-row"><Link href={`/dashboard/records/${patientId}/immunizations`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-teal-500">Cancel</Link><button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 text-sm font-bold text-white hover:bg-teal-800 disabled:cursor-wait disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2">{saving ? 'Saving…' : 'Save immunization'}</button></div>
        </form>
      </section>
    </main>
  );
}