import { cookies } from 'next/headers';

export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return store.get('koji_admin')?.value === process.env.ADMIN_PASSWORD;
}

export async function checkAuth(): Promise<Response | null> {
  if (!await isAuthenticated()) {
    return new Response('Unauthorized', { status: 401 });
  }
  return null;
}
