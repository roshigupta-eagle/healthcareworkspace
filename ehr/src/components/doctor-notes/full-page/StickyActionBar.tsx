"use client";

type Props = {
  saveStatusText: string;
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  onSaveDraft: () => void;
  onPreview: () => void;
  onReviewAndSign: () => void;
};

export default function StickyActionBar({ saveStatusText, saveState, onSaveDraft, onPreview, onReviewAndSign }: Props) {
  return (
    <div className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur px-5 py-3 flex items-center justify-between">
      <span
        aria-live="polite"
        className={`text-xs font-medium ${saveState === 'error' ? 'text-rose-600' : saveState === 'saving' ? 'text-slate-400' : 'text-emerald-600'}`}
      >
        {saveStatusText}
      </span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onSaveDraft} className="px-3 py-2 text-sm font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50">
          Save Draft
        </button>
        <button type="button" onClick={onPreview} className="px-3 py-2 text-sm font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50">
          Preview
        </button>
        <button type="button" onClick={onReviewAndSign} className="px-4 py-2 text-sm font-semibold rounded-md bg-teal-600 text-white hover:bg-teal-700">
          Review &amp; Sign
        </button>
      </div>
    </div>
  );
}
