import { cookies } from 'next/headers';

/** True when this request carries the koji_admin cookie, i.e. it is Nathan.
 *  Server only. The admin pages and routes each grew their own copy of this
 *  check; new owner-only surfaces (koma since 2026-11-11) use this one. */
export async function isOwner(): Promise<boolean> {
  const store = await cookies();
  return store.get('koji_admin')?.value === process.env.ADMIN_PASSWORD;
}
