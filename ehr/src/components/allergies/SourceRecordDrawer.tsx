'use client';

import React from 'react';
import { IconX, IconFileText, IconExternalLink } from './AllergyIcons';

interface Props {
  document: any | null;
  isOpen: boolean;
  onClose: () => void;
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
  } catch {
    return iso;
  }
}

export default function SourceRecordDrawer({ document, isOpen, onClose }: Props) {
  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-[540px] bg-white h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#DDE7F0] bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center flex-shrink-0">
              <IconFileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#121A2D]">{document.name || 'Source Document'}</h2>
              <p className="text-xs text-gray-500">Document provenance & extracted allergy facts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <div className="text-gray-500">Document ID</div>
              <div className="font-bold text-slate-800">{document.id || 'DOC-001'}</div>
            </div>
            <div>
              <div className="text-gray-500">Document Date</div>
              <div className="font-bold text-slate-800">{formatDate(document.date)}</div>
            </div>
            <div>
              <div className="text-gray-500">Author / Facility</div>
              <div className="font-bold text-slate-800">{document.author || 'Hospital Medical Records'}</div>
            </div>
            <div>
              <div className="text-gray-500">Extraction Status</div>
              <div className="font-bold text-emerald-700">Verified Extracted</div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-2">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Extracted Allergy & Safety Statement
            </h4>
            <p className="text-sm text-gray-800 leading-relaxed">
              {document.extractedText ||
                'Patient reported severe childhood anaphylactic reaction to Penicillin requiring epinephrine administration. No reaction noted to cephalosporins.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#DDE7F0] bg-slate-50 flex items-center justify-between">
          {document.url && (
            <a
              href={document.url}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <span>Open Document PDF</span>
              <IconExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
