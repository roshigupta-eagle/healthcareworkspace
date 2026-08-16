"use client";

import React from 'react';
import WidgetEmptyState from '../WidgetEmptyState';

export default function RoomsTab() {
  // Minimal placeholder — real implementation should call roomService
  return (
    <div>
      <WidgetEmptyState title="Rooms and patient flow" message="No rooms data available in demo mode." />
    </div>
  );
}
