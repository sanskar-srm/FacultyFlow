import { nextOccurrence, nextOccurrenceFrom } from '@/src/utils/recurrence';

describe('recurrence', () => {
  test('none does not repeat', () => {
    expect(nextOccurrence('2026-10-07', 'none')).toBeNull();
  });

  test('daily, weekly and monthly', () => {
    expect(nextOccurrence('2026-12-31', 'daily')).toBe('2027-01-01');
    expect(nextOccurrence('2026-12-28', 'weekly')).toBe('2027-01-04');
    expect(nextOccurrence('2026-01-31', 'monthly')).toBe('2026-02-28');
    expect(nextOccurrence('2026-12-31', 'monthly')).toBe('2027-01-31');
  });

  test('weekdays skips Saturday and Sunday', () => {
    expect(nextOccurrence('2026-10-09', 'weekdays')).toBe('2026-10-12'); // Fri → Mon
    expect(nextOccurrence('2026-10-10', 'weekdays')).toBe('2026-10-12'); // Sat → Mon
    expect(nextOccurrence('2026-10-07', 'weekdays')).toBe('2026-10-08'); // Wed → Thu
  });

  test('nextOccurrenceFrom catches up to today for overdue tasks', () => {
    expect(nextOccurrenceFrom('2026-10-01', 'daily', '2026-10-07')).toBe('2026-10-07');
    expect(nextOccurrenceFrom('2026-10-07', 'daily', '2026-10-07')).toBe('2026-10-08');
    expect(nextOccurrenceFrom('2026-09-30', 'weekly', '2026-10-08')).toBe('2026-10-14');
    expect(nextOccurrenceFrom('2026-10-07', 'none', '2026-10-07')).toBeNull();
  });
});
