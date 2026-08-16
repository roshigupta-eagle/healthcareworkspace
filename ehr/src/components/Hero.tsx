'use client';

import React, { useEffect, useState } from 'react';
import AnimatedLink from '@/components/AnimatedLink';
import { useThemeLang } from '@/components/ThemeLangProvider';
import Link from 'next/link';
import DotGridBackground from '@/components/DotGridBackground';

export default function Hero() {
  const [mounted, setMounted] = useState(false);
  const { t } = useThemeLang();

  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="hero-dot-grid text-white relative" aria-hidden="true">
      <DotGridBackground />
      <div className="hero-content-mask" aria-hidden="true" />

      <header className="absolute inset-x-6 top-6 z-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center text-white font-bold">R</div>
          <span className="text-white font-semibold tracking-tight">Roshi EHR</span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          <AnimatedLink href="/features" className="text-white/90 hover:text-white">{t('nav.product') || 'Product'}</AnimatedLink>
          <AnimatedLink href="/solutions" className="text-white/80 hover:text-white">{t('nav.solutions') || 'Solutions'}</AnimatedLink>
          <AnimatedLink href="/clinical-notes" className="text-white/80 hover:text-white">{t('nav.clinicalNotes') || 'Clinical Notes'}</AnimatedLink>
          <AnimatedLink href="/security" className="text-white/80 hover:text-white">{t('nav.security') || 'Security'}</AnimatedLink>
          <AnimatedLink href="/integrations" className="text-white/80 hover:text-white">{t('nav.integrations') || 'Integrations'}</AnimatedLink>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <AnimatedLink href="/book-demo" className="text-white/90 hover:text-white">{t('nav.bookDemo') || 'Book a Demo'}</AnimatedLink>
          <AnimatedLink href="/signup" className="rounded-full bg-[#18B8A7] px-4 py-2 text-sm font-semibold text-white shadow hover:brightness-105">{t('nav.startFreeTrial') || 'Start Free Trial'}</AnimatedLink>
        </div>
      </header>

      <main className="relative z-10 min-h-[720px] flex items-center justify-center">
        <div className={`max-w-8xl w-full px-6 py-28 lg:py-36 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} transition-all duration-700`}> 

          <section className="lg:col-span-5 text-white max-w-3xl">
            <div className="mb-4 text-sm text-slate-200/80">{t('eyebrow')}</div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight max-w-[52ch]">
              {t('heroHeadline')}
            </h1>

            <p className="mt-6 text-lg text-slate-200 max-w-[48ch]">{t('heroSubtitle')}</p>

            <div className="mt-8 flex items-center gap-4">
              <AnimatedLink href="/signup" className="inline-flex items-center gap-2 rounded-full bg-[#18B8A7] px-6 py-3 text-sm font-semibold shadow hover:brightness-105">{t('startFreeTrial')}</AnimatedLink>

              <AnimatedLink href="/book-demo" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/6 px-5 py-3 text-sm font-medium">{t('bookDemo')}</AnimatedLink>

              <AnimatedLink href="/login" className="text-white/90 underline underline-offset-4">{t('signInCTA')}</AnimatedLink>
            </div>

            <div className="mt-4 text-sm text-slate-200/70">{t('microcopyActions')}</div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white/6 p-4 rounded-lg">
                <h4 className="font-semibold">{t('secureByDesign')}</h4>
                <p className="mt-1 text-sm text-slate-200/80">{t('secureByDesignDesc')}</p>
              </div>
              <div className="bg-white/6 p-4 rounded-lg">
                <h4 className="font-semibold">{t('fhirFirst')}</h4>
                <p className="mt-1 text-sm text-slate-200/80">{t('fhirFirstDesc')}</p>
              </div>
              <div className="bg-white/6 p-4 rounded-lg">
                <h4 className="font-semibold">{t('designedForSpeed')}</h4>
                <p className="mt-1 text-sm text-slate-200/80">{t('designedForSpeedDesc')}</p>
              </div>
            </div>
          </section>

          <aside className="lg:col-span-7 relative flex items-center justify-center">
            <div className="w-full max-w-3xl">
              <div className="relative rounded-xl shadow-2xl overflow-hidden" style={{ minHeight: 420, background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.02))' }}>
                {/* Mock product preview */}
                <div className="absolute inset-4 rounded-lg bg-gradient-to-b from-white/6 to-white/3 p-4 text-slate-100">
                  <div className="h-56 bg-gradient-to-b from-white/6 to-transparent rounded-lg" style={{ border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">Doctor Dashboard</div>
                        <div className="text-xs text-slate-200/70">12 Appointments Today</div>
                      </div>

                      <div className="mt-6 grid grid-cols-3 gap-3">
                        <div className="p-3 bg-white/4 rounded">Clinical Timeline</div>
                        <div className="p-3 bg-white/4 rounded">Notes Editor</div>
                        <div className="p-3 bg-white/4 rounded">Orders</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute right-8 top-12 roshi-dot-motif soft" aria-hidden="true">
                <span></span><span></span>
                <span></span><span></span>
                <span></span><span></span>
              </div>

            </div>
          </aside>

        </div>
      </main>

      <footer className="relative z-20 text-center py-10 text-sm text-slate-200">{t('footer.copyright') || `© ${new Date().getFullYear()} Roshi Healthcare. All rights reserved.`}</footer>
    </div>
  );
}

