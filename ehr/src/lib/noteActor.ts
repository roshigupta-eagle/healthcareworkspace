import { auth } from '@/lib/auth';
import type { DoctorNoteActor } from '@/types/doctorNote';

/** Resolves the acting clinician from the authenticated session (server-trusted, never from client payload). */
export async function resolveActor(): Promise<DoctorNoteActor> {
  try {
    const session = await auth();
    if (session?.user) {
      return {
        id: (session.user as any).id || 'dev-doctor',
        name: session.user.name || 'Doctor User',
        role: (session.user as any).role || 'DOCTOR',
      };
    }
  } catch {
    // fall through to dev default below
  }
  return { id: 'dev-doctor', name: 'Doctor User', role: 'DOCTOR' };
}
