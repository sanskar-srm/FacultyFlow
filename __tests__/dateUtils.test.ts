import {
  addDays,
  addMonthsClamped,
  dayPeriod,
  formatLongDate,
  formatRelativeDate,
  formatTime12,
  isValidDateString,
  isValidTimeString,
  monthGrid,
  monthRange,
  nextRoundHour,
  parseLocal,
  toDateString,
} from '@/src/utils/dateUtils';

describe('dateUtils', () => {
  test('uses local date, not UTC, just before midnight', () => {
    expect(toDateString(new Date(2026, 9, 7, 23, 59))).toBe('2026-10-07');
    expect(toDateString(new Date(2026, 9, 8, 0, 0))).toBe('2026-10-08');
  });

  test('addDays crosses month and year ends', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  test('addMonthsClamped clamps to month end and crosses years', () => {
    expect(addMonthsClamped('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsClamped('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonthsClamped('2026-03-31', 1)).toBe('2026-04-30');
    expect(addMonthsClamped('2026-12-15', 1)).toBe('2027-01-15');
  });

  test('nextRoundHour rolls over midnight, month and year', () => {
    expect(nextRoundHour(new Date(2026, 9, 7, 14, 20))).toEqual({ date: '2026-10-07', time: '15:00' });
    expect(nextRoundHour(new Date(2026, 9, 31, 23, 5))).toEqual({ date: '2026-11-01', time: '00:00' });
    expect(nextRoundHour(new Date(2026, 11, 31, 23, 59))).toEqual({ date: '2027-01-01', time: '00:00' });
  });

  test('validation', () => {
    expect(isValidDateString('2026-02-29')).toBe(false);
    expect(isValidDateString('2028-02-29')).toBe(true);
    expect(isValidDateString('2026-13-01')).toBe(false);
    expect(isValidDateString('')).toBe(false);
    expect(isValidTimeString('23:59')).toBe(true);
    expect(isValidTimeString('24:00')).toBe(false);
    expect(isValidTimeString('9:00')).toBe(false);
  });

  test('parseLocal builds a local date/time', () => {
    const d = parseLocal('2026-10-07', '16:30');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2026, 9, 7, 16, 30]);
  });

  test('dayPeriod boundaries', () => {
    const at = (h: number) => dayPeriod(new Date(2026, 9, 7, h, 0));
    expect(at(4)).toBe('Night');
    expect(at(5)).toBe('Morning');
    expect(at(12)).toBe('Afternoon');
    expect(at(17)).toBe('Evening');
    expect(at(21)).toBe('Night');
    expect(at(0)).toBe('Night');
  });

  test('formatting', () => {
    expect(formatTime12('00:05')).toBe('12:05 AM');
    expect(formatTime12('12:00')).toBe('12:00 PM');
    expect(formatTime12('16:30')).toBe('4:30 PM');
    expect(formatLongDate('2026-10-07')).toBe('07 October 2026');
  });

  test('formatRelativeDate around year end', () => {
    const now = new Date(2026, 11, 31, 22, 0);
    expect(formatRelativeDate('2026-12-31', now)).toBe('Today');
    expect(formatRelativeDate('2027-01-01', now)).toBe('Tomorrow');
    expect(formatRelativeDate('2026-12-30', now)).toBe('Yesterday');
    expect(formatRelativeDate('2027-01-05', now)).toBe('Tue, 05 Jan 2027');
  });

  test('month grid and range', () => {
    // February 2026 starts on a Sunday and has 28 days → exactly 4 weeks.
    const grid = monthGrid(2026, 1);
    expect(grid).toHaveLength(4);
    expect(grid[0][0]).toBe('2026-02-01');
    expect(grid[3][6]).toBe('2026-02-28');
    // October 2026 starts on a Thursday.
    expect(monthGrid(2026, 9)[0].slice(0, 5)).toEqual([null, null, null, null, '2026-10-01']);
    expect(monthRange(2028, 1)).toEqual({ start: '2028-02-01', end: '2028-02-29' });
  });
});
