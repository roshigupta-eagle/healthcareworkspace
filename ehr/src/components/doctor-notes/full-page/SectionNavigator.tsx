"use client";

type Props = {
  sections: Array<{ heading: string; complete: boolean }>;
};

/** Compact jump-to-section navigator; does not replace the main content hierarchy. */
export default function SectionNavigator({ sections }: Props) {
  const named = sections.filter((s) => s.heading);
  if (named.length < 2) return null;

  return (
    <nav aria-label="Note sections" className="hidden lg:flex flex-col gap-1 sticky top-4 text-xs">
      {named.map((s) => (
        <a
          key={s.heading}
          href={`#section-${s.heading.toLowerCase().replace(/\s+/g, '-')}`}
          className="flex items-center gap-1.5 rounded px-2 py-1 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
        >
          <span className={`h-1.5 w-1.5 rounded-full ${s.complete ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          {s.heading}
        </a>
      ))}
    </nav>
  );
}
