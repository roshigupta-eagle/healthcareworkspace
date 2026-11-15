"use client";

import React from 'react';
import Link from 'next/link';

export default function DoctorWorkspaceLinks() {
  return <nav className="doctor-view-global-links" aria-label="Doctor workspace"><span>Workspace</span><Link href="/dashboard/tasks">Tasks &amp; Inbox</Link><Link href="/dashboard/messages">Messages</Link><Link href="/dashboard/documents?tab=needs-review">Documents</Link></nav>;
}
