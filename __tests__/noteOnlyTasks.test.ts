// Note-only tasks (reminderMinutes null) must never schedule a notification or an alarm.
import type { Task } from '@/src/types/task';
import { needsReminder } from '@/src/utils/taskUtils';

jest.mock('@/src/database/taskRepository', () => ({
  updateTask: jest.fn(async () => {}),
  setNotificationId: jest.fn(async () => {}),
  getReminderCandidates: jest.fn(async () => []),
  clearAllNotificationIds: jest.fn(async () => {}),
}));
jest.mock('@/src/database/settingsRepository', () => ({
  getRemindersEnabled: jest.fn(async () => true),
  getReminderStyle: jest.fn(async () => 'alarm'),
}));
jest.mock('@/src/notifications/notificationService', () => ({
  reminderIdFor: (id: string) => `task-${id}`,
  scheduleReminder: jest.fn(async (t: Task) => `task-${t.id}`),
  cancelReminder: jest.fn(async () => {}),
  cancelAllReminders: jest.fn(async () => {}),
  getScheduledReminderIds: jest.fn(async () => new Set<string>()),
  getNotificationPermission: jest.fn(async () => ({ granted: true, canAskAgain: true })),
}));
jest.mock('@/src/notifications/alarmService', () => ({
  alarmsAvailable: true,
  scheduleAlarm: jest.fn(async (t: Task) => `alarm-${t.id}`),
  cancelAlarm: jest.fn(async () => {}),
  cancelAllAlarms: jest.fn(async () => {}),
  getStoredAlarms: jest.fn(async () => []),
}));

/* eslint-disable import/first */
import * as repo from '@/src/database/taskRepository';
import * as settings from '@/src/database/settingsRepository';
import * as alarms from '@/src/notifications/alarmService';
import * as notifications from '@/src/notifications/notificationService';
import { reconcileReminders, toggleComplete } from '@/src/services/taskService';
/* eslint-enable import/first */

const mocked = <T extends (...args: never[]) => unknown>(fn: T) => fn as unknown as jest.Mock;

function task(over: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'Note',
    description: null,
    scheduledDate: '2099-01-01',
    scheduledTime: '10:00',
    priority: 'medium',
    category: 'academic',
    reminderMinutes: null,
    repeatType: 'none',
    completed: false,
    completedAt: null,
    notificationId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

beforeEach(() => jest.clearAllMocks());

describe('note-only tasks', () => {
  test('needsReminder is false when reminderMinutes is null', () => {
    expect(needsReminder(task(), new Date(2026, 0, 1))).toBe(false);
    expect(needsReminder(task({ reminderMinutes: 10 }), new Date(2026, 0, 1))).toBe(true);
  });

  test.each(['alarm', 'notification'])('completing a recurring note-only task schedules nothing (%s style)', async (style) => {
    mocked(settings.getReminderStyle).mockResolvedValue(style);
    const { nextDate } = await toggleComplete(task({ repeatType: 'daily' }));
    expect(nextDate).not.toBeNull();
    const saved = mocked(repo.updateTask).mock.calls[0][0] as Task;
    expect(saved.scheduledDate).toBe(nextDate);
    expect(saved.completed).toBe(false);
    expect(saved.reminderMinutes).toBeNull();
    expect(alarms.scheduleAlarm).not.toHaveBeenCalled();
    expect(notifications.scheduleReminder).not.toHaveBeenCalled();
  });

  test('completing a recurring task with a reminder schedules the next one', async () => {
    mocked(settings.getReminderStyle).mockResolvedValue('alarm');
    await toggleComplete(task({ repeatType: 'daily', reminderMinutes: 10 }));
    expect(alarms.scheduleAlarm).toHaveBeenCalledTimes(1);
  });

  test('reconcile skips note-only tasks and clears their stale alarms, even a snoozed one', async () => {
    mocked(settings.getReminderStyle).mockResolvedValue('alarm');
    const note = task({ id: 'note', notificationId: 'alarm-note' });
    const reminded = task({ id: 'rem', reminderMinutes: 5 });
    mocked(repo.getReminderCandidates).mockResolvedValue([note, reminded]);
    mocked(alarms.getStoredAlarms).mockResolvedValue([
      { id: 'alarm-note', taskId: 'note', occurrence: note.scheduledDate, status: 'snoozed' },
    ]);

    await reconcileReminders(new Date(2026, 0, 1));

    expect(alarms.scheduleAlarm).toHaveBeenCalledTimes(1);
    expect(mocked(alarms.scheduleAlarm).mock.calls[0][0].id).toBe('rem');
    expect(repo.setNotificationId).toHaveBeenCalledWith('note', null);
    expect(alarms.cancelAlarm).toHaveBeenCalledWith('alarm-note');
  });
});
