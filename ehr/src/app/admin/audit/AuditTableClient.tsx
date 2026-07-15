"use client";

import { useState, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface AuditRow {
  id: string;
  ts: string;
  user: string;
  role: string;
  action: string;
  outcome: string;
  entityType: string;
  entityId: string;
  detail: string;
}

interface Props {
  rows: AuditRow[];
  entityTypes: string[];
  currentFilter?: string;
}

const ACTION_LABELS: Record<string, string> = {
  C: "Create", R: "Read", U: "Update", D: "Delete", E: "Execute",
};

const OUTCOME_CLASSES: Record<string, string> = {
  success: "bg-green-100 text-green-800",
  failure: "bg-red-100 text-red-800",
  denied: "bg-amber-100 text-amber-800",
};

export default function AuditTableClient({ rows, entityTypes, currentFilter }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [expanded, setExpanded] = useState<string | null>(null);

  const setFilter = useCallback(
    (val: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (val) params.set("entityType", val);
      else params.delete("entityType");
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  return (
    <div className="p-4 space-y-3">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm font-medium text-neutral-600">Filter by resource:</span>
        <button
          onClick={() => setFilter("")}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            !currentFilter
              ? "bg-sky-600 text-white"
              : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
          }`}
        >
          All
        </button>
        {entityTypes.map((et) => (
          <button
            key={et}
            onClick={() => setFilter(et)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              currentFilter === et
                ? "bg-sky-600 text-white"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            {et}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              {["Timestamp", "User", "Role", "Action", "Entity Type", "Entity ID", "Outcome"].map(
                (h) => (
                  <th
                    key={h}
                    className="text-left px-3 py-2 font-semibold text-neutral-700 whitespace-nowrap"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-neutral-500 text-sm">
                  No audit events found.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <>
                <tr
                  key={row.id}
                  className="hover:bg-neutral-50 cursor-pointer"
                  onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                >
                  <td className="px-3 py-2 text-neutral-600 font-mono text-xs whitespace-nowrap">
                    {new Date(row.ts).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-neutral-800 max-w-[180px] truncate">{row.user}</td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 text-xs">
                      {row.role}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-medium">{ACTION_LABELS[row.action] ?? row.action}</td>
                  <td className="px-3 py-2 text-neutral-600">{row.entityType}</td>
                  <td className="px-3 py-2 font-mono text-xs text-neutral-500 max-w-[120px] truncate">
                    {row.entityId}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        OUTCOME_CLASSES[row.outcome] ?? "bg-neutral-100 text-neutral-700"
                      }`}
                    >
                      {row.outcome}
                    </span>
                  </td>
                </tr>
                {expanded === row.id && row.detail !== "{}" && (
                  <tr key={`${row.id}-detail`} className="bg-neutral-50">
                    <td colSpan={7} className="px-6 py-2">
                      <pre className="text-xs text-neutral-700 whitespace-pre-wrap font-mono bg-white border rounded p-2">
                        {JSON.stringify(JSON.parse(row.detail), null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-neutral-400">
        Audit events are immutable and retained for 10 years per PHIPA §12.
      </p>
    </div>
  );
}
