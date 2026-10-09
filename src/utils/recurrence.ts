import type { RepeatType } from '@/src/types/task';
import { addDays, addMonthsClamped, weekdayOf } from './dateUtils';

/** The occurrence directly after `date`, or null for non-repeating tasks. */
export function nextOccurrence(date: string, repeat: RepeatType): string | null {
  switch (repeat) {
    case 'daily':
      return addDays(date, 1);
    case 'weekdays': {
      let next = addDays(date, 1);
      while (weekdayOf(next) === 0 || weekdayOf(next) === 6) next = addDays(next, 1);
      return next;
    }
    case 'weekly':
      return addDays(date, 7);
    case 'monthly':
      return addMonthsClamped(date, 1);
    default:
      return null;
  }
}

/**
 * The next occurrence after `date` that falls on or after `today`.
 * Completing a task that is several occurrences overdue jumps straight to the
 * current one instead of leaving a trail of past occurrences.
 */
export function nextOccurrenceFrom(date: string, repeat: RepeatType, today: string): string | null {
  let next = nextOccurrence(date, repeat);
  // Bounded loop: even a daily task years overdue only takes a few thousand steps.
  for (let i = 0; next !== null && next < today && i < 10000; i++) {
    next = nextOccurrence(next, repeat);
  }
  return next;
}
