// Local scheduled notifications only. No push tokens, no server.
import * as Notifications from 'expo-notifications';
import { REMINDER_CHANNEL_ID } from '@/src/constants/appConstants';
import type { Task } from '@/src/types/task';
import { reminderBody, reminderFireDate } from '@/src/utils/taskUtils';

// Show reminders even when the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Must exist before the Android 13+ permission prompt can appear. Safe to call repeatedly. */
export async function ensureReminderChannel(): Promise<void> {
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: 'Task reminders',
    description: 'Reminders before your tasks start',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    // No `sound` key: the phone's default notification sound. (A string here is treated as a
    // custom sound file name; 'default' does not exist, which would leave the channel silent.)
  });
}

export async function getNotificationPermission(): Promise<{ granted: boolean; canAskAgain: boolean }> {
  const { granted, canAskAgain } = await Notifications.getPermissionsAsync();
  return { granted, canAskAgain };
}

export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const { granted } = await Notifications.requestPermissionsAsync();
  return granted;
}

/** One stable identifier per task, so re-scheduling replaces rather than duplicates. */
export const reminderIdFor = (taskId: string) => `task-${taskId}`;

/**
 * Schedules the task's reminder and returns its identifier. Callers must check
 * `needsReminder` first. Scheduling works even without permission: Android keeps the
 * alarm and shows it once the user allows notifications in system settings.
 */
export async function scheduleReminder(task: Task): Promise<string> {
  const fireDate = reminderFireDate(task);
  if (!fireDate || task.reminderMinutes === null) throw new Error('Task has no reminder');
  return Notifications.scheduleNotificationAsync({
    identifier: reminderIdFor(task.id),
    content: {
      title: task.title,
      body: reminderBody(task.reminderMinutes),
      data: { taskId: task.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireDate,
      channelId: REMINDER_CHANNEL_ID,
    },
  });
}

export function cancelReminder(notificationId: string): Promise<void> {
  return Notifications.cancelScheduledNotificationAsync(notificationId);
}

export function cancelAllReminders(): Promise<void> {
  return Notifications.cancelAllScheduledNotificationsAsync();
}

export async function getScheduledReminderIds(): Promise<Set<string>> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return new Set(scheduled.map((n) => n.identifier));
}
