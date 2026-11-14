// Server-only: the calendar feed's token and the .ics body.
//
// Calendar apps can't send the koji_admin cookie, so the feed URL carries a
// token instead. It's an HMAC of ADMIN_PASSWORD, so there's no new env var,
// the admin page can print the URL, and changing the password rotates it.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { type Booking, effectiveStatus, fmtDate, fmtTime, leadText, mapsUrl, opensAt, zoneAbbr } from './bookings';

export function feedToken(): string {
  return createHmac('sha256', process.env.ADMIN_PASSWORD ?? '').update('koji-bookings-ics').digest('hex').slice(0, 32);
}

export function feedTokenOk(given: string | null): boolean {
  if (!given || !process.env.ADMIN_PASSWORD) return false;
  const a = Buffer.from(given), b = Buffer.from(feedToken());
  return a.length === b.length && timingSafeEqual(a, b);
}

interface FeedTrip { id: number; slug: string; title: string; tz?: string | null }

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

// RFC 5545: lines over 75 octets fold with CRLF + space
function fold(line: string): string {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let cur = '';
  let len = 0;
  for (const ch of line) {
    const n = Buffer.byteLength(ch, 'utf8');
    if (len + n > (out.length ? 74 : 75)) { out.push(cur); cur = ''; len = 0; }
    cur += ch; len += n;
  }
  out.push(cur);
  return out.join('\r\n ');
}

const utcStamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const dateOnly = (iso: string) => iso.replace(/-/g, '');
function nextDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

function alarm(trigger: string, text: string): string[] {
  return ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(text)}`, `TRIGGER:${trigger}`, 'END:VALARM'];
}

function describe(b: Booking, trip?: FeedTrip): string {
  const lines = [
    b.what,
    trip ? `Trip: ${trip.title}` : null,
    b.for_date ? `For: ${fmtDate(b.for_date)}` : null,
    b.window_type !== 'deadline' && leadText(b) ? `Opens ${leadText(b)}` : null,
    b.notes,
    b.maps_query ? `Maps: ${mapsUrl(b.maps_query, trip?.tz)}` : null,
    b.booking_url ? `Book: ${b.booking_url}` : null,
    b.window_type === 'deadline' ? 'Mark it done in koji and this event goes away.' : 'Mark it booked in koji and this event goes away.',
  ];
  return lines.filter(Boolean).join('\n');
}

/**
 * One event per window that's still to book (booked and skipped drop out, so
 * marking one removes it on the next refresh), plus a Sunday "still to book"
 * list that sweeps up everything already open. That weekly list is the part
 * that would have caught London.
 */
export function buildFeed(bookings: Booking[], trips: FeedTrip[], origin: string, now = new Date()): string {
  const tripById = new Map(trips.map(t => [t.id, t]));
  const stamp = utcStamp(now);
  const L: string[] = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//koji//bookings//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:koji · bookings', 'X-WR-CALDESC:When reservations and tickets open',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H',
  ];
  const adminUrl = `${origin}/admin/bookings`;

  for (const b of bookings) {
    if (b.status === 'booked' || b.status === 'skipped' || !b.opens_on) continue;
    const trip = tripById.get(b.trip_id);
    const approx = b.opens_approx ? '~' : '';
    const due = b.window_type === 'deadline';
    const summary = `${approx}${due ? 'Deadline' : 'Opens'}: ${b.title}`;
    L.push('BEGIN:VEVENT', `UID:koji-booking-${b.id}@koji`, `DTSTAMP:${stamp}`, `SUMMARY:${esc(summary)}`);
    L.push(`DESCRIPTION:${esc(describe(b, trip))}`, `URL:${b.booking_url || adminUrl}`);
    if (b.opens_time && !b.opens_approx) {
      const at = opensAt(b)!;
      const local = `${fmtTime(b.opens_time)} ${zoneAbbr(b.opens_tz, at)}`;
      L.push(`DTSTART:${utcStamp(at)}`, 'DURATION:PT30M');
      if (due) {
        L.push(...alarm('-P3D', `${b.title}: due in 3 days (${local})`));
        L.push(...alarm('-P1D', `${b.title}: due tomorrow (${local})`));
      } else {
        L.push(...alarm('-P1D', `${b.title} opens tomorrow (${local})`));
        L.push(...alarm('-PT15M', `${b.title} opens in 15 minutes`));
        L.push(...alarm('PT0S', `${b.title} is open now`));
      }
    } else {
      // All-day: floating date, so alarms land at 9am wherever the phone is
      L.push(`DTSTART;VALUE=DATE:${dateOnly(b.opens_on)}`, `DTEND;VALUE=DATE:${dateOnly(nextDay(b.opens_on))}`);
      L.push('TRANSP:TRANSPARENT');
      if (due) {
        // 9am three days before, and 9am on the day
        L.push(...alarm('-PT63H', `${b.title}: due in 3 days`));
        L.push(...alarm('PT9H', `${b.title}: due today`));
      } else {
        L.push(...alarm('-PT15H', `${b.title} opens tomorrow`));
        L.push(...alarm('PT9H', `${b.title} opens today`));
      }
    }
    L.push('END:VEVENT');
  }

  // Sunday list: everything open (or open with no fixed window) and unbooked
  const open = bookings.filter(b => effectiveStatus(b, now) === 'open');
  if (open.length) {
    const d = new Date(now);
    const sunday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + ((7 - d.getUTCDay()) % 7)));
    const iso = sunday.toISOString().slice(0, 10);
    const list = open.map(b => {
      const t = tripById.get(b.trip_id);
      return `• ${b.title}${b.for_date ? ` (for ${fmtDate(b.for_date)})` : ''}${t ? ` · ${t.title}` : ''}`;
    }).join('\n');
    L.push('BEGIN:VEVENT', `UID:koji-bookings-weekly-${dateOnly(iso)}@koji`, `DTSTAMP:${stamp}`,
      `SUMMARY:${esc(`koji · ${open.length} still to book`)}`,
      `DESCRIPTION:${esc(`Open and not booked yet, or overdue:\n${list}\n\n${adminUrl}`)}`, `URL:${adminUrl}`,
      `DTSTART;VALUE=DATE:${dateOnly(iso)}`, `DTEND;VALUE=DATE:${dateOnly(nextDay(iso))}`, 'TRANSP:TRANSPARENT',
      ...alarm('PT9H', `${open.length} booking${open.length === 1 ? '' : 's'} still to make`), 'END:VEVENT');
  }

  L.push('END:VCALENDAR');
  return L.map(fold).join('\r\n') + '\r\n';
}
