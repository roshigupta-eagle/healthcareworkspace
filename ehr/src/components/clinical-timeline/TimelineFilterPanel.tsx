'use client';
import React from 'react';

export function TimelineFilterPanel() {
  return (
    <div>
      <h4>Filters</h4>
      <div>
        <label>Range</label>
        <select>
          <option>30 days</option>
          <option>6 months</option>
          <option>1 year</option>
          <option>All</option>
        </select>
      </div>
      <div style={{ marginTop: 8 }}>
        <label>Types</label>
        <div><input type="checkbox" defaultChecked /> Results</div>
        <div><input type="checkbox" defaultChecked /> Notes</div>
        <div><input type="checkbox" defaultChecked /> Medications</div>
        <div><input type="checkbox" defaultChecked /> Documents</div>
      </div>
    </div>
  );
}

export default TimelineFilterPanel;

