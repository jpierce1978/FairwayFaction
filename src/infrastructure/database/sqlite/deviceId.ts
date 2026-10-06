import { asId, type DeviceId } from '@/types/ids';
import type { IdGenerator } from '@/utils/ids';
import type { SqlDatabase } from './types';

/** Stable per-install identifier used to attribute scores and mutations to a device. */
export async function getOrCreateDeviceId(
  db: SqlDatabase,
  generate: IdGenerator,
): Promise<DeviceId> {
  const existing = await db.get<{ value: string }>(
    `SELECT value FROM local_meta WHERE key = 'device_id'`,
  );
  if (existing) return asId<'DeviceId'>(existing.value);
  const id = generate();
  // INSERT OR IGNORE then re-read: safe if two callers race on first launch.
  await db.run(`INSERT OR IGNORE INTO local_meta (key, value) VALUES ('device_id', ?)`, [id]);
  const row = await db.get<{ value: string }>(
    `SELECT value FROM local_meta WHERE key = 'device_id'`,
  );
  return asId<'DeviceId'>(row!.value);
}
