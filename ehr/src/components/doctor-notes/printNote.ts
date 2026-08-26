import type { DoctorNote } from '@/types/doctorNote';
import { NOTE_STATUS_LABELS, NOTE_TYPE_LABELS, formatNoteDateTime } from './constants';

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Renders a print-friendly view of a single note in a new tab and triggers the browser print dialog. */
export function printNote(note: DoctorNote, patientName: string, mode: 'print' | 'export' = 'print') {
  const win = window.open('', '_blank', 'noopener,noreferrer');
  if (!win) return;

  const sectionsHtml = note.sections
    .map((s) => `<div class="section">${s.heading ? `<h3>${escapeHtml(s.heading)}</h3>` : ''}<p>${escapeHtml(s.body || '—')}</p></div>`)
    .join('');

  const addendaHtml = note.addenda.length
    ? `<div class="addenda"><h3>Addenda</h3>${note.addenda
        .map((a) => `<div class="addendum"><p>${escapeHtml(a.text)}</p><div class="meta">${escapeHtml(a.author.name)} · ${formatNoteDateTime(a.createdAt)}</div></div>`)
        .join('')}</div>`
    : '';

  win.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${mode === 'export' ? 'Export' : 'Print'} — ${escapeHtml(NOTE_TYPE_LABELS[note.type])}</title>
<style>
  body { font-family: -apple-system, Segoe UI, Arial, sans-serif; color: #1e293b; padding: 32px; max-width: 720px; margin: 0 auto; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .meta-row { color: #64748b; font-size: 13px; margin-bottom: 20px; }
  .section { margin-bottom: 18px; }
  .section h3 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; margin-bottom: 6px; }
  .section p, .addendum p { white-space: pre-wrap; line-height: 1.6; font-size: 14px; }
  .addenda { margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
  .addendum { background: #f8fafc; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; }
  .addendum .meta { font-size: 11px; color: #94a3b8; margin-top: 4px; }
  .footer { margin-top: 32px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
  @media print { .footer-actions { display: none; } }
</style>
</head>
<body>
  <h1>${escapeHtml(NOTE_TYPE_LABELS[note.type])}</h1>
  <div class="meta-row">
    ${escapeHtml(patientName)} &middot; Author: ${escapeHtml(note.author.name)} &middot; ${formatNoteDateTime(note.createdAt)} &middot; ${escapeHtml(NOTE_STATUS_LABELS[note.status])}
    ${note.signer ? ` &middot; Signed by ${escapeHtml(note.signer.name)} on ${formatNoteDateTime(note.signedAt)}` : ''}
  </div>
  ${sectionsHtml}
  ${addendaHtml}
  <div class="footer">Printed ${new Date().toLocaleString()} &middot; Roshi EHR</div>
</body>
</html>`);
  win.document.close();
  win.focus();
  win.onload = () => win.print();
}

/** Renders a print-friendly combined view of multiple notes (used by the page-level Print / Export actions). */
export function printNoteList(notes: DoctorNote[], patientName: string) {
  const win = window.open('', '_blank', 'noopener,noreferrer');
  if (!win) return;

  const body = notes
    .map((note) => {
      const sectionsHtml = note.sections
        .map((s) => `<div class="section">${s.heading ? `<h4>${escapeHtml(s.heading)}</h4>` : ''}<p>${escapeHtml(s.body || '—')}</p></div>`)
        .join('');
      return `<div class="note">
        <h2>${escapeHtml(NOTE_TYPE_LABELS[note.type])}</h2>
        <div class="meta-row">${escapeHtml(note.author.name)} &middot; ${formatNoteDateTime(note.createdAt)} &middot; ${escapeHtml(NOTE_STATUS_LABELS[note.status])}</div>
        ${sectionsHtml}
      </div>`;
    })
    .join('<hr />');

  win.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Doctor Notes — ${escapeHtml(patientName)}</title>
<style>
  body { font-family: -apple-system, Segoe UI, Arial, sans-serif; color: #1e293b; padding: 32px; max-width: 760px; margin: 0 auto; }
  h1 { font-size: 20px; margin-bottom: 16px; }
  h2 { font-size: 16px; margin-bottom: 4px; }
  .meta-row { color: #64748b; font-size: 12px; margin-bottom: 12px; }
  .section h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; margin-bottom: 4px; }
  .section p { white-space: pre-wrap; line-height: 1.6; font-size: 13px; margin-bottom: 10px; }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
  .footer { margin-top: 24px; font-size: 11px; color: #94a3b8; }
</style>
</head>
<body>
  <h1>Doctor Notes — ${escapeHtml(patientName)}</h1>
  ${body}
  <div class="footer">Printed ${new Date().toLocaleString()} &middot; Roshi EHR &middot; ${notes.length} note(s)</div>
</body>
</html>`);
  win.document.close();
  win.focus();
  win.onload = () => win.print();
}
