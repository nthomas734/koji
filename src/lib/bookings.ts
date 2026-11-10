// Booking windows: when each reservation or ticket opens, and whether it's
// booked. Private (koji_bookings has RLS on and no policies). Shared by the
// admin board (client) and the calendar feed (server), so nothing here may
// import server-only modules.

export type BookingStatus = 'not_open' | 'open' | 'booked' | 'skipped';
export type WindowType = 'opens' | 'deadline';
export type BookingKind = 'restaurant' | 'train' | 'ticket' | 'tour' | 'hotel' | 'flight' | 'other';

export const BOOKING_KINDS: BookingKind[] = ['restaurant', 'train', 'ticket', 'tour', 'hotel', 'flight', 'other'];

export interface Booking {
  id:           number;
  trip_id:      number;
  title:        string;
  kind:         BookingKind;
  what:         string | null;
  for_date:     string | null;   // YYYY-MM-DD
  opens_on:     string | null;   // YYYY-MM-DD
  opens_time:   string | null;   // HH:MM[:SS], local to opens_tz
  opens_tz:     string;
  opens_approx: boolean;
  lead:         string | null;
  maps_query:   string | null;
  booking_url:  string | null;
  status:       BookingStatus;
  window_type:  WindowType;     // 'deadline' = act by this date (cancel-by, go/no-go)
  notes:        string | null;
  sort_order:   number;
}

/** Columns the admin API accepts on insert/update. Anything else is dropped. */
export const BOOKING_FIELDS = [
  'trip_id', 'title', 'kind', 'what', 'for_date', 'opens_on', 'opens_time', 'opens_tz',
  'opens_approx', 'window_type', 'lead', 'maps_query', 'booking_url', 'status', 'notes', 'sort_order',
] as const;

export function mapsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query).replace(/%20/g, '+')}`;
}

/** Offset of `tz` from UTC at instant `ms`, in ms (Tokyo → +9h). */
function tzOffsetMs(ms: number, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(ms));
  const n = (t: string) => Number(parts.find(p => p.type === t)?.value);
  const asUtc = Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute'), n('second'));
  return asUtc - Math.floor(ms / 1000) * 1000;
}

/** A wall-clock date and time in `tz`, as a UTC instant. */
export function zonedToUtc(date: string, time: string | null, tz: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = (time ?? '00:00').split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh || 0, mm || 0);
  let zone = tz;
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); } catch { zone = 'UTC'; }
  // Two passes so a date that sits across a DST change still lands right
  let t = guess - tzOffsetMs(guess, zone);
  t = guess - tzOffsetMs(t, zone);
  return new Date(t);
}

/** When the window opens, as an instant; null when there's no date. */
export function opensAt(b: Pick<Booking, 'opens_on' | 'opens_time' | 'opens_tz'>): Date | null {
  return b.opens_on ? zonedToUtc(b.opens_on, b.opens_time, b.opens_tz) : null;
}

/** What to show. A not-open row whose window has passed shows as open. */
export function effectiveStatus(b: Booking, now: Date = new Date()): BookingStatus {
  if (b.status !== 'not_open') return b.status;
  const at = opensAt(b);
  return at && at.getTime() <= now.getTime() ? 'open' : 'not_open';
}

export const STATUS_LABEL: Record<BookingStatus, string> = {
  not_open: 'Not yet', open: 'Open', booked: 'Booked', skipped: 'Skip',
};

/** Deadlines read as a to-do: past the date and not done means overdue. */
export const DEADLINE_LABEL: Record<BookingStatus, string> = {
  not_open: 'To do', open: 'Overdue', booked: 'Done', skipped: 'Skip',
};

export function statusLabel(b: Pick<Booking, 'window_type'>, s: BookingStatus): string {
  return (b.window_type === 'deadline' ? DEADLINE_LABEL : STATUS_LABEL)[s];
}

/** Whole days between two YYYY-MM-DD dates (b − a). */
export function daysBetween(a: string, b: string): number {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

/** "1 month out", "60 days out": the stored lead, else derived from the dates. */
export function leadText(b: Booking): string {
  if (b.lead) return /\bout\b|ahead|before/i.test(b.lead) ? b.lead : `${b.lead} out`;
  if (!b.opens_on || !b.for_date) return '';
  const d = daysBetween(b.opens_on, b.for_date);
  if (d <= 0) return '';
  if (d % 7 === 0 && d <= 56) return `${d / 7} week${d === 7 ? '' : 's'} out`;
  return `${d} days out`;
}

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Thu Jan 14" from YYYY-MM-DD, no time zone involved. */
export function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `${WD[dt.getUTCDay()]} ${MO[m - 1]} ${d}`;
}

/** "10:00" from "10:00:00". */
export function fmtTime(t: string): string {
  return t.slice(0, 5);
}

/** Short zone name for a label: Asia/Tokyo → JST. */
export function zoneAbbr(tz: string, at: Date): string {
  try {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' }).formatToParts(at);
    const name = p.find(x => x.type === 'timeZoneName')?.value ?? tz;
    if (tz === 'Asia/Tokyo') return 'JST';
    return name;
  } catch { return tz; }
}
