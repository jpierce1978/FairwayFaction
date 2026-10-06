import type { SqlDatabase } from './types';

export interface Migration {
  /** Strictly increasing, starting at 1, with no gaps. Never renumber a shipped migration. */
  id: number;
  name: string;
  sql: string;
}

export class MigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MigrationError';
  }
}

/** FNV-1a 32-bit. Detects edits to already-applied migrations; not a security hash. */
export function checksum(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function assertMigrationsWellFormed(migrations: readonly Migration[]): void {
  migrations.forEach((m, i) => {
    if (m.id !== i + 1) {
      throw new MigrationError(
        `Migration ids must be 1..N without gaps; expected ${i + 1} at position ${i}, got ${m.id}.`,
      );
    }
  });
}

interface AppliedRow {
  id: number;
  name: string;
  checksum: string;
}

export interface MigrationReport {
  applied: number[];
  alreadyApplied: number[];
}

/**
 * Apply pending migrations in order. Each runs in its own transaction together with
 * its bookkeeping row, so a failure leaves the database at the previous version.
 * Safe to call on every launch.
 */
export async function runMigrations(
  db: SqlDatabase,
  migrations: readonly Migration[],
  now: () => string = () => new Date().toISOString(),
): Promise<MigrationReport> {
  assertMigrationsWellFormed(migrations);

  await db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    checksum TEXT NOT NULL,
    applied_at TEXT NOT NULL
  )`);

  const rows = await db.all<AppliedRow>(
    'SELECT id, name, checksum FROM schema_migrations ORDER BY id',
  );
  const appliedById = new Map(rows.map((r) => [r.id, r]));

  for (const row of rows) {
    const known = migrations.find((m) => m.id === row.id);
    if (!known) {
      throw new MigrationError(
        `Database has migration ${row.id} (${row.name}) that this app version does not know about. Update the app.`,
      );
    }
    if (known.name !== row.name || checksum(known.sql) !== row.checksum) {
      throw new MigrationError(
        `Migration ${row.id} (${row.name}) was modified after it was applied. Add a new migration instead.`,
      );
    }
  }

  const report: MigrationReport = { applied: [], alreadyApplied: [...appliedById.keys()] };
  for (const migration of migrations) {
    if (appliedById.has(migration.id)) continue;
    await db.transaction(async (tx) => {
      await tx.exec(migration.sql);
      await tx.run(
        'INSERT INTO schema_migrations (id, name, checksum, applied_at) VALUES (?, ?, ?, ?)',
        [migration.id, migration.name, checksum(migration.sql), now()],
      );
    });
    report.applied.push(migration.id);
  }
  return report;
}
