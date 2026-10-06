import type { SqlExecutor } from '@/infrastructure/database/sqlite/types';
import type { Clock } from '@/utils/clock';
import { systemClock } from '@/utils/clock';
import type { IdGenerator } from '@/utils/ids';
import { asId, type DeviceId, type LocalMutationId } from '@/types/ids';
import type { Json } from '@/types/common';
import type {
  LocalMutation,
  MutationOperation,
  MutationStatus,
  NewLocalMutation,
  SyncedEntityType,
} from './types';

interface MutationRow {
  id: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  payload: string;
  local_timestamp: string;
  device_id: string;
  retry_count: number;
  status: string;
  last_error: string | null;
}

function toMutation(row: MutationRow): LocalMutation {
  return {
    id: asId<'LocalMutationId'>(row.id) as LocalMutationId,
    entityType: row.entity_type as SyncedEntityType,
    entityId: row.entity_id,
    operation: row.operation as MutationOperation,
    payload: JSON.parse(row.payload) as Json,
    localTimestamp: row.local_timestamp,
    deviceId: asId<'DeviceId'>(row.device_id) as DeviceId,
    retryCount: row.retry_count,
    status: row.status as MutationStatus,
    lastError: row.last_error,
  };
}

export interface MutationQueueOptions {
  deviceId: DeviceId;
  generateId: IdGenerator;
  clock?: Clock;
  /** After this many failed attempts a mutation becomes FAILED and stops retrying automatically. */
  maxRetries?: number;
}

/**
 * SQLite-backed outbound queue. `enqueue` takes an executor so callers can (and
 * must) call it with the SAME transaction as the domain write it describes:
 * a local change and its queued mutation commit or roll back together.
 */
export class MutationQueue {
  private readonly deviceId: DeviceId;
  private readonly generateId: IdGenerator;
  private readonly clock: Clock;
  private readonly maxRetries: number;

  constructor(options: MutationQueueOptions) {
    this.deviceId = options.deviceId;
    this.generateId = options.generateId;
    this.clock = options.clock ?? systemClock;
    this.maxRetries = options.maxRetries ?? 5;
  }

  async enqueue(executor: SqlExecutor, mutation: NewLocalMutation): Promise<LocalMutationId> {
    const id = asId<'LocalMutationId'>(this.generateId()) as LocalMutationId;
    await executor.run(
      `INSERT INTO local_mutations
         (id, entity_type, entity_id, operation, payload, local_timestamp, device_id, retry_count, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'PENDING')`,
      [
        id,
        mutation.entityType,
        mutation.entityId,
        mutation.operation,
        JSON.stringify(mutation.payload),
        this.clock(),
        this.deviceId,
      ],
    );
    return id;
  }

  /**
   * Atomically take up to `limit` PENDING mutations (oldest first) and mark them SYNCING.
   * Order matters: later edits to an entity must never overtake earlier ones.
   */
  async claimBatch(executor: SqlExecutor, limit: number): Promise<LocalMutation[]> {
    const rows = await executor.all<MutationRow>(
      `SELECT * FROM local_mutations WHERE status = 'PENDING' ORDER BY rowid LIMIT ?`,
      [limit],
    );
    if (rows.length === 0) return [];
    await executor.run(
      `UPDATE local_mutations SET status = 'SYNCING' WHERE id IN (${rows.map(() => '?').join(',')})`,
      rows.map((r) => r.id),
    );
    return rows.map((r) => toMutation({ ...r, status: 'SYNCING' }));
  }

  async markSynced(executor: SqlExecutor, id: string): Promise<void> {
    await executor.run(
      `UPDATE local_mutations SET status = 'SYNCED', last_error = NULL WHERE id = ?`,
      [id],
    );
  }

  async markConflict(executor: SqlExecutor, id: string, reason: string): Promise<void> {
    await executor.run(
      `UPDATE local_mutations SET status = 'CONFLICT', last_error = ? WHERE id = ?`,
      [reason, id],
    );
  }

  /** Transient failure: back to PENDING with retryCount+1, or FAILED once retries are exhausted. */
  async markRetry(executor: SqlExecutor, id: string, error: string): Promise<'PENDING' | 'FAILED'> {
    const row = await executor.get<{ retry_count: number }>(
      'SELECT retry_count FROM local_mutations WHERE id = ?',
      [id],
    );
    const next = (row?.retry_count ?? 0) + 1;
    const status = next >= this.maxRetries ? 'FAILED' : 'PENDING';
    await executor.run(
      `UPDATE local_mutations SET status = ?, retry_count = ?, last_error = ? WHERE id = ?`,
      [status, next, error, id],
    );
    return status;
  }

  async markFailed(executor: SqlExecutor, id: string, error: string): Promise<void> {
    await executor.run(
      `UPDATE local_mutations SET status = 'FAILED', last_error = ? WHERE id = ?`,
      [error, id],
    );
  }

  /** Crash recovery: anything left SYNCING by a previous process goes back to PENDING. */
  async releaseStuck(executor: SqlExecutor): Promise<number> {
    const { changes } = await executor.run(
      `UPDATE local_mutations SET status = 'PENDING' WHERE status = 'SYNCING'`,
    );
    return changes;
  }

  async countByStatus(executor: SqlExecutor): Promise<Record<MutationStatus, number>> {
    const counts: Record<MutationStatus, number> = {
      PENDING: 0,
      SYNCING: 0,
      SYNCED: 0,
      FAILED: 0,
      CONFLICT: 0,
    };
    const rows = await executor.all<{ status: MutationStatus; n: number }>(
      'SELECT status, COUNT(*) AS n FROM local_mutations GROUP BY status',
    );
    rows.forEach((r) => (counts[r.status] = r.n));
    return counts;
  }

  async list(executor: SqlExecutor, status?: MutationStatus): Promise<LocalMutation[]> {
    const rows = status
      ? await executor.all<MutationRow>(
          'SELECT * FROM local_mutations WHERE status = ? ORDER BY rowid',
          [status],
        )
      : await executor.all<MutationRow>('SELECT * FROM local_mutations ORDER BY rowid');
    return rows.map(toMutation);
  }

  /** Housekeeping: drop mutations the cloud has acknowledged. */
  async purgeSynced(executor: SqlExecutor): Promise<number> {
    const { changes } = await executor.run(`DELETE FROM local_mutations WHERE status = 'SYNCED'`);
    return changes;
  }
}
