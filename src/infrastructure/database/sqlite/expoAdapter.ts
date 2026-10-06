import * as SQLite from 'expo-sqlite';
import type { RunResult, SqlDatabase, SqlExecutor, SqlParams, SqlValue } from './types';

type ExpoExecutor = Pick<
  SQLite.SQLiteDatabase,
  'runAsync' | 'getAllAsync' | 'getFirstAsync' | 'execAsync'
>;

function wrap(db: ExpoExecutor): SqlExecutor {
  return {
    async run(sql, params = []): Promise<RunResult> {
      const result = await db.runAsync(sql, [...params]);
      return { changes: result.changes };
    },
    all<T>(sql: string, params: SqlParams = []) {
      return db.getAllAsync<T & Record<string, SqlValue>>(sql, [...params]) as Promise<T[]>;
    },
    get<T>(sql: string, params: SqlParams = []) {
      return db.getFirstAsync<T & Record<string, SqlValue>>(sql, [...params]) as Promise<T | null>;
    },
    exec(sql) {
      return db.execAsync(sql);
    },
  };
}

export const DATABASE_NAME = 'fairwayfaction.db';

/** Open the on-device database with the pragmas the schema relies on. */
export async function openExpoDatabase(name: string = DATABASE_NAME): Promise<SqlDatabase> {
  const db = await SQLite.openDatabaseAsync(name);
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  return {
    ...wrap(db),
    async transaction<T>(fn: (tx: SqlExecutor) => Promise<T>): Promise<T> {
      let result!: T;
      await db.withExclusiveTransactionAsync(async (txn) => {
        result = await fn(wrap(txn));
      });
      return result;
    },
    close: () => db.closeAsync(),
  };
}
