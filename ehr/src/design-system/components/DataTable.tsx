'use client';

/**
 * Layer 3 — Component: DataTable
 *
 * Accessible, sortable table for clinical data sets. Supports:
 *  - Column sort (asc/desc) with aria-sort via inner <button> (WCAG 1.3.1)
 *  - Row-level action slot (rowAction)
 *  - Controlled row selection with bulk-action pattern (selectedIds / onSelectionChange)
 *  - Zebra striping for dense data views
 *  - Empty-state slot
 *  - Loading skeleton rows
 *  - Row click handler
 *
 * Designed for lab results, medication lists, patient search results,
 * appointment queues, and order tracking.
 */

import React from 'react';
import { cn } from '../utils/cn';
import { Spinner } from '../primitives/Spinner';

export type SortDirection = 'asc' | 'desc' | null;

export interface ColumnDef<T> {
  key: string;
  header: string;
  /** Cell render function — receives the row object */
  render: (row: T) => React.ReactNode;
  /** Column CSS width (e.g. '160px', '20%') */
  width?: string;
  /** Whether this column supports sorting */
  sortable?: boolean;
  /** Right-align — for numeric clinical values */
  numeric?: boolean;
}

export interface DataTableProps<T extends { id: string | number }> {
  columns: ColumnDef<T>[];
  rows: T[];
  sortKey?: string;
  sortDirection?: SortDirection;
  onSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
  /** Per-row action slot — rendered in a fixed last column */
  rowAction?: (row: T) => React.ReactNode;
  /** Controlled selection — set of selected row ids */
  selectedIds?: Set<string | number>;
  /** Called when selection changes */
  onSelectionChange?: (ids: Set<string | number>) => void;
  striped?: boolean;
  loading?: boolean;
  emptyState?: React.ReactNode;
  caption?: string;
  className?: string;
}

function SortIcon({ direction }: { direction: SortDirection }) {
  return (
    <span aria-hidden="true" className="ml-1 inline-flex flex-col opacity-60">
      <svg
        className={cn('h-3 w-3 -mb-1', direction === 'asc' ? 'opacity-100 text-primary-600' : '')}
        viewBox="0 0 12 12"
        fill="currentColor"
      >
        <path d="M6 2l4 4H2z" />
      </svg>
      <svg
        className={cn('h-3 w-3', direction === 'desc' ? 'opacity-100 text-primary-600' : '')}
        viewBox="0 0 12 12"
        fill="currentColor"
      >
        <path d="M6 10L2 6h8z" />
      </svg>
    </span>
  );
}

export function DataTable<T extends { id: string | number }>({
  columns,
  rows,
  sortKey,
  sortDirection = null,
  onSort,
  onRowClick,
  rowAction,
  selectedIds,
  onSelectionChange,
  striped = false,
  loading = false,
  emptyState,
  caption,
  className,
}: DataTableProps<T>) {
  const selectable = !!onSelectionChange;
  const allSelected = selectable && rows.length > 0 && rows.every((r) => selectedIds?.has(r.id));
  const someSelected = selectable && rows.some((r) => selectedIds?.has(r.id));

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(rows.map((r) => r.id)));
    }
  };

  const toggleRow = (id: string | number) => {
    if (!onSelectionChange || !selectedIds) return;
    const next = new Set(selectedIds);
    if (next.has(id)) { next.delete(id); } else { next.add(id); }
    onSelectionChange(next);
  };

  const colSpanTotal = columns.length + (selectable ? 1 : 0) + (rowAction ? 1 : 0);
  return (
    <div className={cn('overflow-x-auto rounded-xl border border-neutral-200', className)}>
      <table className="min-w-full divide-y divide-neutral-200 text-sm">
        {caption && (
          <caption className="sr-only">{caption}</caption>
        )}

        <thead className="bg-neutral-50">
          <tr>
            {/* Select-all checkbox column */}
            {selectable && (
              <th scope="col" className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all rows"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = !allSelected && someSelected; }}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-600"
                />
              </th>
            )}
            {columns.map((col) => {
              const isActive = sortKey === col.key;
              const ariaSort: React.AriaAttributes['aria-sort'] = isActive
                ? sortDirection === 'asc' ? 'ascending' : 'descending'
                : col.sortable ? 'none' : undefined;

              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={ariaSort}
                  style={col.width ? { width: col.width } : undefined}
                  className={cn(
                    'px-4 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider',
                    col.numeric ? 'text-right' : 'text-left',
                  )}
                >
                  {col.sortable && onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(col.key)}
                      className={cn(
                        'inline-flex items-center gap-1 w-full rounded',
                        col.numeric ? 'justify-end' : 'justify-start',
                        'hover:text-neutral-900 transition-colors select-none',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600',
                      )}
                    >
                      {col.header}
                      <SortIcon direction={isActive ? sortDirection : null} />
                    </button>
                  ) : (
                    <span className="inline-flex items-center">{col.header}</span>
                  )}
                </th>
              );
            })}
            {/* Row actions header — empty, visually hidden label */}
            {rowAction && (
              <th scope="col" className="w-16 px-4 py-3">
                <span className="sr-only">Actions</span>
              </th>
            )}
          </tr>
        </thead>

        <tbody className="divide-y divide-neutral-100 bg-white">
          {loading && (
            <tr>
              <td colSpan={colSpanTotal} className="py-12 text-center">
                <div className="flex flex-col items-center gap-3 text-neutral-400">
                  <Spinner size="md" />
                  <span className="text-xs">Loading data…</span>
                </div>
              </td>
            </tr>
          )}

          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={colSpanTotal} className="py-12 text-center text-sm text-neutral-500">
                {emptyState ?? 'No records found.'}
              </td>
            </tr>
          )}

          {!loading &&
            rows.map((row, rowIdx) => {
              const isSelected = selectedIds?.has(row.id) ?? false;
              return (
                <tr
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => { if (e.key === 'Enter') onRowClick(row); }
                      : undefined
                  }
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? 'button' : undefined}
                  aria-selected={selectable ? isSelected : undefined}
                  className={cn(
                    striped && rowIdx % 2 !== 0 && 'bg-neutral-50',
                    isSelected && 'bg-primary-50',
                    onRowClick && 'cursor-pointer hover:bg-primary-50 focus-visible:outline-none focus-visible:bg-primary-50 transition-colors',
                  )}
                >
                  {selectable && (
                    <td className="w-10 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select row ${row.id}`}
                        checked={isSelected}
                        onChange={() => toggleRow(row.id)}
                        className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-600"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4 py-3 text-sm text-neutral-800',
                        col.numeric && 'text-right font-mono tabular-nums',
                      )}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                  {rowAction && (
                    <td
                      className="w-16 px-4 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {rowAction(row)}
                    </td>
                  )}
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
