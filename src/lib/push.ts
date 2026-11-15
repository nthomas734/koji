// Trip alerts, phone side. A subscription is one device opted in to one trip
// (koji_push, keyed by endpoint + trip_slug). The planning and sending happen
// server-side (pg_cron → /api/notify), so alerts arrive with the app closed.
// iPhones only allow this for koji installed on the Home Screen, and
// requestPermission must come from a tap — subscribe() is only called from
// the toggle.
//
// koji_push is read and written with plain fetch against PostgREST, not the
// Supabase client: importing lib/supabase here put supabase-js (~65 KB
// compressed) into every reader's trip page, since TripAlerts runs on load.
// Same requests the client made, same anon key, same RLS.

const REST = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/koji_push`;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const HEADERS = { apikey: ANON, Authorization: `Bearer ${ANON}` };

/** GET koji_push rows; null on any failure, as the client returned data: null. */
async function selectPush(column: string, filters: Record<string, string>, limit?: number): Promise<unknown[] | null> {
  const q = new URLSearchParams({ select: column });
  for (const [k, v] of Object.entries(filters)) q.set(k, `eq.${v}`);
  if (limit) q.set('limit', String(limit));
  try {
    const res = await fetch(`${REST}?${q}`, { headers: HEADERS, cache: 'no-store' });
    return res.ok ? await res.json() : null;
  } catch { return null; }
}

export const VAPID_PUBLIC = 'BJ06T9fNLNWijxktS74kD7aMmi_C_GWe-MD_--V27H8u3QXXml0r4nuQPgZSJHfxybcp8w8Hj9ml2J1aoijtk2Q';

export type PushState = 'unsupported' | 'install' | 'denied' | 'on' | 'off';

const b64 = (s: string) => {
  const raw = atob((s + '='.repeat((4 - (s.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
};

const supported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

async function currentSub() {
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

export async function pushState(slug: string): Promise<PushState> {
  if (!supported()) {
    // iOS Safari only exposes PushManager to the installed app
    return /iPhone|iPad/.test(navigator.userAgent) ? 'install' : 'unsupported';
  }
  if (Notification.permission === 'denied') return 'denied';
  const sub = await currentSub();
  if (!sub) return 'off';
  const rows = await selectPush('endpoint', { endpoint: sub.endpoint, trip_slug: slug }, 1);
  return rows?.length ? 'on' : 'off';
}

export async function subscribe(slug: string, tripTitle: string): Promise<void> {
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Notifications are blocked: allow them for koji in Settings.');
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription())
    ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(VAPID_PUBLIC) as BufferSource });
  const res = await fetch(REST, {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ endpoint: sub.endpoint, trip_slug: slug, sub: sub.toJSON() }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.message ?? `Could not save alerts (${res.status})`);
  // Confirm on the spot, no server round trip
  reg.showNotification('koji alerts are on', {
    body: `${tripTitle}: a heads-up 30 min before each stop, 15 min before you need to leave, and the day's plan at 7am.`,
    icon: '/icon-192.png', tag: 'koji-test',
  }).catch(() => {});
}

export async function unsubscribe(slug: string): Promise<void> {
  const sub = await currentSub();
  if (!sub) return;
  const del = new URLSearchParams({ endpoint: `eq.${sub.endpoint}`, trip_slug: `eq.${slug}` });
  await fetch(`${REST}?${del}`, { method: 'DELETE', headers: HEADERS }).catch(() => {});
  // Keep the browser subscription if another trip still uses it
  const rows = await selectPush('trip_slug', { endpoint: sub.endpoint }, 1);
  if (!rows?.length) await sub.unsubscribe();
}
