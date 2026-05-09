import { cookies } from 'next/headers';

export function isAuthenticated(): boolean {
  const store = cookies();
  return store.get('koji_admin')?.value === process.env.ADMIN_PASSWORD;
}

export function checkAuth(): Response | null {
  if (!isAuthenticated()) {
    return new Response('Unauthorized', { status: 401 });
  }
  return null;
}
