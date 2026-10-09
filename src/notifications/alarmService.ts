// Alarm-style reminders via the local native module (modules/faculty-alarm).
// Unavailable in Expo Go: the app then keeps using standard notifications.
import FacultyAlarm, { type AlarmPermissionStatus, type AlarmSettingsScreen, type StoredAlarm } from '@/modules/faculty-alarm';
import type { Task } from '@/src/types/task';
import { alarmSpecFor, TEST_ALARM_ID } from '@/src/utils/alarmContent';
import { formatTime12, toTimeString } from '@/src/utils/dateUtils';

export type { AlarmPermissionStatus, AlarmSettingsScreen, StoredAlarm };

export const alarmsAvailable = FacultyAlarm !== null;

function native() {
  if (!FacultyAlarm) throw new Error('Alarm alerts need the Faculty Flow app build (not Expo Go).');
  return FacultyAlarm;
}

/** Schedules the task's alarm and returns its id. Callers must check `needsReminder` first. */
export async function scheduleAlarm(task: Task): Promise<string> {
  const spec = alarmSpecFor(task);
  await native().schedule(spec);
  return spec.id;
}

export function cancelAlarm(id: string): Promise<void> {
  return native().cancel(id);
}

export async function cancelAllAlarms(): Promise<void> {
  if (FacultyAlarm) await FacultyAlarm.cancelAll();
}

export async function getStoredAlarms(): Promise<StoredAlarm[]> {
  return FacultyAlarm ? FacultyAlarm.getAlarms() : [];
}

export async function takePendingDone(): Promise<{ taskId: string; occurrence: string | null }[]> {
  return FacultyAlarm ? FacultyAlarm.takePendingDone() : [];
}

export async function setNativeSnoozeMinutes(minutes: number): Promise<void> {
  if (FacultyAlarm) await FacultyAlarm.setSnoozeMinutes(minutes);
}

export function getAlarmStatus(): Promise<AlarmPermissionStatus> {
  return native().getStatus();
}

export function openAlarmSettings(screen: AlarmSettingsScreen): Promise<void> {
  return native().openSettings(screen);
}

/** Subscribes to "Done" presses on the alarm screen while the app is running. */
export function onAlarmDone(listener: () => void): () => void {
  if (!FacultyAlarm) return () => {};
  const sub = FacultyAlarm.addListener('onAlarmDone', listener);
  return () => sub.remove();
}

/** Rings a sample alarm about 10 seconds from now so the user can check it on their phone. */
export async function scheduleTestAlarm(): Promise<void> {
  const at = new Date(Date.now() + 10_000);
  await native().schedule({
    id: TEST_ALARM_ID,
    taskId: null,
    occurrence: null,
    title: 'Test alarm',
    timeText: formatTime12(toTimeString(at)),
    detailText: 'This is how your task reminders will ring',
    triggerAt: at.getTime(),
    upcomingTriggers: [],
    upcomingDates: [],
  });
}
