"use client";

import { useRef } from 'react';
import TiptapEditor, { type TiptapEditorHandle } from '@/components/notes/TiptapEditor';
import { SMART_PHRASES } from '@/lib/noteTemplates';

type Props = {
  heading: string;
  body: string;
  required?: boolean;
  onChange: (body: string) => void;
  onSelectionText?: (text: string) => void;
};

export default function NoteSectionEditor({ heading, body, required, onChange, onSelectionText }: Props) {
  const editorRef = useRef<TiptapEditorHandle>(null);
  const complete = body.trim().length > 0;
  const anchorId = `section-${heading.toLowerCase().replace(/\s+/g, '-') || 'note'}`;

  return (
    <section id={anchorId} className="scroll-mt-24 border-t border-slate-100 pt-6 first:border-0 first:pt-0">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {heading && <h3 className="text-[15px] font-semibold text-slate-900">{heading}</h3>}
          {required && <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Required</span>}
          <span className={`h-1.5 w-1.5 rounded-full ${complete ? 'bg-emerald-500' : 'bg-slate-300'}`} aria-hidden />
        </div>
        {Object.keys(SMART_PHRASES).length > 0 && (
          <select
            defaultValue=""
            aria-label={`Insert smart phrase into ${heading || 'note'}`}
            onChange={(e) => {
              const phrase = SMART_PHRASES[e.target.value];
              if (phrase) editorRef.current?.insertText(phrase);
              e.currentTarget.value = '';
            }}
            className="text-xs rounded-md border border-slate-200 px-2 py-1 text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
          >
            <option value="">Insert Smart Phrase…</option>
            {Object.keys(SMART_PHRASES).map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        )}
      </div>
      <TiptapEditor ref={editorRef} initialText={body} editable onChangeText={onChange} onSelectionText={onSelectionText} placeholder={`Document ${(heading || 'this section').toLowerCase()}...`} />
    </section>
  );
}
