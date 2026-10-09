import type { Task, TaskInput } from '@/src/types/task';
import { isValidDateString, isValidTimeString, parseLocal } from './dateUtils';

type Schedulable = Pick<Task, 'scheduledDate' | 'scheduledTime' | 'reminderMinutes' | 'completed'>;

/** When the reminder should fire, or null if the task has no reminder. */
export function reminderFireDate(task: Schedulable): Date | null {
  if (task.reminderMinutes === null) return null;
  const start = parseLocal(task.scheduledDate, task.scheduledTime);
  return new Date(start.getTime() - task.reminderMinutes * 60_000);
}

/** True when a notification should exist for this task right now. */
export function needsReminder(task: Schedulable, now: Date = new Date()): boolean {
  const fire = reminderFireDate(task);
  return !task.completed && fire !== null && fire.getTime() > now.getTime();
}

/** Overdue is always computed, never stored. */
export function isOverdue(
  task: Pick<Task, 'scheduledDate' | 'scheduledTime' | 'completed'>,
  now: Date = new Date(),
): boolean {
  return !task.completed && parseLocal(task.scheduledDate, task.scheduledTime) < now;
}

export function reminderBody(minutes: number): string {
  if (minutes === 0) return 'Starting now';
  if (minutes === 60) return 'Starting in 1 hour';
  return `Starting in ${minutes} minutes`;
}

export type TaskErrors = Partial<Record<'title' | 'date' | 'time', string>>;

export function validateTask(input: TaskInput): TaskErrors {
  const errors: TaskErrors = {};
  if (!input.title.trim()) errors.title = 'Please enter a task title.';
  if (!isValidDateString(input.scheduledDate)) errors.date = 'Please pick a valid date.';
  if (!isValidTimeString(input.scheduledTime)) errors.time = 'Please pick a valid time.';
  return errors;
}
