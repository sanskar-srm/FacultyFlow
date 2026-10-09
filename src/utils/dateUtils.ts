// All scheduling uses the device's local time. Dates are stored as `YYYY-MM-DD`
// and times as 24-hour `HH:mm`, so no timezone conversion is ever needed.

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateString(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toTimeString(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function todayString(now: Date = new Date()): string {
  return toDateString(now);
}

export function isValidDateString(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d;
}

export function isValidTimeString(s: string): boolean {
  const m = /^(\d{2}):(\d{2})$/.exec(s);
  return !!m && Number(m[1]) < 24 && Number(m[2]) < 60;
}

/** Parses a stored date (and optional time) into a local `Date`. */
export function parseLocal(date: string, time = '00:00'): Date {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  return new Date(y, mo - 1, d, h, mi, 0, 0);
}

export function addDays(date: string, days: number): string {
  const d = parseLocal(date);
  return toDateString(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days));
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** Adds months, clamping the day to the end of shorter months (Jan 31 → Feb 28/29). */
export function addMonthsClamped(date: string, months: number): string {
  const d = parseLocal(date);
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const day = Math.min(d.getDate(), daysInMonth(target.getFullYear(), target.getMonth()));
  return toDateString(new Date(target.getFullYear(), target.getMonth(), day));
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOf(date: string): number {
  return parseLocal(date).getDay();
}

/** Default date/time for a new task: the next full hour (rolls over to tomorrow after 23:00). */
export function nextRoundHour(now: Date = new Date()): { date: string; time: string } {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0);
  return { date: toDateString(d), time: toTimeString(d) };
}

export type DayPeriod = 'Morning' | 'Afternoon' | 'Evening' | 'Night';

export function dayPeriod(now: Date = new Date()): DayPeriod {
  const h = now.getHours();
  if (h >= 5 && h < 12) return 'Morning';
  if (h >= 12 && h < 17) return 'Afternoon';
  if (h >= 17 && h < 21) return 'Evening';
  return 'Night';
}

/** "16:30" → "4:30 PM" */
export function formatTime12(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h < 12 ? 'AM' : 'PM';
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(m)} ${suffix}`;
}

/** "2026-10-07" → "07 October 2026" */
export function formatLongDate(date: string): string {
  const d = parseLocal(date);
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Today", "Tomorrow", "Yesterday", or e.g. "Wed, 07 Oct" (year added if not this year). */
export function formatRelativeDate(date: string, now: Date = new Date()): string {
  const today = todayString(now);
  if (date === today) return 'Today';
  if (date === addDays(today, 1)) return 'Tomorrow';
  if (date === addDays(today, -1)) return 'Yesterday';
  const d = parseLocal(date);
  const base = `${WEEKDAYS_SHORT[d.getDay()]}, ${pad(d.getDate())} ${MONTHS[d.getMonth()].slice(0, 3)}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

export function monthTitle(year: number, monthIndex: number): string {
  return `${MONTHS[monthIndex]} ${year}`;
}

export function monthRange(year: number, monthIndex: number): { start: string; end: string } {
  return {
    start: toDateString(new Date(year, monthIndex, 1)),
    end: toDateString(new Date(year, monthIndex, daysInMonth(year, monthIndex))),
  };
}

/** Weeks (Sunday first) of date strings for a month; `null` pads the first and last week. */
export function monthGrid(year: number, monthIndex: number): (string | null)[][] {
  const cells: (string | null)[] = Array(new Date(year, monthIndex, 1).getDay()).fill(null);
  for (let day = 1; day <= daysInMonth(year, monthIndex); day++) {
    cells.push(toDateString(new Date(year, monthIndex, day)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export type Period = 'AM' | 'PM';

/** "16:30" → { hour: 4, minute: 30, period: 'PM' }. Midnight is 12 AM, noon is 12 PM. */
export function to12Hour(time: string): { hour: number; minute: number; period: Period } {
  const [h, m] = time.split(':').map(Number);
  return { hour: h % 12 === 0 ? 12 : h % 12, minute: m, period: h < 12 ? 'AM' : 'PM' };
}

/** (4, 30, 'PM') → "16:30". `hour` is 1–12. */
export function from12Hour(hour: number, minute: number, period: Period): string {
  const h = (hour % 12) + (period === 'PM' ? 12 : 0);
  return `${pad(h)}:${pad(minute)}`;
}

/** A time `minutes` from now, rounded up to the next 5 minutes, as "HH:mm" (wraps past midnight). */
export function timeFromNow(minutes: number, now: Date = new Date()): string {
  const total = now.getHours() * 60 + now.getMinutes() + minutes;
  const rounded = (Math.ceil(total / 5) * 5) % (24 * 60);
  return `${pad(Math.floor(rounded / 60))}:${pad(rounded % 60)}`;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "2026-10-09" → "Friday" */
export function weekdayName(date: string): string {
  return WEEKDAYS[weekdayOf(date)];
}
