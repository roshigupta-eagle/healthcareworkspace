"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ThemeLangControlsClient from "@/components/ThemeLangControlsClient";
import { useThemeLang } from "@/components/ThemeLangProvider";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const { t } = useThemeLang();

  useEffect(() => {
    // Redirect register page straight to doctor view (bypass auth)
    try {
      router.replace('/doctor?noauth=1');
    } catch (e) {
      // ignore
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);

    const name = (formData.get("name") as string) || "";
    const rawEmail = (formData.get("email") as string) || "";
    const email = rawEmail.trim().toLowerCase();
    const password = (formData.get("password") as string) || "";
    const confirmPassword = (formData.get("confirmPassword") as string) || "";

    if (!name.trim()) {
      setError(t("fullNameRequired"));
      setLoading(false);
      const el = e.currentTarget.querySelector("#name") as HTMLInputElement | null;
      el?.focus();
      return;
    }

    if (!email.trim()) {
      setError(t("emailRequired"));
      setLoading(false);
      const el = e.currentTarget.querySelector("#email") as HTMLInputElement | null;
      el?.focus();
      return;
    }

    if (password.length < 8) {
      setError(t("passwordTooShort"));
      setLoading(false);
      const el = e.currentTarget.querySelector("#password") as HTMLInputElement | null;
      el?.focus();
      return;
    }

    if (password !== confirmPassword) {
      setError(t("passwordsDontMatch"));
      setLoading(false);
      const el = e.currentTarget.querySelector("#confirmPassword") as HTMLInputElement | null;
      el?.focus();
      return;
    }

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        name,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || t("registrationFailed"));
    } else {
      setRegistered(true);
      setTimeout(() => router.push("/login"), 3000);
    }
  }

  if (registered) {
    return (
      <main
        id="main-content"
        className="flex-1 flex items-center justify-center px-4 min-h-screen bg-gradient-to-b from-sky-50 via-white to-indigo-50"
      >
        <div className="w-full max-w-md bg-white/95 rounded-xl shadow-lg p-8 ring-1 ring-sky-100 border-l-4 border-emerald-500 backdrop-blur-sm text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-lg bg-emerald-500/90 flex items-center justify-center text-white font-bold text-lg">
              ✓
            </div>
          </div>
          <h2 className="text-2xl font-bold text-emerald-800 mb-3">Account Created</h2>
          <p className="text-neutral-600 mb-4">
            Thank you for registering. An administrator will review your account and activate it shortly. You will receive an email once approved.
          </p>
          <p className="text-sm text-neutral-500">Redirecting to login...</p>
        </div>
      </main>
    );
  }

  return (
    <main
      id="main-content"
      className="flex-1 flex items-center justify-center px-4 min-h-screen bg-gradient-to-b from-sky-50 via-white to-indigo-50"
    >
      <div className="w-full max-w-md bg-white/95 rounded-xl shadow-lg p-8 ring-1 ring-sky-100 border-l-4 border-sky-500 backdrop-blur-sm">
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 rounded-lg bg-sky-500/90 flex items-center justify-center text-white font-bold text-lg">
            H
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center text-sky-800 mb-6">
          {t("createAccountTitle")}
        </h1>

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
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
              data-i18n="fullName"
            >
              {t("fullName")}
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
              data-i18n="emailAddress"
            >
              {t("emailAddress")}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
              data-i18n="password"
            >
              {t("password")}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-describedby="password-hint"
            />
            <p id="password-hint" className="mt-1 text-xs text-gray-500" data-i18n="passwordHint">
              {t("passwordHint")}
            </p>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700"
              data-i18n="confirmPassword"
            >
              {t("confirmPassword")}
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
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
            {loading ? t("creatingAccount") : t("registerButton")}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-sky-600 hover:text-sky-500">
            Sign in
          </Link>
        </p>
      </div>

      <ThemeLangControlsClient />
    </main>
  );
}

