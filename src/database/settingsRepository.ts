import { DEFAULT_SNOOZE_MINUTES } from '@/src/constants/appConstants';
import type { Profile, ReminderStyle, ThemePreference } from '@/src/types/task';
import { getDb } from './database';

export async function getProfile(): Promise<Profile | null> {
  const db = await getDb();
  return db.getFirstAsync<Profile>('SELECT name, designation FROM profile WHERE id = 1');
}

export async function saveProfile(p: Profile): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO profile (id, name, designation, created_at, updated_at) VALUES (1, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, designation = excluded.designation,
       updated_at = excluded.updated_at`,
    p.name, p.designation, now, now,
  );
}

async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  return row?.value ?? null;
}

async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key, value,
  );
}

export async function getRemindersEnabled(): Promise<boolean> {
  return (await getSetting('reminders_enabled')) !== '0';
}

export function setRemindersEnabled(enabled: boolean): Promise<void> {
  return setSetting('reminders_enabled', enabled ? '1' : '0');
}

export async function getThemePreference(): Promise<ThemePreference> {
  const value = await getSetting('theme');
  return value === 'light' || value === 'dark' ? value : 'system';
}

export function setThemePreference(theme: ThemePreference): Promise<void> {
  return setSetting('theme', theme);
}

export async function getReminderStyle(): Promise<ReminderStyle> {
  return (await getSetting('reminder_style')) === 'alarm' ? 'alarm' : 'notification';
}

export function setReminderStyle(style: ReminderStyle): Promise<void> {
  return setSetting('reminder_style', style);
}

export async function getSnoozeMinutes(): Promise<number> {
  const n = Number(await getSetting('snooze_minutes'));
  return [5, 10, 15].includes(n) ? n : DEFAULT_SNOOZE_MINUTES;
}

export function setSnoozeMinutes(minutes: number): Promise<void> {
  return setSetting('snooze_minutes', String(minutes));
}
