export type DevelopmentPreviewActor = { id: string; name: string; role: string };

const developmentPreviewActors: Record<string, DevelopmentPreviewActor> = {
  dev: { id: 'dev-doctor', name: 'Dr. Maya Chen', role: 'DOCTOR' },
  'dev-doctor': { id: 'dev-doctor', name: 'Dr. Maya Chen', role: 'DOCTOR' },
  'user-admin-khan': { id: 'user-admin-khan', name: 'Admin Fatima Khan', role: 'ADMIN' },
};

/**
 * Resolves only explicitly supported development preview identities. The
 * convenient `dev` alias intentionally maps to the seeded clinician rather
 * than becoming a distinct local actor.
 */
export function resolveDevelopmentPreviewActor(asUser?: string | null): DevelopmentPreviewActor | undefined {
  const key = asUser?.trim();
  return key ? developmentPreviewActors[key] : undefined;
}

export function isDevelopmentPreviewRequest(asUser?: string | null) {
  return ['development', 'test'].includes(process.env.NODE_ENV) && Boolean(resolveDevelopmentPreviewActor(asUser));
}
