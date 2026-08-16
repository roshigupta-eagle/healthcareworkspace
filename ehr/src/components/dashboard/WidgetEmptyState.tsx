"use client";

import React from 'react';

export default function WidgetEmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <div className="p-6 bg-white border rounded text-center">
      <div className="text-sm font-semibold text-gray-700">{title}</div>
      {message && <div className="text-xs text-gray-500 mt-2">{message}</div>}
    </div>
  );
}
