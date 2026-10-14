// Which tasks an Excel export covers: one day, a Monday–Sunday week, a calendar month, or a custom span.
import { addDays, monthRange, parseLocal, toDateString, weekdayOf } from '@/src/utils/dateUtils';

export type RangeKind = 'day' | 'week' | 'month' | 'custom';

export interface ExportRange {
  kind: RangeKind;
  /** Inclusive local dates, `YYYY-MM-DD`. */
  start: string;
  end: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** The range of `kind` that contains `anchor`. For `custom`, `end` is used as the end date. */
export function rangeFor(kind: RangeKind, anchor: string, end = anchor): ExportRange {
  switch (kind) {
    case 'day':
      return { kind, start: anchor, end: anchor };
    case 'week': {
      const monday = addDays(anchor, -((weekdayOf(anchor) + 6) % 7));
      return { kind, start: monday, end: addDays(monday, 6) };
    }
    case 'month': {
      const d = parseLocal(anchor);
      return { kind, ...monthRange(d.getFullYear(), d.getMonth()) };
    }
    case 'custom':
      return anchor <= end ? { kind, start: anchor, end } : { kind, start: end, end: anchor };
  }
}

/** Moves a day/week/month range back or forward by one step. */
export function shiftRange(range: ExportRange, step: -1 | 1): ExportRange {
  switch (range.kind) {
    case 'day':
      return rangeFor('day', addDays(range.start, step));
    case 'week':
      return rangeFor('week', addDays(range.start, 7 * step));
    case 'month': {
      const d = parseLocal(range.start);
      return rangeFor('month', toDateString(new Date(d.getFullYear(), d.getMonth() + step, 1)));
    }
    case 'custom':
      return range;
  }
}

function parts(date: string) {
  const d = parseLocal(date);
  return { day: String(d.getDate()).padStart(2, '0'), month: d.getMonth(), year: d.getFullYear() };
}

/** "15 Oct 2026", "13 – 19 Oct 2026", "October 2026", "28 Sep – 15 Oct 2026". */
export function rangeLabel(r: ExportRange): string {
  const a = parts(r.start);
  const b = parts(r.end);
  if (r.kind === 'month') return `${MONTHS_LONG[a.month]} ${a.year}`;
  if (r.start === r.end) return `${a.day} ${MONTHS[a.month]} ${a.year}`;
  if (a.year !== b.year) return `${a.day} ${MONTHS[a.month]} ${a.year} – ${b.day} ${MONTHS[b.month]} ${b.year}`;
  if (a.month !== b.month) return `${a.day} ${MONTHS[a.month]} – ${b.day} ${MONTHS[b.month]} ${b.year}`;
  return `${a.day} – ${b.day} ${MONTHS[a.month]} ${a.year}`;
}

/** A file-system-safe name, e.g. "FacultyFlow_Tasks_Week_13-Oct-2026.xlsx". */
export function exportFileName(r: ExportRange): string {
  const a = parts(r.start);
  const b = parts(r.end);
  const day = (p: typeof a) => `${p.day}-${MONTHS[p.month]}-${p.year}`;
  const label = {
    day: day(a),
    week: `Week_${day(a)}`,
    month: `${MONTHS_LONG[a.month]}-${a.year}`,
    custom: r.start === r.end ? day(a) : `${day(a)}_to_${day(b)}`,
  }[r.kind];
  return `FacultyFlow_Tasks_${label}.xlsx`;
}
