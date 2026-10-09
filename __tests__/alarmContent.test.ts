import type { Task } from '@/src/types/task';
import { alarmSpecFor, UPCOMING_COUNT } from '@/src/utils/alarmContent';

const task = {
  id: 't1',
  title: 'Faculty Meeting',
  scheduledDate: '2026-10-09',
  scheduledTime: '10:30',
  reminderMinutes: 10,
  repeatType: 'none',
  category: 'meeting',
  priority: 'high',
  completed: false,
} satisfies Partial<Task>;

describe('alarmSpecFor', () => {
  const now = new Date(2026, 9, 9, 8, 0);

  test('content and fire time', () => {
    const spec = alarmSpecFor(task, now);
    expect(spec.id).toBe('alarm-t1');
    expect(spec.occurrence).toBe('2026-10-09');
    expect(spec.triggerAt).toBe(new Date(2026, 9, 9, 10, 20).getTime());
    expect(spec.timeText).toBe('10:30 AM');
    expect(spec.detailText).toBe('Starting in 10 minutes  |  Meeting  |  High priority');
    expect(spec.upcomingTriggers).toEqual([]);
  });

  test('a reminder the evening before names the day', () => {
    const spec = alarmSpecFor({ ...task, scheduledTime: '00:10', reminderMinutes: 30 }, now);
    expect(spec.timeText).toBe('Tomorrow, 12:10 AM');
  });

  test('recurring tasks list the following occurrences', () => {
    const spec = alarmSpecFor({ ...task, repeatType: 'weekdays' }, now); // Friday
    expect(spec.upcomingDates).toHaveLength(UPCOMING_COUNT);
    expect(spec.upcomingDates.slice(0, 3)).toEqual(['2026-10-12', '2026-10-13', '2026-10-14']);
    expect(spec.upcomingTriggers[0]).toBe(new Date(2026, 9, 12, 10, 20).getTime());
  });

  test('no emoji in alarm text', () => {
    const spec = alarmSpecFor({ ...task, repeatType: 'daily' }, now);
    expect(`${spec.title}${spec.timeText}${spec.detailText}`).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
