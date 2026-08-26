import { auth } from './auth';

export async function resolveSession(req: Request) {
  let session: any = null;
  try {
    session = await auth();
  } catch (e) {
    // auth() may throw in dev when no session exists — fall through to allow preview override
  }

  if (!session) {
    try {
      const url = new URL(req.url);
      const asUser = url.searchParams.get('asUser') || url.searchParams.get('as_user');
      if (asUser && process.env.NODE_ENV !== 'production' && ['dev', 'dev-doctor'].includes(asUser)) {
        session = { user: { id: asUser, name: asUser, role: 'dev' } };
      }
    } catch (e) {
      // ignore URL parsing errors
    }
  }

  return session;
}
