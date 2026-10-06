import { MIGRATIONS, runMigrations } from '@/infrastructure/database/sqlite';
import type { SqlDatabase } from '@/infrastructure/database/sqlite/types';
import { createNodeSqliteDatabase } from './nodeSqlite';
import {
  asId,
  type DeviceId,
  type HoleId,
  type RoundId,
  type RoundPlayerId,
  type UserId,
} from '@/types/ids';

export const USER = asId<'UserId'>('00000000-0000-4000-8000-000000000001') as UserId;
export const DEVICE = asId<'DeviceId'>('device-test-1') as DeviceId;
export const ROUND = asId<'RoundId'>('r1') as RoundId;
export const HOLE_1 = asId<'HoleId'>('h1') as HoleId;
export const HOLE_2 = asId<'HoleId'>('h2') as HoleId;
export const HOLE_3 = asId<'HoleId'>('h3') as HoleId;
export const PLAYER_JP = asId<'RoundPlayerId'>('p-jp') as RoundPlayerId;
export const PLAYER_PAUL = asId<'RoundPlayerId'>('p-paul') as RoundPlayerId;

/** Deterministic id generator: id-1, id-2, ... */
export function sequentialIds(prefix = 'id') {
  let n = 0;
  return () => `${prefix}-${++n}`;
}

export const fixedClock =
  (iso = '2026-10-10T17:00:00.000Z') =>
  () =>
    iso;

export async function migratedDb(): Promise<SqlDatabase> {
  const db = createNodeSqliteDatabase();
  await runMigrations(db, MIGRATIONS);
  return db;
}

/** A 3-hole course, one ACTIVE round with two players (JP, Paul). */
export async function seedRound(db: SqlDatabase): Promise<void> {
  await db.exec(`
    INSERT INTO courses (id, name, timezone, number_of_holes) VALUES ('c1', 'Test Course', 'UTC', 9);
    INSERT INTO holes (id, course_id, hole_number, par) VALUES
      ('h1', 'c1', 1, 4), ('h2', 'c1', 2, 3), ('h3', 'c1', 3, 5);
    INSERT INTO rounds (id, course_id, status, created_by, started_at)
      VALUES ('r1', 'c1', 'ACTIVE', '${USER}', '2026-10-10T17:00:00.000Z');
    INSERT INTO round_players (id, round_id, user_id, display_name_snapshot, start_order) VALUES
      ('p-jp', 'r1', '${USER}', 'JP', 1);
    INSERT INTO guest_profiles (id, display_name, created_by) VALUES ('g-paul', 'Paul', '${USER}');
    INSERT INTO round_players (id, round_id, guest_profile_id, display_name_snapshot, start_order) VALUES
      ('p-paul', 'r1', 'g-paul', 'Paul', 2);
  `);
}
