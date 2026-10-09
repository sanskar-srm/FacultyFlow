import { formatTime12, from12Hour, timeFromNow, to12Hour } from '@/src/utils/dateUtils';

describe('12-hour / 24-hour conversion', () => {
  test('to12Hour', () => {
    expect(to12Hour('00:00')).toEqual({ hour: 12, minute: 0, period: 'AM' });
    expect(to12Hour('00:45')).toEqual({ hour: 12, minute: 45, period: 'AM' });
    expect(to12Hour('09:05')).toEqual({ hour: 9, minute: 5, period: 'AM' });
    expect(to12Hour('11:59')).toEqual({ hour: 11, minute: 59, period: 'AM' });
    expect(to12Hour('12:00')).toEqual({ hour: 12, minute: 0, period: 'PM' });
    expect(to12Hour('13:30')).toEqual({ hour: 1, minute: 30, period: 'PM' });
    expect(to12Hour('23:59')).toEqual({ hour: 11, minute: 59, period: 'PM' });
  });

  test('from12Hour', () => {
    expect(from12Hour(12, 0, 'AM')).toBe('00:00');
    expect(from12Hour(12, 7, 'PM')).toBe('12:07');
    expect(from12Hour(1, 0, 'AM')).toBe('01:00');
    expect(from12Hour(4, 30, 'PM')).toBe('16:30');
    expect(from12Hour(11, 59, 'PM')).toBe('23:59');
  });

  test('round trip for every minute of the day', () => {
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m++) {
        const t = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const { hour, minute, period } = to12Hour(t);
        expect(from12Hour(hour, minute, period)).toBe(t);
        expect(formatTime12(t)).toBe(`${hour}:${String(minute).padStart(2, '0')} ${period}`);
      }
    }
  });

  test('timeFromNow rounds up to 5 minutes and wraps past midnight', () => {
    expect(timeFromNow(60, new Date(2026, 9, 9, 14, 2))).toBe('15:05');
    expect(timeFromNow(60, new Date(2026, 9, 9, 14, 0))).toBe('15:00');
    expect(timeFromNow(60, new Date(2026, 9, 9, 23, 30))).toBe('00:30');
    expect(timeFromNow(60, new Date(2026, 9, 9, 23, 58))).toBe('01:00');
  });
});
