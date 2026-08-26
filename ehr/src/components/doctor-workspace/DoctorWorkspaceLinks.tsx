"use client";

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function DoctorWorkspaceLinks() {
  const searchParams = useSearchParams();
  const preview = process.env.NODE_ENV !== 'production' && Boolean(searchParams.get('noauth') || searchParams.get('asUser'));
  const href = (path: string) => preview ? `${path}${path.includes('?') ? '&' : '?'}noauth=1` : path;
  return <nav className="doctor-view-global-links" aria-label="Doctor workspace"><span>Workspace</span><Link href={href('/dashboard/tasks')}>Tasks &amp; Inbox</Link><Link href={href('/dashboard/messages')}>Messages</Link><Link href={href('/dashboard/documents?tab=needs-review')}>Documents</Link></nav>;
}
