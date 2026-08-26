"use client";

import React, { useMemo, useState } from 'react';
import type { DoctorNoteSection } from '@/types/doctorNote';
import type { Patient } from '@/app/dashboard/records/mockPatients';
import type { DraftContextSelection, DraftDetail, DraftDocumentType, DraftFormat, DraftTone } from '@/lib/aiNoteDraft';
import { AlertIcon, CalendarIcon, DocumentIcon, SparkleIcon } from '@/components/doctor-notes/Icons';

type Props = { patientId: string; patient: Patient; sections: DoctorNoteSection[]; selectedText?: string; onInsertDraft: (text: string) => void; onReplaceSelection: (text: string) => void };
type DraftResult = { draft: string; sources: Array<{ type: string; id: string; display: string; date?: string; href?: string }>; conflicts?: Array<{ field: string; userValue: string; authoritativeValue: string; message: string }>; warnings?: string[]; wordCount?: number; model?: string };

const TYPES: Array<[DraftDocumentType, string]> = [['patient-instructions', 'Patient Instructions'], ['clinical-paragraph', 'Clinical Paragraph'], ['visit-summary', 'Visit Summary'], ['follow-up', 'Follow-Up Instructions'], ['patient-message', 'Patient Message'], ['referral', 'Referral / Consultation Text'], ['care-plan-instructions', 'Care Plan Instructions'], ['letter', 'Clinical Letter'], ['structured-note', 'Structured Clinical Note'], ['freeform', 'Freeform']];
const FORMATS: Array<[DraftFormat, string]> = [['short-paragraph', 'Short Paragraph'], ['detailed-paragraph', 'Detailed Paragraph'], ['long-form', 'Long-Form / Essay Style'], ['bullets', 'Bulleted List'], ['numbered-steps', 'Numbered Steps'], ['structured-sections', 'Headings + Sections'], ['letter', 'Letter Format'], ['template', 'Clinical Template']];
const TONES: Array<[DraftTone, string]> = [['professional', 'Professional'], ['clinical', 'Clinical'], ['patient-friendly', 'Patient-Friendly'], ['warm', 'Warm & Reassuring'], ['concise', 'Direct & Concise'], ['formal', 'Formal'], ['plain-language', 'Plain Language']];
const DETAILS: Array<[DraftDetail, string]> = [['concise', 'Concise'], ['standard', 'Standard'], ['detailed', 'Detailed'], ['very-detailed', 'Very Detailed']];

function formatDate(value?: string) {
  if (!value) return 'Date not documented';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function summaryText(sections: DoctorNoteSection[]) { const text = sections.map((section) => section.body).join(' ').replace(/\s+/g, ' ').trim(); return text ? text.split(/(?<=[.!?])\s+/).slice(0, 3).join(' ') : 'Nothing has been documented yet.'; }

function SelectField<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<[T, string]>; onChange: (value: T) => void }) {
  return <label className="text-[11px] font-bold text-slate-600">{label}<select value={value} onChange={(event) => onChange(event.target.value as T)} className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-2 text-xs"><option value="">Select</option>{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>;
}

function ContextRow({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return <label className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={checked} onChange={onChange} className="h-3.5 w-3.5 rounded border-slate-300 text-violet-600" />{children}</label>;
}

export default function AiDraftAssistant({ patientId, patient, sections, selectedText, onInsertDraft, onReplaceSelection }: Props) {
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [documentType, setDocumentType] = useState<DraftDocumentType>('clinical-paragraph');
  const [format, setFormat] = useState<DraftFormat>('detailed-paragraph');
  const [tone, setTone] = useState<DraftTone>('clinical');
  const [detail, setDetail] = useState<DraftDetail>('standard');
  const [audience, setAudience] = useState('Clinician');
  const [structure, setStructure] = useState('Automatic');
  const [context, setContext] = useState<DraftContextSelection[]>([{ type: 'patient-demographics' }]);
  const [result, setResult] = useState<DraftResult | null>(null);
  const [conflicts, setConflicts] = useState<DraftResult['conflicts']>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [inserted, setInserted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [variants, setVariants] = useState<DraftResult[]>([]);
  const [review, setReview] = useState<'check' | 'summary' | null>(null);

  const appointments = (patient?.upcoming || []) as Array<{ id: string; date: string; type: string; doctor: string }>;
  const documents = (patient?.documents || []) as Array<{ id: string; name: string; date?: string; status?: string }>;
  const labResults = patient?.labResults || [];
  const contextKeys = useMemo(() => new Set(context.map((item) => `${item.type}:${item.id || ''}`)), [context]);
  const noteSummary = useMemo(() => summaryText(sections), [sections]);
  const checkIssues = useMemo(() => {
    const issues: string[] = [];
    if (!sections.some((section) => section.body.trim())) issues.push('No clinical content has been documented yet.');
    if (!sections.some((section) => /plan/i.test(section.heading))) issues.push('No Plan section is present.');
    if (sections.some((section) => /\{\{|\}\}/.test(section.body))) issues.push('A template placeholder remains unresolved.');
    return issues;
  }, [sections]);

  function toggle(selection: DraftContextSelection) {
    const key = `${selection.type}:${selection.id || ''}`;
    setContext((current) => current.some((item) => `${item.type}:${item.id || ''}` === key) ? current.filter((item) => `${item.type}:${item.id || ''}` !== key) : [...current, selection]);
  }

  async function generate(allowConflicts = false, mode: 'generate' | 'regenerate' = 'generate') {
    if (!instruction.trim()) { setError('Describe what you want Roshi to draft.'); return; }
    setLoading(true); setError(null); setConflicts([]); setInserted(false); setCopied(false);
    if (mode === 'generate') setVariants([]);
    try {
      const response = await fetch(`/api/patients/${encodeURIComponent(patientId)}/notes/ai-draft`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ instruction, documentType, format, tone, detail, audience, structure, contextSelections: context, selectedText, allowConflicts, mode, previousDraft: mode === 'regenerate' ? result?.draft : undefined }) });
      const body = await response.json().catch(() => null) as DraftResult & { error?: string };
      if (response.status === 409) { setConflicts(body.conflicts || []); return; }
      if (!response.ok) throw new Error(body.error || 'We could not generate this draft.');
      setResult(body);
      setVariants((current) => mode === 'regenerate' ? [...current, body] : [body]);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'We could not generate this draft.'); }
    finally { setLoading(false); }
  }

  function patientFriendly() { setDocumentType('patient-message'); setTone('patient-friendly'); setAudience('Patient'); setInstruction('Create a patient-friendly explanation of the documented draft without adding new diagnoses, treatments, or instructions.'); setOpen(true); }
  function improveSelected() { if (!selectedText?.trim()) return; setDocumentType('clinical-paragraph'); setFormat('detailed-paragraph'); setTone('professional'); setInstruction('Improve the selected text for clarity and grammar without changing its meaning.'); setOpen(true); }

  return <div className="space-y-4">
    <section className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3"><div><h3 className="inline-flex items-center gap-2 text-sm font-bold text-slate-900"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><SparkleIcon size={16} /></span>AI Documentation Assistant</h3><p className="mt-2 text-xs leading-5 text-slate-500">Draft text only. Clinical review is required before insertion or signing.</p></div><span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-700">Review required</span></div>
      <div className="mt-4 grid gap-2"><button type="button" onClick={() => setOpen((value) => !value)} className="flex min-h-10 items-center justify-between rounded-xl bg-violet-700 px-3 text-left text-sm font-bold text-white hover:bg-violet-800"><span className="inline-flex items-center gap-2"><SparkleIcon size={16} />Draft with AI</span><span aria-hidden>{open ? '-' : '+'}</span></button><button type="button" disabled={!selectedText?.trim()} onClick={improveSelected} className="min-h-9 rounded-xl border border-violet-200 px-3 text-left text-xs font-bold text-violet-800 disabled:opacity-45">Improve Selected Text</button><button type="button" onClick={() => setReview('check')} className="min-h-9 rounded-xl border border-slate-200 px-3 text-left text-xs font-bold text-slate-700">Documentation Check</button><button type="button" onClick={() => setReview('summary')} className="min-h-9 rounded-xl border border-slate-200 px-3 text-left text-xs font-bold text-slate-700">Summarize Draft</button><button type="button" onClick={patientFriendly} className="min-h-9 rounded-xl border border-slate-200 px-3 text-left text-xs font-bold text-slate-700">Create Patient-Friendly Draft</button></div>
      {open && <div className="mt-4 border-t border-violet-100 pt-4">
        <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">What do you want to write?<textarea data-ai-instruction value={instruction} onChange={(event) => setInstruction(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); void generate(); } }} rows={4} placeholder="Describe what you want Roshi to draft..." className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /><span className="mt-1 block text-[10px] font-normal normal-case tracking-normal text-slate-400">Ctrl+Enter / Cmd+Enter to generate. Shift+Enter creates a new line.</span></label>
        <div className="mt-4 grid grid-cols-2 gap-3"><SelectField label="Document Type" value={documentType} options={TYPES} onChange={setDocumentType} /><SelectField label="Format" value={format} options={FORMATS} onChange={setFormat} /><SelectField label="Tone" value={tone} options={TONES} onChange={setTone} /><SelectField label="Detail" value={detail} options={DETAILS} onChange={setDetail} /><label className="text-[11px] font-bold text-slate-600">Audience<select value={audience} onChange={(event) => setAudience(event.target.value)} className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-2 text-xs"><option>Clinician</option><option>Patient</option><option>Caregiver</option><option>Specialist</option><option>General Healthcare Team</option></select></label><label className="text-[11px] font-bold text-slate-600">Structure<select value={structure} onChange={(event) => setStructure(event.target.value)} className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-2 text-xs"><option>Automatic</option><option>Paragraph</option><option>Bullets</option><option>Numbered Steps</option><option>Headings + Sections</option><option>Letter</option><option>Clinical Template</option></select></label></div>
        <fieldset className="mt-4"><legend className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Use context from</legend><div className="mt-2 grid gap-2"><ContextRow checked={contextKeys.has('patient-demographics:')} onChange={() => toggle({ type: 'patient-demographics' })}>Patient demographics</ContextRow>{appointments.map((appointment) => <ContextRow key={appointment.id} checked={contextKeys.has(`appointment:${appointment.id}`)} onChange={() => toggle({ type: 'appointment', id: appointment.id })}><CalendarIcon size={14} />{appointment.type} - {formatDate(appointment.date)} - {appointment.doctor}</ContextRow>)}{patient?.conditions?.length > 0 && <ContextRow checked={contextKeys.has('conditions:')} onChange={() => toggle({ type: 'conditions' })}>Active conditions ({patient.conditions.length})</ContextRow>}{patient?.medications?.length > 0 && <ContextRow checked={contextKeys.has('medications:')} onChange={() => toggle({ type: 'medications' })}>Active medications ({patient.medications.length})</ContextRow>}{labResults.map((lab) => <ContextRow key={lab.id} checked={contextKeys.has(`result:${lab.id}`)} onChange={() => toggle({ type: 'result', id: lab.id })}><span className="min-w-0"><span className="block truncate">{lab.name}</span><span className="block text-[10px] font-medium text-slate-500">{[lab.result, lab.unit, lab.interpretation, formatDate(lab.date)].filter(Boolean).join(' - ')} ({lab.status || 'Recorded'})</span></span></ContextRow>)}{documents.map((document) => <ContextRow key={document.id} checked={contextKeys.has(`document:${document.id}`)} onChange={() => toggle({ type: 'document', id: document.id })}><DocumentIcon size={14} />{document.name} - {document.status || 'Recorded'}</ContextRow>)}</div></fieldset>
        {error && <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800" role="alert"><AlertIcon size={16} />{error}</div>}{conflicts?.length ? <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900" role="alert"><div className="flex items-center gap-2 font-bold"><AlertIcon size={16} />Date or provider conflict detected</div>{conflicts.map((conflict) => <div key={`${conflict.field}-${conflict.userValue}`} className="mt-2">{conflict.message}</div>)}<div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => void generate(true)} className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-bold text-white">Use authoritative record</button><button type="button" onClick={() => { setContext((current) => current.filter((item) => item.type !== 'appointment')); setConflicts([]); }} className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-900">Continue without appointment context</button><button type="button" onClick={() => { setConflicts([]); document.querySelector<HTMLTextAreaElement>('[data-ai-instruction]')?.focus(); }} className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-900">Edit request</button></div></div> : null}
        <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => { setOpen(false); setResult(null); setConflicts([]); }} className="min-h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700">Cancel</button><button type="button" disabled={loading} onClick={() => void generate()} className="min-h-9 rounded-lg bg-violet-700 px-4 text-xs font-bold text-white disabled:opacity-60"><SparkleIcon size={14} />{loading ? ' Generating draft...' : ' Generate Draft'}</button></div>
        {loading && <div className="mt-3 text-xs font-semibold text-violet-700" aria-live="polite">Generating your draft using only the selected context...</div>}
        {result && <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50/50 p-4"><div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-bold uppercase tracking-wide text-violet-700">AI Draft - Clinical review required</div><h4 className="mt-1 text-sm font-bold text-slate-900">Preview before insertion</h4></div><button type="button" onClick={() => setResult(null)} className="text-xs font-bold text-slate-500">Close</button></div><pre className="mt-3 max-h-80 overflow-y-auto whitespace-pre-wrap rounded-xl bg-white p-3 text-sm leading-6 text-slate-800">{result.draft}</pre>{result.warnings?.length ? <div className="mt-3 text-xs font-semibold text-amber-800">{result.warnings.join(' ')}</div> : null}<div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => { onInsertDraft(result.draft); setInserted(true); }} className="min-h-9 rounded-lg bg-teal-700 px-3 text-xs font-bold text-white">Insert into Note</button><button type="button" disabled={!selectedText?.trim()} onClick={() => { onReplaceSelection(result.draft); setInserted(true); }} className="min-h-9 rounded-lg border border-teal-200 bg-white px-3 text-xs font-bold text-teal-800 disabled:opacity-40">Replace Selection</button><button type="button" onClick={() => void generate(false, 'regenerate')} disabled={loading} className="min-h-9 rounded-lg border border-violet-200 bg-white text-xs font-bold text-violet-800 disabled:opacity-50">{loading ? 'Regenerating...' : 'Regenerate'}</button><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(result.draft); setCopied(true); window.setTimeout(() => setCopied(false), 1600); } catch { setError('Copy failed. Your draft remains available for review.'); } }} className="min-h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700">{copied ? 'Copied' : 'Copy'}</button><button type="button" onClick={() => setSourcesOpen((value) => !value)} className="min-h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700">View Sources</button><button type="button" onClick={() => { setOpen(true); document.querySelector<HTMLTextAreaElement>('[data-ai-instruction]')?.focus(); }} className="min-h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700">Edit Instructions</button></div>{variants.length > 1 && <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600"><span className="font-bold">Versions:</span>{variants.map((variant, index) => <button key={`${index}`} type="button" onClick={() => setResult(variant)} className={`rounded-lg px-2.5 py-1 font-bold ${variant.draft === result.draft ? 'bg-violet-700 text-white' : 'border border-violet-200 bg-white text-violet-800'}`}>Draft {index + 1}</button>)}</div>}{inserted && <div className="mt-3 text-xs font-bold text-emerald-700" role="status">Draft inserted into the editable note. Review before saving or signing.</div>}{sourcesOpen && <div className="mt-3 border-t border-violet-200 pt-3"><div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Authoritative chart sources</div>{result.sources.length ? result.sources.map((source) => <div key={`${source.type}-${source.id}`} className="mt-2 rounded-lg bg-white p-2 text-xs text-slate-700">{source.href ? <a href={source.href} className="font-semibold text-violet-800 underline">{source.type} - {source.display}{source.date ? ` - ${formatDate(source.date)}` : ''}</a> : <span><span className="font-bold">{source.type}</span> - {source.display}{source.date ? ` - ${formatDate(source.date)}` : ''}</span>}</div>) : <div className="mt-2 rounded-lg bg-white p-2 text-xs text-slate-600">No chart sources were used for this draft.</div>}</div>}</div>}
      </div>}
    </section>
    {review && <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-900">{review === 'check' ? 'Documentation Check' : 'Draft Summary'}</h3><button type="button" onClick={() => setReview(null)} className="text-xs font-bold text-slate-500">Close</button></div>{review === 'check' ? checkIssues.length ? <ul className="mt-3 space-y-2 text-xs text-amber-800">{checkIssues.map((issue) => <li key={issue} className="flex gap-2"><AlertIcon size={14} />{issue}</li>)}</ul> : <p className="mt-3 text-xs font-semibold text-emerald-700">Configured documentation checks passed.</p> : <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{noteSummary}</p>}</section>}
  </div>;
}
