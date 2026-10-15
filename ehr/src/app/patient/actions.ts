'use server';

import { signOut } from '@/lib/auth';

export async function signOutOfPatientPortal() {
  await signOut({ redirectTo: '/login' });
}
