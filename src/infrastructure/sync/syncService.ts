import type { SqlDatabase } from '@/infrastructure/database/sqlite/types';
import type { MutationQueue } from './mutationQueue';
import type { ConnectivityMonitor, SyncReport, SyncTransport } from './types';

export interface SyncServiceOptions {
  db: SqlDatabase;
  queue: MutationQueue;
  transport: SyncTransport;
  connectivity: ConnectivityMonitor;
  batchSize?: number;
}

const EMPTY_REPORT: SyncReport = {
  attempted: 0,
  synced: 0,
  conflicts: 0,
  retried: 0,
  failed: 0,
  skippedOffline: false,
};

/**
 * Drains the LocalMutation queue to the cloud. Scoring never waits on this:
 * it runs after the local write has already committed (DOMAIN_MAP write flow).
 */
export class SyncService {
  private running: Promise<SyncReport> | null = null;
  private readonly batchSize: number;

  constructor(private readonly options: SyncServiceOptions) {
    this.batchSize = options.batchSize ?? 50;
  }

  /** Coalesces concurrent calls: callers share one in-flight run. */
  sync(): Promise<SyncReport> {
    this.running ??= this.run().finally(() => {
      this.running = null;
    });
    return this.running;
  }

  private async run(): Promise<SyncReport> {
    const { db, queue, transport, connectivity } = this.options;
    const report: SyncReport = { ...EMPTY_REPORT };

    await queue.releaseStuck(db);

    if (!(await connectivity.isOnline())) {
      return { ...report, skippedOffline: true };
    }

    // Drain until empty or a batch makes no forward progress (all retries), avoiding a hot loop.
    for (;;) {
      const batch = await db.transaction((tx) => queue.claimBatch(tx, this.batchSize));
      if (batch.length === 0) break;
      report.attempted += batch.length;

      let outcomes;
      try {
        outcomes = await transport.push(batch);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        await db.transaction(async (tx) => {
          for (const m of batch) await queue.markRetry(tx, m.id, message);
        });
        report.retried += batch.length;
        break;
      }

      let progressed = false;
      await db.transaction(async (tx) => {
        for (const m of batch) {
          const outcome = outcomes[m.id];
          if (!outcome) {
            await queue.markRetry(tx, m.id, 'Transport returned no outcome');
            report.retried++;
          } else if (outcome.status === 'SYNCED') {
            await queue.markSynced(tx, m.id);
            report.synced++;
            progressed = true;
          } else if (outcome.status === 'CONFLICT') {
            await queue.markConflict(tx, m.id, outcome.reason);
            report.conflicts++;
            progressed = true;
          } else if (outcome.status === 'REJECTED') {
            await queue.markFailed(tx, m.id, outcome.error);
            report.failed++;
            progressed = true;
          } else {
            const next = await queue.markRetry(tx, m.id, outcome.error);
            if (next === 'FAILED') report.failed++;
            else report.retried++;
          }
        }
      });
      if (!progressed) break;
    }
    return report;
  }
}
