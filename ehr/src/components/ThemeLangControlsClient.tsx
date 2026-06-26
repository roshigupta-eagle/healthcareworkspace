"use client";

import React, { useEffect, useState } from 'react';
import { useThemeLang } from './ThemeLangProvider';
import languages from '@/lib/languages';

export default function ThemeLangControlsClient() {
  const {
    theme,
    toggleTheme,
    lang,
    setLang,
    t,
    translateAll,
    speak,
    liveMessage,
    captionsEnabled,
    toggleCaptions,
  } = useThemeLang();

  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    const placeholder = document.getElementById('theme-lang-controls');
    if (placeholder && !placeholder.hasChildNodes()) {
      // placeholder left intentionally blank for layout fallbacks
    }
  }, []);

  const handleTranslate = async () => {
    await translateAll();
  };

  const handleSpeak = async () => {
    try {
      setSpeaking(true);
      await speak();
    } finally {
      setSpeaking(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Theme toggle - polished pill */}
      <button
        aria-pressed={theme === 'dark'}
        aria-label={t('toggleTheme')}
        onClick={toggleTheme}
        title={t('toggleTheme')}
        className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 shadow-sm hover:scale-[1.02] transition-transform duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        {theme === 'dark' ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" fill="currentColor" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M12 3v2M12 19v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="3" fill="currentColor" />
          </svg>
        )}
        <span className="text-sm font-medium">{theme === 'dark' ? t('themeDark') : t('themeLight')}</span>
      </button>

      {/* Language input + translate */}
      <div className="flex items-center gap-2 bg-white/80 dark:bg-gray-800/70 rounded-full px-2 py-1 border border-gray-200 dark:border-gray-700 shadow-sm">
        <input
          aria-label={t('translate')}
          title={t('translate')}
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          placeholder="en, zh-CN, es..."
          className="px-2 py-1 rounded text-sm bg-transparent outline-none w-36"
        />

        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          aria-label="Select language"
          className="px-2 py-1 rounded text-sm bg-transparent outline-none max-w-xs"
        >
          {languages.map((l) => (
            <option key={l.code} value={l.code}>{l.name}</option>
          ))}
        </select>

        <button
          onClick={handleTranslate}
          title={t('translate')}
          className="px-2 py-1 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-500 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M12 3v4M12 21v-4M4.22 4.22L7 7M17 17l2.78 2.78M1 12h4M19 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Speaker / TTS */}
      <button
        onClick={handleSpeak}
        title={t('speak')}
        aria-label={t('speak')}
        className="px-3 py-1 rounded-full bg-white/90 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 shadow-sm hover:scale-[1.03] transition-transform duration-150 flex items-center gap-2"
      >
        {speaking ? (
          <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25"/><path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M11 5L6 9H3v6h3l5 4V5z" fill="currentColor" />
            <path d="M19 8a4 4 0 010 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        <span className="text-sm">{t('speak')}</span>
      </button>

      {/* Captions toggle */}
      <button
        onClick={() => toggleCaptions()}
        title={captionsEnabled ? t('captionsOn') : t('captionsOff')}
        aria-pressed={captionsEnabled}
        className="px-2 py-1 rounded-full bg-white/90 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 shadow-sm hover:scale-[1.02] transition-transform duration-150"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 9h2v6H8zM12 9h4v6h-4z" fill="currentColor" />
        </svg>
      </button>

      {/* Captions box for deaf users (and live visual feedback) */}
      {captionsEnabled && (
        <div id="theme-captions" aria-live="polite" className="ml-2 max-w-xs text-xs bg-white/95 dark:bg-gray-900/90 rounded-md p-2 border border-gray-200 dark:border-gray-700 shadow-sm">
          {liveMessage || t('title')}
        </div>
      )}
    </div>
  );
}
