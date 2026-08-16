"use client";

import React from 'react';

export default function WidgetLoadingSkeleton() {
  return (
    <div className="p-6 bg-white border rounded animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-48 mb-4" />
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded" />
        <div className="h-3 bg-gray-200 rounded w-5/6" />
        <div className="h-3 bg-gray-200 rounded w-3/4" />
      </div>
    </div>
  );
}
