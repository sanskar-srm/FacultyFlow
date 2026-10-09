// Every task change goes through here so the database and scheduled reminders stay in sync.
// The database write always happens first: a notification problem can never lose a task.
import * as repo from '@/src/database/taskRepository';
import * as settings from '@/src/database/settingsRepository';
import * as alarms from '@/src/notifications/alarmService';
import * as notifications from '@/src/notifications/notificationService';
import type { ReminderStyle, Task, TaskInput } from '@/src/types/task';
import { TEST_ALARM_ID } from '@/src/utils/alarmContent';
import { todayString } from '@/src/utils/dateUtils';
import { nextOccurrenceFrom } from '@/src/utils/recurrence';
import { needsReminder } from '@/src/utils/taskUtils';

// --- change notifications so screens can refresh -------------------------------------------

const listeners = new Set<() => void>();

export function subscribeToTaskChanges(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emitChange() {
  listeners.forEach((l) => l());
}

// --- reminders -------------------------------------------------------------------------------

const MSG_SCHEDULE_FAILED = "Task saved, but its reminder couldn't be set.";
const MSG_NO_PERMISSION = 'Task saved. Allow notifications in system settings to get reminders.';

/** Reminders are scheduled with one system at a time; ids show which ("task-…" or "alarm-…"). */
const isAlarmId = (id: string) => id.startsWith('alarm-') || id === TEST_ALARM_ID;

/** The style actually used: alarms need the native module (missing in Expo Go). */
async function effectiveStyle(): Promise<ReminderStyle> {
  return alarms.alarmsAvailable ? settings.getReminderStyle() : 'notification';
}

async function cancelQuietly(id: string | null) {
  if (!id) return;
  try {
    await (isAlarmId(id) ? alarms.cancelAlarm(id) : notifications.cancelReminder(id));
  } catch {
    // Reconcile on next launch removes anything left behind.
  }
}

/**
 * Schedules the task's reminder if it needs one and stores the identifier.
 * Returns a gentle user-facing warning, or null when all is well.
 */
async function scheduleFor(task: Task): Promise<string | null> {
  let reminderId: string | null = null;
  let warning: string | null = null;
  try {
    if (needsReminder(task) && (await settings.getRemindersEnabled())) {
      reminderId = (await effectiveStyle()) === 'alarm'
        ? await alarms.scheduleAlarm(task)
        : await notifications.scheduleReminder(task);
      if (!(await notifications.getNotificationPermission()).granted) warning = MSG_NO_PERMISSION;
    }
    if (reminderId !== task.notificationId) {
      await repo.setNotificationId(task.id, reminderId);
    }
  } catch {
    warning = MSG_SCHEDULE_FAILED;
  }
  return warning;
}

// --- task operations -------------------------------------------------------------------------

function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function clean(input: TaskInput): TaskInput {
  return { ...input, title: input.title.trim(), description: input.description?.trim() || null };
}

export async function createTask(input: TaskInput): Promise<{ warning: string | null }> {
  const now = new Date().toISOString();
  const task: Task = {
    ...clean(input),
    id: newId(),
    completed: false,
    completedAt: null,
    notificationId: null,
    createdAt: now,
    updatedAt: now,
  };
  await repo.insertTask(task);
  const warning = await scheduleFor(task);
  emitChange();
  return { warning };
}

export async function updateTask(existing: Task, input: TaskInput): Promise<{ warning: string | null }> {
  await cancelQuietly(existing.notificationId);
  const task: Task = { ...existing, ...clean(input), notificationId: null, updatedAt: new Date().toISOString() };
  await repo.updateTask(task);
  const warning = await scheduleFor(task);
  emitChange();
  return { warning };
}

/**
 * Toggles completion. A recurring task is never left completed: it moves to its next
 * occurrence (on or after today) and returns that date so the UI can say so.
 */
export async function toggleComplete(task: Task): Promise<{ nextDate: string | null }> {
  await cancelQuietly(task.notificationId);
  const now = new Date();
  const nextDate =
    !task.completed && task.repeatType !== 'none'
      ? nextOccurrenceFrom(task.scheduledDate, task.repeatType, todayString(now))
      : null;

  const updated: Task = nextDate
    ? { ...task, scheduledDate: nextDate, completed: false, completedAt: null }
    : { ...task, completed: !task.completed, completedAt: task.completed ? null : now.toISOString() };
  updated.notificationId = null;
  updated.updatedAt = now.toISOString();

  await repo.updateTask(updated);
  await scheduleFor(updated);
  emitChange();
  return { nextDate };
}

export async function deleteTask(task: Task): Promise<void> {
  await cancelQuietly(task.notificationId);
  await repo.deleteTask(task.id);
  emitChange();
}

// --- master switch, style, alarm actions and launch-time reconcile ---------------------------

export async function setRemindersEnabled(enabled: boolean): Promise<void> {
  await settings.setRemindersEnabled(enabled);
  await reconcileReminders();
}

/** Switching style moves every pending reminder to the other system. */
export async function setReminderStyle(style: ReminderStyle): Promise<void> {
  await settings.setReminderStyle(style);
  await reconcileReminders();
}

export async function setSnoozeMinutes(minutes: number): Promise<void> {
  await settings.setSnoozeMinutes(minutes);
  await alarms.setNativeSnoozeMinutes(minutes);
}

/**
 * Applies "Done" presses from the alarm screen. Only completes the task if it is still on the
 * occurrence that rang, so a late press never completes a later occurrence.
 */
export async function applyAlarmDone(): Promise<void> {
  const pending = await alarms.takePendingDone();
  let changed = false;
  for (const { taskId, occurrence } of pending) {
    try {
      const task = await repo.getTask(taskId);
      if (task && !task.completed && (!occurrence || task.scheduledDate === occurrence)) {
        await toggleComplete(task);
        changed = true;
      }
    } catch {
      // A failed item is skipped; the task simply stays incomplete.
    }
  }
  if (changed) emitChange();
}

let reconciling: Promise<void> | null = null;

/**
 * Makes scheduled reminders match the database. Runs on every launch, which covers reboots,
 * app updates and the OS clearing alarms. Task reminder settings are never changed.
 */
export function reconcileReminders(now: Date = new Date()): Promise<void> {
  // Never run two at once (e.g. launch reconcile and a quick settings toggle).
  const run = (reconciling ?? Promise.resolve()).then(() => reconcileOnce(now)).finally(() => {
    if (reconciling === run) reconciling = null;
  });
  reconciling = run;
  return run;
}

async function reconcileOnce(now: Date): Promise<void> {
  if (!(await settings.getRemindersEnabled())) {
    await notifications.cancelAllReminders();
    await alarms.cancelAllAlarms();
    await repo.clearAllNotificationIds();
    return;
  }

  const style = await effectiveStyle();
  const [tasks, scheduled, stored] = await Promise.all([
    repo.getReminderCandidates(now),
    notifications.getScheduledReminderIds(),
    alarms.getStoredAlarms(),
  ]);
  const alarmById = new Map(stored.map((a) => [a.id, a]));
  const exists = (id: string) => (isAlarmId(id) ? alarmById.has(id) : scheduled.has(id));
  const keep = new Set<string>([TEST_ALARM_ID]);

  for (const task of tasks) {
    try {
      if (needsReminder(task, now)) {
        const wanted = style === 'alarm' ? `alarm-${task.id}` : notifications.reminderIdFor(task.id);
        const alarm = alarmById.get(wanted);
        const upToDate =
          task.notificationId === wanted && exists(wanted) && (!alarm || alarm.occurrence === task.scheduledDate);
        const id = upToDate
          ? wanted
          : style === 'alarm'
            ? await alarms.scheduleAlarm(task)
            : await notifications.scheduleReminder(task);
        keep.add(id);
        if (id !== task.notificationId) await repo.setNotificationId(task.id, id);
        continue;
      }
      // An alarm that is ringing, waiting or snoozed stays while its occurrence is still open.
      const live = alarmById.get(`alarm-${task.id}`);
      if (
        style === 'alarm' && live && live.status !== 'scheduled' && task.reminderMinutes !== null &&
        !task.completed && live.occurrence === task.scheduledDate
      ) {
        keep.add(live.id);
      } else if (task.notificationId) {
        await repo.setNotificationId(task.id, null);
      }
    } catch {
      // Leave this task for the next launch; never block the others.
    }
  }

  // Anything still scheduled that no eligible task owns is stale.
  for (const id of [...scheduled, ...alarmById.keys()]) {
    if (!keep.has(id)) await cancelQuietly(id);
  }
}
