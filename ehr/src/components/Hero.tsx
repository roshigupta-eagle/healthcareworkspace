'use client';

import React, { useEffect, useState } from 'react';
import AnimatedLink from '@/components/AnimatedLink';
import { useThemeLang } from '@/components/ThemeLangProvider';

export default function Hero() {
  const [mounted, setMounted] = useState(false);
  const { t } = useThemeLang();

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-sky-400 via-sky-300 to-indigo-200 overflow-hidden">
      {/* Decorative circles */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -right-72 -top-40 w-[520px] h-[520px] rounded-full bg-white/10 blur-3xl opacity-40" />
        <div className="absolute -left-64 bottom-[-120px] w-[420px] h-[420px] rounded-full bg-white/8 blur-2xl opacity-30" />
      </div>

      <header className="absolute top-6 left-6 right-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold">H</div>
          <span className="text-white font-semibold tracking-tight">HealthOS</span>
        </div>
        <nav className="hidden md:flex items-center gap-3">
          <AnimatedLink href="/login" className="text-white/90 hover:text-white transition">{t('signInCTA')}</AnimatedLink>
          <AnimatedLink href="/register" className="text-white/90 hover:text-white transition">{t('registerCTA')}</AnimatedLink>
        </nav>
      </header>

      <main className="flex min-h-screen items-center justify-center">
        <div className={`max-w-4xl text-center px-6 py-32 sm:py-40 transition-all duration-700 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 leading-tight" data-i18n="heroHeadline">{t('heroHeadline')}</h1>

          <p className="mt-6 text-lg text-slate-800 max-w-2xl mx-auto" data-i18n="heroSubtitle">{t('heroSubtitle')}</p>

          <div className="mt-10 flex items-center justify-center gap-4">
            <AnimatedLink
              href="/login"
              className="inline-flex items-center gap-2 rounded-full bg-white text-sky-700 px-6 py-3 text-sm font-semibold shadow-lg hover:scale-105 transform transition"
            >
              {t('signInCTA')}
            </AnimatedLink>

            <AnimatedLink
              href="/register"
              className="inline-flex items-center gap-2 rounded-full bg-white/10 text-slate-900/90 px-5 py-3 text-sm font-medium ring-1 ring-white/10 hover:bg-white/20 transition transform hover:scale-102"
            >
              {t('registerCTA')}
            </AnimatedLink>
          </div>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/6 p-4 rounded-lg text-white">
              <h4 className="font-semibold" data-i18n="secureByDesign">{t('secureByDesign')}</h4>
              <p className="mt-1 text-sm text-white/80" data-i18n="secureByDesignDesc">{t('secureByDesignDesc')}</p>
            </div>
            <div className="bg-white/6 p-4 rounded-lg text-white">
              <h4 className="font-semibold" data-i18n="fhirFirst">{t('fhirFirst')}</h4>
              <p className="mt-1 text-sm text-white/80" data-i18n="fhirFirstDesc">{t('fhirFirstDesc')}</p>
            </div>
            <div className="bg-white/6 p-4 rounded-lg text-white">
              <h4 className="font-semibold" data-i18n="designedForSpeed">{t('designedForSpeed')}</h4>
              <p className="mt-1 text-sm text-white/80" data-i18n="designedForSpeedDesc">{t('designedForSpeedDesc')}</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="absolute bottom-6 left-6 right-6 text-center text-sm text-white/70">
        © {new Date().getFullYear()} HealthOS — {t('builtForClinicians')}
      </footer>
    </div>
  );
}
