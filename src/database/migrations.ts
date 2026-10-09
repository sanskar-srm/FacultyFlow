import type { SQLiteDatabase } from 'expo-sqlite';

// Each entry upgrades the schema by one version. Append new migrations; never edit old ones.
const MIGRATIONS: string[] = [
  `
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    scheduled_date TEXT NOT NULL,
    scheduled_time TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium',
    category TEXT NOT NULL DEFAULT 'other',
    reminder_minutes INTEGER,
    repeat_type TEXT NOT NULL DEFAULT 'none',
    completed INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,
    notification_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_tasks_schedule ON tasks (scheduled_date, scheduled_time);
  CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks (completed, scheduled_date);

  CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    designation TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
  // v2 (Faculty Flow 1.1): reminder style and snooze length. Existing users keep plain
  // notifications until they choose Alarm alert in Settings.
  `
  INSERT OR IGNORE INTO settings (key, value) VALUES ('reminder_style', 'notification');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('snooze_minutes', '5');
  `,
];

export async function migrate(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (let version = current; version < MIGRATIONS.length; version++) {
    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.execAsync(MIGRATIONS[version]);
      await tx.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
  }
}
