import * as SQLite from 'expo-sqlite';
import { migrate } from './migrations';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Opens the database once and runs pending migrations. A failed open can be retried. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('teacher-tasks.db');
      await db.execAsync('PRAGMA journal_mode = WAL');
      await migrate(db);
      return db;
    })();
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}
