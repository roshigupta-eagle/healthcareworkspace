'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

function previewQuery(searchParams: URLSearchParams) {
  const query = new URLSearchParams();
  const asUser = searchParams.get('asUser');
  if (asUser) query.set('asUser', asUser);
  else if (['1', 'true'].includes(searchParams.get('noauth') || '')) query.set('noauth', '1');
  return query.toString();
}

export default function PreviewNavigationGuard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = previewQuery(searchParams);
    if (!query) return undefined;
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest('a') : null;
      if (!target) return;
      const href = target.getAttribute('href');
      if (!href || !href.startsWith('/') || href.startsWith('//') || href.includes('asUser=') || href.includes('noauth=')) return;
      event.preventDefault();
      router.push(`${href}${href.includes('?') ? '&' : '?'}${query}`);
    }
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [router, searchParams]);

  return null;
}
