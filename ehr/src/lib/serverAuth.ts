import { auth } from './auth';

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept so callers keep a uniform signature
export async function resolveSession(_req: Request) {
  try {
    return await auth();
  } catch {
    return null;
  }
}
