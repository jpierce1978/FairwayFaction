/** SQLite stores booleans as 0/1 and JSON/timestamps as TEXT; mappers convert at the edge. */
export type SqlValue = string | number | null;
export type SqlParams = readonly SqlValue[];

export interface RunResult {
  changes: number;
}

/** The query surface shared by a database and an open transaction. */
export interface SqlExecutor {
  run(sql: string, params?: SqlParams): Promise<RunResult>;
  all<T = Record<string, SqlValue>>(sql: string, params?: SqlParams): Promise<T[]>;
  get<T = Record<string, SqlValue>>(sql: string, params?: SqlParams): Promise<T | null>;
  /** Execute one or more statements with no parameters (used by migrations). */
  exec(sql: string): Promise<void>;
}

/**
 * Minimal async database seam. The app uses expo-sqlite; tests use an in-memory
 * node:sqlite adapter. Nothing above this layer imports expo-sqlite directly.
 */
export interface SqlDatabase extends SqlExecutor {
  /** Run `fn` atomically: commits when it resolves, rolls back when it throws. */
  transaction<T>(fn: (tx: SqlExecutor) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
