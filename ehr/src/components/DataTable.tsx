"use client";

import React from 'react';

type Column<T> = {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
};

type Props<T> = {
  columns: Column<T>[];
  data: T[];
  className?: string;
};

export default function DataTable<T>({ columns, data, className = '' }: Props<T>) {
  return (
    <div className={`w-full overflow-auto bg-white rounded-lg shadow-sm ${className}`}>
      <table className="w-full text-sm table-fixed">
        <thead className="bg-neutral-50 text-neutral-600">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="px-3 py-2 text-left">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} className="border-t last:border-b hover:bg-neutral-50">
              {columns.map((c) => (
                <td key={c.key} className="px-3 py-2 align-top break-words">{c.render ? c.render(row) : (row as any)[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
