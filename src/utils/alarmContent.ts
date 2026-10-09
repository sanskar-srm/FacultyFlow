import { CATEGORY_OPTIONS, PRIORITY_OPTIONS, labelFor } from '@/src/constants/appConstants';
import type { Task } from '@/src/types/task';
import { formatRelativeDate, formatTime12 } from './dateUtils';
import { nextOccurrence } from './recurrence';
import { reminderBody, reminderFireDate } from './taskUtils';

/** How many following occurrences of a recurring task the alarm can arm on its own. */
export const UPCOMING_COUNT = 14;

export const alarmIdFor = (taskId: string) => `alarm-${taskId}`;
export const TEST_ALARM_ID = 'test-alarm';

type AlarmTask = Pick<
  Task,
  'id' | 'title' | 'scheduledDate' | 'scheduledTime' | 'reminderMinutes' | 'repeatType' | 'category' | 'priority' | 'completed'
>;

/** What the alarm screen shows, plus the next occurrences of a recurring task. */
export function alarmSpecFor(task: AlarmTask, now: Date = new Date()) {
  const fire = reminderFireDate(task);
  if (!fire || task.reminderMinutes === null) throw new Error('Task has no reminder');
  const day = formatRelativeDate(task.scheduledDate, fire);
  const upcomingTriggers: number[] = [];
  const upcomingDates: string[] = [];
  let date: string | null = task.scheduledDate;
  while (upcomingTriggers.length < UPCOMING_COUNT) {
    date = date ? nextOccurrence(date, task.repeatType) : null;
    if (!date) break;
    const next = reminderFireDate({ ...task, scheduledDate: date });
    if (next && next.getTime() > now.getTime()) {
      upcomingTriggers.push(next.getTime());
      upcomingDates.push(date);
    }
  }
  return {
    id: alarmIdFor(task.id),
    taskId: task.id,
    occurrence: task.scheduledDate,
    title: task.title,
    timeText: day === 'Today' ? formatTime12(task.scheduledTime) : `${day}, ${formatTime12(task.scheduledTime)}`,
    detailText: [
      reminderBody(task.reminderMinutes),
      labelFor(CATEGORY_OPTIONS, task.category),
      `${labelFor(PRIORITY_OPTIONS, task.priority)} priority`,
    ].join('  |  '),
    triggerAt: fire.getTime(),
    upcomingTriggers,
    upcomingDates,
  };
}
