import { DatabaseSync } from 'node:sqlite';
import type {
  SqlDatabase,
  SqlExecutor,
  SqlParams,
  SqlValue,
} from '@/infrastructure/database/sqlite/types';

/**
 * Test-only SqlDatabase backed by Node's built-in SQLite (in-memory). Exercises the
 * same SQL and migrations as the on-device expo-sqlite adapter without a simulator.
 */
export function createNodeSqliteDatabase(): SqlDatabase {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');

  const executor: SqlExecutor = {
    async run(sql, params: SqlParams = []) {
      const r = db.prepare(sql).run(...(params as SqlValue[]));
      return { changes: Number(r.changes) };
    },
    async all<T>(sql: string, params: SqlParams = []) {
      return db
        .prepare(sql)
        .all(...(params as SqlValue[]))
        .map((r) => ({ ...r })) as T[];
    },
    async get<T>(sql: string, params: SqlParams = []) {
      const row = db.prepare(sql).get(...(params as SqlValue[]));
      return row ? ({ ...row } as T) : null;
    },
    async exec(sql) {
      db.exec(sql);
    },
  };

  // Transactions are serialized, like expo-sqlite's exclusive transactions.
  let tail: Promise<unknown> = Promise.resolve();
  return {
    ...executor,
    transaction<T>(fn: (tx: SqlExecutor) => Promise<T>): Promise<T> {
      const run = async () => {
        db.exec('BEGIN');
        try {
          const result = await fn(executor);
          db.exec('COMMIT');
          return result;
        } catch (e) {
          db.exec('ROLLBACK');
          throw e;
        }
      };
      const next = tail.then(run, run);
      tail = next.catch(() => undefined);
      return next;
    },
    async close() {
      db.close();
    },
  };
}
