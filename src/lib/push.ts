// Trip alerts, phone side. A subscription is one device opted in to one trip
// (koji_push, keyed by endpoint + trip_slug). The planning and sending happen
// server-side (pg_cron → /api/notify), so alerts arrive with the app closed.
// iPhones only allow this for koji installed on the Home Screen, and
// requestPermission must come from a tap — subscribe() is only called from
// the toggle.
import { supabase } from './supabase';

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
  const { data } = await supabase.from('koji_push').select('endpoint')
    .eq('endpoint', sub.endpoint).eq('trip_slug', slug).maybeSingle();
  return data ? 'on' : 'off';
}

export async function subscribe(slug: string, tripTitle: string): Promise<void> {
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Notifications are blocked: allow them for koji in Settings.');
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription())
    ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(VAPID_PUBLIC) as BufferSource });
  const { error } = await supabase.from('koji_push').upsert({ endpoint: sub.endpoint, trip_slug: slug, sub: sub.toJSON() });
  if (error) throw error;
  // Confirm on the spot, no server round trip
  reg.showNotification('koji alerts are on', {
    body: `${tripTitle}: a heads-up 30 min before each stop, 15 min before you need to leave, and the day's plan at 7am.`,
    icon: '/icon-192.png', tag: 'koji-test',
  }).catch(() => {});
}

export async function unsubscribe(slug: string): Promise<void> {
  const sub = await currentSub();
  if (!sub) return;
  await supabase.from('koji_push').delete().eq('endpoint', sub.endpoint).eq('trip_slug', slug);
  // Keep the browser subscription if another trip still uses it
  const { data } = await supabase.from('koji_push').select('trip_slug').eq('endpoint', sub.endpoint).limit(1);
  if (!data?.length) await sub.unsubscribe();
}
