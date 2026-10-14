import type { IconName } from '@/src/components/Icon';
import type { Category, Priority, ReminderStyle, RepeatType, ThemePreference } from '@/src/types/task';

export const APP_NAME = 'Faculty Flow';

export const REMINDER_CHANNEL_ID = 'reminders';

export interface Option<T> {
  value: T;
  label: string;
  icon?: IconName;
  detail?: string;
}

/** Reminder timing. "No reminder" is the Remind me switch, stored as `reminderMinutes: null`. */
export const REMINDER_OPTIONS: Option<number>[] = [
  { value: 0, label: 'At task time' },
  { value: 5, label: '5 min before' },
  { value: 10, label: '10 min before' },
  { value: 30, label: '30 min before' },
  { value: 60, label: '60 min before' },
];

export const PRIORITY_OPTIONS: Option<Priority>[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export const CATEGORY_OPTIONS: Option<Category>[] = [
  { value: 'academic', label: 'Academic', icon: 'book-open' },
  { value: 'meeting', label: 'Meeting', icon: 'users' },
  { value: 'administrative', label: 'Administrative', icon: 'briefcase' },
  { value: 'personal', label: 'Personal', icon: 'user' },
  { value: 'other', label: 'Other', icon: 'tag' },
];

export const REPEAT_OPTIONS: Option<RepeatType>[] = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export const THEME_OPTIONS: Option<ThemePreference>[] = [
  { value: 'system', label: 'System', icon: 'smartphone', detail: 'Follow the phone setting' },
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
];

export const REMINDER_STYLE_OPTIONS: Option<ReminderStyle>[] = [
  {
    value: 'notification',
    label: 'Notification',
    icon: 'bell',
    detail: 'A standard notification with the usual sound.',
  },
  {
    value: 'alarm',
    label: 'Alarm alert',
    icon: 'alert-circle',
    detail: 'Rings like an alarm and shows a full-screen alert, even on a locked phone, until you respond.',
  },
];

export const SNOOZE_OPTIONS: Option<number>[] = [
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
];

export const DEFAULT_SNOOZE_MINUTES = 5;

export const DEFAULT_REMINDER_MINUTES = 10;

export function labelFor<T>(options: Option<T>[], value: T): string {
  return options.find((o) => o.value === value)?.label ?? '';
}
