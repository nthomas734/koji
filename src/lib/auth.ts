import { cookies } from 'next/headers';

export async function isAuthenticated(): boolean {
  const store = await cookies();
  return store.get('koji_admin')?.value === process.env.ADMIN_PASSWORD;
}

export async function checkAuth(): Response | null {
  if (!isAuthenticated()) {
    return new Response('Unauthorized', { status: 401 });
  }
  return null;
}
