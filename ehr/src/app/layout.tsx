import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { auth } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import LandingMode from '@/components/LandingMode';
import ThemeLangProvider from '@/components/ThemeLangProvider';
import ThemeLangControlsClient from '@/components/ThemeLangControlsClient';
import SearchBar from '@/components/SearchBarClient';
import PageTransition from '@/components/PageTransition';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Healthcare EHR",
  description: "Electronic Health Record System — FHIR-native, WCAG 2.2 AA compliant",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const role = session?.user?.role ?? "PATIENT";

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-gray-50 text-gray-900">
        <LandingMode />
        <ThemeLangProvider>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded"
        >
          Skip to main content
        </a>

        <div className="min-h-screen flex">
          <aside className="hidden md:block min-h-screen md:w-80 lg:w-96">
            <div className="h-full">
              <Sidebar session={session} role={role} />
            </div>
          </aside>

          <main id="main-content" className="flex-1 p-8 max-w-8xl w-full">
            <header className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-semibold" data-i18n="title">Healthcare EHR</h1>
              </div>
              <div className="flex items-center gap-2">
                <SearchBar />
                <ThemeLangControlsClient />
              </div>
            </header>

            <PageTransition>
              <div className="bg-white shadow-sm rounded-lg p-6">{children}</div>
            </PageTransition>
          </main>
        </div>
        </ThemeLangProvider>
      </body>
    </html>
  );
}
