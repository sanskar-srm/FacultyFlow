import type { TaskInput } from '@/src/types/task';
import { isOverdue, needsReminder, reminderBody, reminderFireDate, validateTask } from '@/src/utils/taskUtils';

const base = { scheduledDate: '2026-10-07', scheduledTime: '10:30', reminderMinutes: 10, completed: false };

describe('taskUtils', () => {
  test('reminder fire time', () => {
    expect(reminderFireDate(base)).toEqual(new Date(2026, 9, 7, 10, 20));
    expect(reminderFireDate({ ...base, reminderMinutes: 0 })).toEqual(new Date(2026, 9, 7, 10, 30));
    expect(reminderFireDate({ ...base, reminderMinutes: null })).toBeNull();
  });

  test('reminder before midnight goes back to the previous day', () => {
    expect(reminderFireDate({ ...base, scheduledDate: '2027-01-01', scheduledTime: '00:30', reminderMinutes: 60 }))
      .toEqual(new Date(2026, 11, 31, 23, 30));
  });

  test('needsReminder only for future, incomplete tasks with a reminder', () => {
    const now = new Date(2026, 9, 7, 10, 0);
    expect(needsReminder(base, now)).toBe(true);
    expect(needsReminder({ ...base, completed: true }, now)).toBe(false);
    expect(needsReminder({ ...base, reminderMinutes: null }, now)).toBe(false);
    expect(needsReminder(base, new Date(2026, 9, 7, 10, 20))).toBe(false); // fire time reached
    expect(needsReminder({ ...base, reminderMinutes: 60 }, now)).toBe(false); // 9:30 already passed
  });

  test('overdue is computed from date/time and completion', () => {
    expect(isOverdue(base, new Date(2026, 9, 7, 10, 31))).toBe(true);
    expect(isOverdue(base, new Date(2026, 9, 7, 10, 29))).toBe(false);
    expect(isOverdue({ ...base, completed: true }, new Date(2026, 9, 8))).toBe(false);
  });

  test('reminder body text', () => {
    expect(reminderBody(0)).toBe('Starting now');
    expect(reminderBody(10)).toBe('Starting in 10 minutes');
    expect(reminderBody(60)).toBe('Starting in 1 hour');
  });

  test('validation', () => {
    const input: TaskInput = {
      title: 'Faculty Meeting', description: null, scheduledDate: '2026-10-07', scheduledTime: '10:30',
      priority: 'medium', category: 'other', reminderMinutes: 10, repeatType: 'none',
    };
    expect(validateTask(input)).toEqual({});
    expect(validateTask({ ...input, title: '   ', scheduledDate: 'x', scheduledTime: '25:00' }))
      .toEqual({ title: expect.any(String), date: expect.any(String), time: expect.any(String) });
  });
});
