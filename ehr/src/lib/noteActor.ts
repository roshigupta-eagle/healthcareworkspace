import { auth } from '@/lib/auth';
import type { DoctorNoteActor } from '@/types/doctorNote';

/** Resolves the acting clinician from the authenticated session (server-trusted, never from client payload). */
export async function resolveActor(): Promise<DoctorNoteActor | null> {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    name: session.user.name || '',
    role: String((session.user as { role?: string }).role || '').toUpperCase(),
  };
}
