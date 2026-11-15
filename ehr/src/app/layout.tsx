import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import ClientLandingMode from '@/components/ClientLandingMode';
import ThemeLangProvider from '@/components/ThemeLangProvider';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Roshi EHR',
  description: 'Electronic Health Record System - FHIR-native, WCAG 2.2 AA compliant',
};

export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang='en' className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className='min-h-full bg-gray-50 text-gray-900'>
        <ClientLandingMode />
        <ThemeLangProvider>
          {children}
        </ThemeLangProvider>
      </body>
    </html>
  );
}
