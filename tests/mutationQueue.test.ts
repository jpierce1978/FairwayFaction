import { MutationQueue } from '@/infrastructure/sync/mutationQueue';
import { SyncService } from '@/infrastructure/sync/syncService';
import type {
  ConnectivityMonitor,
  LocalMutation,
  PushOutcome,
  SyncTransport,
} from '@/infrastructure/sync/types';
import { DEVICE, fixedClock, migratedDb, sequentialIds } from './helpers/fixtures';

const makeQueue = (maxRetries = 3) =>
  new MutationQueue({
    deviceId: DEVICE,
    generateId: sequentialIds('m'),
    clock: fixedClock(),
    maxRetries,
  });

const enqueueN = async (
  db: Awaited<ReturnType<typeof migratedDb>>,
  q: MutationQueue,
  n: number,
) => {
  for (let i = 1; i <= n; i++) {
    await q.enqueue(db, {
      entityType: 'score_event',
      entityId: `e${i}`,
      operation: 'UPSERT',
      payload: { n: i },
    });
  }
};

const online: ConnectivityMonitor = { isOnline: async () => true };
const offline: ConnectivityMonitor = { isOnline: async () => false };

describe('MutationQueue', () => {
  it('enqueues PENDING mutations with device id, timestamp and JSON payload', async () => {
    const db = await migratedDb();
    const q = makeQueue();
    await q.enqueue(db, {
      entityType: 'round',
      entityId: 'r1',
      operation: 'UPSERT',
      payload: { a: [1, 2] },
    });
    const [m] = await q.list(db);
    expect(m).toMatchObject({
      entityType: 'round',
      entityId: 'r1',
      operation: 'UPSERT',
      payload: { a: [1, 2] },
      deviceId: DEVICE,
      status: 'PENDING',
      retryCount: 0,
      localTimestamp: '2026-10-10T17:00:00.000Z',
    });
  });

  it('claims oldest-first, marks SYNCING, and never hands out the same mutation twice', async () => {
    const db = await migratedDb();
    const q = makeQueue();
    await enqueueN(db, q, 5);
    const first = await q.claimBatch(db, 2);
    expect(first.map((m) => m.entityId)).toEqual(['e1', 'e2']);
    expect(first.every((m) => m.status === 'SYNCING')).toBe(true);
    const second = await q.claimBatch(db, 10);
    expect(second.map((m) => m.entityId)).toEqual(['e3', 'e4', 'e5']);
    expect(await q.claimBatch(db, 10)).toEqual([]);
  });

  it('retries transient failures then gives up as FAILED after maxRetries', async () => {
    const db = await migratedDb();
    const q = makeQueue(3);
    await enqueueN(db, q, 1);
    const id = (await q.list(db))[0]!.id;
    expect(await q.markRetry(db, id, 'net')).toBe('PENDING');
    expect(await q.markRetry(db, id, 'net')).toBe('PENDING');
    expect(await q.markRetry(db, id, 'net')).toBe('FAILED');
    const [m] = await q.list(db);
    expect(m).toMatchObject({ status: 'FAILED', retryCount: 3, lastError: 'net' });
  });

  it('releases mutations stuck in SYNCING (crash recovery)', async () => {
    const db = await migratedDb();
    const q = makeQueue();
    await enqueueN(db, q, 2);
    await q.claimBatch(db, 2);
    expect(await q.releaseStuck(db)).toBe(2);
    expect((await q.countByStatus(db)).PENDING).toBe(2);
  });

  it('records conflicts without discarding the mutation', async () => {
    const db = await migratedDb();
    const q = makeQueue();
    await enqueueN(db, q, 1);
    const id = (await q.list(db))[0]!.id;
    await q.markConflict(db, id, 'cloud has v5');
    expect(await q.list(db, 'CONFLICT')).toHaveLength(1);
    expect(await q.purgeSynced(db)).toBe(0);
    expect(await q.list(db)).toHaveLength(1);
  });

  it('commits or rolls back together with the domain write in one transaction', async () => {
    const db = await migratedDb();
    const q = makeQueue();
    await expect(
      db.transaction(async (tx) => {
        await tx.run(`INSERT INTO local_meta (key, value) VALUES ('x', '1')`);
        await q.enqueue(tx, {
          entityType: 'round',
          entityId: 'r',
          operation: 'UPSERT',
          payload: {},
        });
        throw new Error('abort');
      }),
    ).rejects.toThrow('abort');
    expect(await q.list(db)).toEqual([]);
    expect(await db.all('SELECT * FROM local_meta')).toEqual([]);
  });
});

describe('SyncService', () => {
  const setup = async (transport: SyncTransport, connectivity = online, batchSize = 2) => {
    const db = await migratedDb();
    const queue = makeQueue(3);
    const service = new SyncService({ db, queue, transport, connectivity, batchSize });
    return { db, queue, service };
  };

  const allSynced: SyncTransport = {
    push: async (batch) =>
      Object.fromEntries(batch.map((m) => [m.id, { status: 'SYNCED' } as PushOutcome])),
  };

  it('drains the whole queue across multiple batches in order', async () => {
    const seen: string[] = [];
    const transport: SyncTransport = {
      push: async (batch) => {
        batch.forEach((m) => seen.push(m.entityId));
        return allSynced.push(batch);
      },
    };
    const { db, queue, service } = await setup(transport);
    await enqueueN(db, queue, 5);
    const report = await service.sync();
    expect(seen).toEqual(['e1', 'e2', 'e3', 'e4', 'e5']);
    expect(report).toMatchObject({ attempted: 5, synced: 5, conflicts: 0, failed: 0 });
    expect((await queue.countByStatus(db)).SYNCED).toBe(5);
  });

  it('does nothing and loses nothing while offline', async () => {
    const push = jest.fn();
    const { db, queue, service } = await setup({ push }, offline);
    await enqueueN(db, queue, 3);
    const report = await service.sync();
    expect(report.skippedOffline).toBe(true);
    expect(push).not.toHaveBeenCalled();
    expect((await queue.countByStatus(db)).PENDING).toBe(3);
  });

  it('retries the whole batch when the transport throws, then gives up after maxRetries', async () => {
    const { db, queue, service } = await setup({
      push: async () => {
        throw new Error('503');
      },
    });
    await enqueueN(db, queue, 1);
    await service.sync();
    await service.sync();
    await service.sync();
    const [m] = await queue.list(db);
    expect(m).toMatchObject({ status: 'FAILED', retryCount: 3, lastError: '503' });
  });

  it('applies per-mutation outcomes: synced, conflict, rejected, retry', async () => {
    const { db, queue, service } = await setup(
      {
        push: async (batch: readonly LocalMutation[]) => ({
          [batch[0]!.id]: { status: 'SYNCED' } as PushOutcome,
          [batch[1]!.id]: { status: 'CONFLICT', reason: 'newer on cloud' } as PushOutcome,
        }),
      },
      online,
      4,
    );
    await enqueueN(db, queue, 2);
    const report = await service.sync();
    expect(report).toMatchObject({ synced: 1, conflicts: 1 });
    const byStatus = await queue.countByStatus(db);
    expect(byStatus).toMatchObject({ SYNCED: 1, CONFLICT: 1, PENDING: 0 });
    expect((await queue.list(db, 'CONFLICT'))[0]!.lastError).toBe('newer on cloud');
  });

  it('marks REJECTED mutations FAILED immediately', async () => {
    const { db, queue, service } = await setup({
      push: async (batch) =>
        Object.fromEntries(
          batch.map((m) => [m.id, { status: 'REJECTED', error: 'RLS' } as PushOutcome]),
        ),
    });
    await enqueueN(db, queue, 1);
    const report = await service.sync();
    expect(report.failed).toBe(1);
    expect((await queue.countByStatus(db)).FAILED).toBe(1);
  });

  it('recovers mutations stranded as SYNCING by a previous crash', async () => {
    const { db, queue, service } = await setup(allSynced);
    await enqueueN(db, queue, 2);
    await queue.claimBatch(db, 2); // simulate crash mid-sync
    await service.sync();
    expect((await queue.countByStatus(db)).SYNCED).toBe(2);
  });

  it('coalesces concurrent sync calls into one run', async () => {
    const push = jest.fn(allSynced.push);
    const { db, queue, service } = await setup({ push }, online, 10);
    await enqueueN(db, queue, 3);
    const [a, b] = await Promise.all([service.sync(), service.sync()]);
    expect(a).toBe(b);
    expect(push).toHaveBeenCalledTimes(1);
  });
});
