"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import AnimatedLink from "@/components/AnimatedLink";
import ThemeLangControlsClient from '@/components/ThemeLangControlsClient';
import { useThemeLang } from '@/components/ThemeLangProvider';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useThemeLang();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);

    const rawEmail = (formData.get("email") as string) || '';
    const email = rawEmail.trim().toLowerCase();
    const password = formData.get("password") as string;

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      // Normalize known provider error tokens to friendly messages
      const err = String(result.error || '');
      if (/credentials/i.test(err)) setError(t('invalidCredentials'));
      else setError(err || t('invalidCredentials'));
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <main id="main-content" className="flex-1 flex items-center justify-center px-4 min-h-screen bg-gradient-to-b from-sky-50 via-white to-indigo-50">
      <div className="w-full max-w-md bg-white/95 rounded-xl shadow-lg p-8 ring-1 ring-sky-100 border-l-4 border-sky-500 backdrop-blur-sm">
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 rounded-lg bg-sky-500/90 flex items-center justify-center text-white font-bold text-lg">H</div>
        </div>
        <h1 className="text-2xl font-bold text-center text-sky-800 mb-6">{t('signInTitle')}</h1>

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {error && (
            <div
              role="alert"
              className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md"
            >
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700" data-i18n="emailAddress">
              {t('emailAddress')}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-describedby="email-hint"
            />
            <p id="email-hint" className="mt-1 text-xs text-gray-500" data-i18n="emailHint">
              {t('emailHint')}
            </p>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700" data-i18n="password">
              {t('password')}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-gradient-to-r from-sky-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:from-sky-500 hover:to-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-busy={loading}
          >
            {loading ? t('signingIn') : t('signInButton')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-700">
          {t('dontHaveAccount')} {" "}
          <AnimatedLink href="/register" className="font-medium text-sky-700 hover:underline">
            {t('registerHere')}
          </AnimatedLink>
        </p>
        <div className="mt-4">
          <ThemeLangControlsClient />
        </div>
      </div>
    </main>
  );
}
