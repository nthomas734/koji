// POST /api/notify — trip alerts (Web Push), called every 5 minutes by
// pg_cron on the Kura Supabase project (job `koji-alerts`), the Plane Lab
// pattern: the secrets live in Supabase Vault and arrive with each call, so
// nothing needs setting in Vercel. The caller's key is checked against its
// hash; the VAPID private key arrives in x-vapid.
//
// For every trip someone has subscribed to, plan the alerts (lib/tripAlerts)
// and send the ones that fell due in the last 10 minutes. koji_alerts_sent
// makes each one go out once, however the cron calls overlap.
//   ?test=1  send a test ping to every subscriber now
//   ?dry=1   list the next 24 hours of alerts instead of sending
import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { getTripBySlug, supabaseAdmin } from '@/lib/supabase';
import { planTripAlerts } from '@/lib/tripAlerts';
import { VAPID_PUBLIC } from '@/lib/push';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const KEY_SHA256 = 'e1b73656462c64c77fdeb85c21ab1ffa3f51635c2823859e044914c517139310';
const WINDOW_MS = 10 * 60 * 1000;

interface SubRow { endpoint: string; trip_slug: string; sub: webpush.PushSubscription }

export async function POST(req: Request) {
  const given = req.headers.get('x-koji-key') ?? '';
  const vapid = req.headers.get('x-vapid');
  if (createHash('sha256').update(given).digest('hex') !== KEY_SHA256 || !vapid) {
    return NextResponse.json({ error: 'no' }, { status: 401 });
  }
  const q = new URL(req.url).searchParams;
  const db = supabaseAdmin();
  webpush.setVapidDetails('mailto:nathanthomas734@gmail.com', VAPID_PUBLIC, vapid);

  const { data: subs, error } = await db.from('koji_push').select('endpoint, trip_slug, sub');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const bySlug = new Map<string, SubRow[]>();
  for (const s of (subs ?? []) as SubRow[]) bySlug.set(s.trip_slug, [...(bySlug.get(s.trip_slug) ?? []), s]);

  const send = async (rows: SubRow[], payload: object, ttl: number) => {
    let n = 0;
    for (const s of rows) {
      try { await webpush.sendNotification(s.sub, JSON.stringify(payload), { TTL: ttl, urgency: 'high' }); n++; }
      catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await db.from('koji_push').delete().eq('endpoint', s.endpoint);
      }
    }
    return n;
  };

  if (q.get('test') === '1') {
    let n = 0;
    for (const [slug, rows] of bySlug) {
      n += await send(rows, { title: 'koji alerts are on', body: 'You\'ll get a heads-up before each stop and when it\'s time to leave.', url: `/trips/${slug}`, tag: 'test' }, 600);
    }
    return NextResponse.json({ test: true, sent: n });
  }

  const now = Date.now();
  const report: Record<string, unknown> = {};
  for (const [slug, rows] of bySlug) {
    const data = await getTripBySlug(slug);
    if (!data) continue;
    const plan = planTripAlerts(data.trip, data.days);
    if (q.get('dry') === '1') {
      report[slug] = plan.filter(a => a.at > now - WINDOW_MS && a.at < now + 864e5)
        .map(a => ({ at: new Date(a.at).toISOString(), title: a.title, body: a.body }));
      continue;
    }
    const sent: string[] = [];
    for (const a of plan) {
      if (now < a.at || now >= a.at + WINDOW_MS) continue;
      const { data: fresh } = await db.from('koji_alerts_sent')
        .upsert({ key: `${slug}:${a.key}`, summary: a.title }, { onConflict: 'key', ignoreDuplicates: true })
        .select('key');
      if (!fresh?.length) continue; // already sent
      await send(rows, { title: a.title, body: a.body, url: a.url, tag: a.key }, 20 * 60);
      sent.push(a.title);
    }
    report[slug] = { subscribers: rows.length, sent };
  }
  return NextResponse.json(report);
}
