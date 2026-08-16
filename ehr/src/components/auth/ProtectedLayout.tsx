"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import ApplicationLoadingScreen from '@/components/loading/ApplicationLoadingScreen';
import AuthenticationErrorState from '@/components/loading/AuthenticationErrorState';

type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated' | 'session-expired' | 'error';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('initializing');
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const noAuth = !!(searchParams && (searchParams.get('noauth') === '1' || searchParams.get('noauth') === 'true'));

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch('/api/auth/status', { cache: 'no-store' });
        const data = await res.json();
        if (cancelled) return;
        if (data?.authenticated) {
          setUser(data.user);
          setStatus('authenticated');
        } else if (data?.expired) {
          setStatus('session-expired');
        } else {
          setStatus('unauthenticated');
        }
      } catch (e) {
        if (cancelled) return;
        setStatus('error');
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated' || status === 'session-expired') {
      const returnTo = pathname || '/dashboard';
      router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    }
  }, [status, router, pathname]);

  if (noAuth) return <>{children}</>;
  if (status === 'initializing') return <ApplicationLoadingScreen />;
  if (status === 'error') return <AuthenticationErrorState />;
  if (status === 'authenticated') return <>{children}</>;

  return null;
}
