import type { ReactNode } from 'react';
import { auth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import MobileDoctorNav from '@/components/MobileDoctorNav';
import GlobalHeader from '@/components/GlobalHeader';
import FloatingActions from '@/components/FloatingActions';
import PageTransition from '@/components/PageTransition';

export default async function ClinicalWorkspaceShell({ children }: { readonly children: ReactNode }) {
  const session = await auth().catch(() => null);
  const role = session?.user?.role ?? 'PATIENT';

  return (
    <div className='min-h-screen flex'>
      <a href='#main-content' className='sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded'>Skip to main content</a>
      <aside className='hidden md:block min-h-screen md:w-64 lg:w-72'>
        <div className='h-full'><Sidebar session={session} role={role} /></div>
      </aside>
      <main id='main-content' className='min-w-0 flex-1 p-4 sm:p-6 lg:p-8 max-w-8xl w-full'>
        <GlobalHeader session={session} role={role} />
        <MobileDoctorNav role={role} />
        <FloatingActions />
        <PageTransition><div className='bg-white shadow-sm rounded-lg p-6'>{children}</div></PageTransition>
      </main>
    </div>
  );
}
