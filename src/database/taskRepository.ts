import type { Category, Priority, RepeatType, Task } from '@/src/types/task';
import { toTimeString, todayString } from '@/src/utils/dateUtils';
import { getDb } from './database';

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  scheduled_date: string;
  scheduled_time: string;
  priority: string;
  category: string;
  reminder_minutes: number | null;
  repeat_type: string;
  completed: number;
  completed_at: string | null;
  notification_id: string | null;
  created_at: string;
  updated_at: string;
}

const ORDER = 'ORDER BY scheduled_date, scheduled_time';

function toTask(r: TaskRow): Task {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    scheduledDate: r.scheduled_date,
    scheduledTime: r.scheduled_time,
    priority: r.priority as Priority,
    category: r.category as Category,
    reminderMinutes: r.reminder_minutes,
    repeatType: r.repeat_type as RepeatType,
    completed: r.completed === 1,
    completedAt: r.completed_at,
    notificationId: r.notification_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

async function all(sql: string, ...params: (string | number)[]): Promise<Task[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<TaskRow>(sql, params);
  return rows.map(toTask);
}

export async function getTask(id: string): Promise<Task | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<TaskRow>('SELECT * FROM tasks WHERE id = ?', id);
  return row ? toTask(row) : null;
}

/** All tasks (complete and incomplete) on one date. Used by Today and Calendar. */
export function getTasksByDate(date: string): Promise<Task[]> {
  return all(`SELECT * FROM tasks WHERE scheduled_date = ? ${ORDER}`, date);
}

export function getTodayTasks(now: Date = new Date()): Promise<Task[]> {
  return getTasksByDate(todayString(now));
}

/** Incomplete tasks whose start time has passed. */
export function getOverdueTasks(now: Date = new Date()): Promise<Task[]> {
  const today = todayString(now);
  return all(
    `SELECT * FROM tasks WHERE completed = 0
       AND (scheduled_date < ? OR (scheduled_date = ? AND scheduled_time < ?)) ${ORDER}`,
    today, today, toTimeString(now),
  );
}

/** Incomplete tasks that have not started yet (includes the rest of today). */
export function getUpcomingTasks(now: Date = new Date()): Promise<Task[]> {
  const today = todayString(now);
  return all(
    `SELECT * FROM tasks WHERE completed = 0
       AND (scheduled_date > ? OR (scheduled_date = ? AND scheduled_time >= ?)) ${ORDER}`,
    today, today, toTimeString(now),
  );
}

/** Most recently completed tasks. Older ones remain reachable through the Calendar. */
export function getCompletedTasks(limit = 100): Promise<Task[]> {
  return all('SELECT * FROM tasks WHERE completed = 1 ORDER BY completed_at DESC LIMIT ?', limit);
}

/** Distinct dates in [start, end] that have at least one task. */
export async function getDatesWithTasks(start: string, end: string): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ scheduled_date: string }>(
    'SELECT DISTINCT scheduled_date FROM tasks WHERE scheduled_date BETWEEN ? AND ?',
    start, end,
  );
  return new Set(rows.map((r) => r.scheduled_date));
}

/** Tasks that have, or may need, a scheduled reminder. Used to reconcile notifications. */
export function getReminderCandidates(now: Date = new Date()): Promise<Task[]> {
  return all(
    `SELECT * FROM tasks WHERE notification_id IS NOT NULL
       OR (completed = 0 AND reminder_minutes IS NOT NULL AND scheduled_date >= ?)`,
    todayString(now),
  );
}

export async function insertTask(t: Task): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO tasks (id, title, description, scheduled_date, scheduled_time, priority, category,
       reminder_minutes, repeat_type, completed, completed_at, notification_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [t.id, t.title, t.description, t.scheduledDate, t.scheduledTime, t.priority, t.category,
      t.reminderMinutes, t.repeatType, t.completed ? 1 : 0, t.completedAt, t.notificationId,
      t.createdAt, t.updatedAt],
  );
}

export async function updateTask(t: Task): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE tasks SET title = ?, description = ?, scheduled_date = ?, scheduled_time = ?, priority = ?,
       category = ?, reminder_minutes = ?, repeat_type = ?, completed = ?, completed_at = ?,
       notification_id = ?, updated_at = ?
     WHERE id = ?`,
    [t.title, t.description, t.scheduledDate, t.scheduledTime, t.priority, t.category,
      t.reminderMinutes, t.repeatType, t.completed ? 1 : 0, t.completedAt, t.notificationId,
      t.updatedAt, t.id],
  );
}

export async function setNotificationId(id: string, notificationId: string | null): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE tasks SET notification_id = ? WHERE id = ?', notificationId, id);
}

export async function clearAllNotificationIds(): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE tasks SET notification_id = NULL WHERE notification_id IS NOT NULL');
}

export async function deleteTask(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM tasks WHERE id = ?', id);
}
