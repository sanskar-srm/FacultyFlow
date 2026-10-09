export type RepeatType = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly';

export type Priority = 'low' | 'medium' | 'high';

export type Category = 'academic' | 'meeting' | 'administrative' | 'personal' | 'other';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  /** Local date, `YYYY-MM-DD`. */
  scheduledDate: string;
  /** Local 24-hour time, `HH:mm`. */
  scheduledTime: string;
  priority: Priority;
  category: Category;
  /** Minutes before start; 0 = at task time; null = no reminder. */
  reminderMinutes: number | null;
  repeatType: RepeatType;
  completed: boolean;
  completedAt: string | null;
  notificationId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** The fields a user edits in the task form. */
export type TaskInput = Pick<
  Task,
  | 'title'
  | 'description'
  | 'scheduledDate'
  | 'scheduledTime'
  | 'priority'
  | 'category'
  | 'reminderMinutes'
  | 'repeatType'
>;

export interface Profile {
  name: string;
  designation: string;
}

export type ThemePreference = 'system' | 'light' | 'dark';

export type ReminderStyle = 'notification' | 'alarm';
