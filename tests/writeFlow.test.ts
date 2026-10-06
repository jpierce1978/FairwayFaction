import {
  ScoreRepository,
  InvalidScoreError,
} from '@/infrastructure/database/sqlite/repositories/scoreRepository';
import {
  loadGameInstances,
  loadRoundContext,
} from '@/infrastructure/database/sqlite/repositories/roundContextLoader';
import {
  ProfileRepository,
  InvalidProfileError,
} from '@/infrastructure/database/sqlite/repositories/profileRepository';
import { getOrCreateDeviceId } from '@/infrastructure/database/sqlite/deviceId';
import { MutationQueue } from '@/infrastructure/sync/mutationQueue';
import { calculateGames, createDevelopmentRegistry } from '@/games';
import { LOW_TOTAL_KEY } from '@/games/sample/lowTotal';
import {
  DEVICE,
  HOLE_1,
  HOLE_2,
  HOLE_3,
  PLAYER_JP,
  PLAYER_PAUL,
  ROUND,
  USER,
  fixedClock,
  migratedDb,
  seedRound,
  sequentialIds,
} from './helpers/fixtures';

async function setup() {
  const db = await migratedDb();
  await seedRound(db);
  const queue = new MutationQueue({
    deviceId: DEVICE,
    generateId: sequentialIds('m'),
    clock: fixedClock(),
  });
  const scores = new ScoreRepository(db, queue, DEVICE, sequentialIds('s'), fixedClock());
  return { db, queue, scores };
}

const score = (player: typeof PLAYER_JP, hole: typeof HOLE_1, gross: number, extra = {}) => ({
  roundId: ROUND,
  roundPlayerId: player,
  holeId: hole,
  grossScore: gross,
  updatedBy: USER,
  ...extra,
});

describe('local-first score write path', () => {
  it('writes the ScoreEvent to SQLite and queues exactly one mutation, atomically', async () => {
    const { db, queue, scores } = await setup();
    const saved = await scores.recordScore(score(PLAYER_JP, HOLE_1, 4));
    expect(saved).toMatchObject({
      grossScore: 4,
      version: 1,
      syncStatus: 'PENDING',
      deviceId: DEVICE,
    });

    const mutations = await queue.list(db);
    expect(mutations).toHaveLength(1);
    expect(mutations[0]).toMatchObject({
      entityType: 'score_event',
      entityId: saved.id,
      operation: 'UPSERT',
      status: 'PENDING',
    });
    expect(mutations[0]!.payload).toMatchObject({ grossScore: 4, roundPlayerId: PLAYER_JP });
    expect(mutations[0]!.payload).not.toHaveProperty('syncStatus'); // local-only field never leaves the device
  });

  it('correcting a score keeps one logical row, bumps version, and queues another mutation (undo/correct)', async () => {
    const { db, queue, scores } = await setup();
    const first = await scores.recordScore(score(PLAYER_JP, HOLE_1, 5, { putts: 2 }));
    const second = await scores.recordScore(score(PLAYER_JP, HOLE_1, 4));
    expect(second.id).toBe(first.id);
    expect(second).toMatchObject({ grossScore: 4, version: 2, putts: 2 }); // advanced stats are preserved
    expect(await db.all('SELECT id FROM score_events')).toHaveLength(1);
    expect(await queue.list(db)).toHaveLength(2);
  });

  it('rejects invalid scores without touching the database or queue', async () => {
    const { db, queue, scores } = await setup();
    await expect(scores.recordScore(score(PLAYER_JP, HOLE_1, 0))).rejects.toBeInstanceOf(
      InvalidScoreError,
    );
    await expect(scores.recordScore(score(PLAYER_JP, HOLE_1, 4.5))).rejects.toBeInstanceOf(
      InvalidScoreError,
    );
    expect(await db.all('SELECT id FROM score_events')).toEqual([]);
    expect(await queue.list(db)).toEqual([]);
  });

  it('does not require advanced stats to save a score', async () => {
    const { scores } = await setup();
    const saved = await scores.recordScore(score(PLAYER_JP, HOLE_2, 3));
    expect(saved).toMatchObject({ putts: null, fairwayResult: null, gir: null, penalties: null });
  });

  it('rolls back the score if the queue write fails (nothing is half-saved)', async () => {
    const { db, scores } = await setup();
    await db.exec('DROP TABLE local_mutations');
    await expect(scores.recordScore(score(PLAYER_JP, HOLE_1, 4))).rejects.toThrow();
    expect(await db.all('SELECT id FROM score_events')).toEqual([]);
  });

  it('end to end: score write -> load RoundContext -> deterministic game recalculation', async () => {
    const { db, scores } = await setup();
    await db.run(
      `INSERT INTO game_instances (id, round_id, game_definition_key, game_definition_version, configuration, status)
       VALUES ('gi1', 'r1', ?, 1, '{"unitsForWin": 2}', 'ACTIVE')`,
      [LOW_TOTAL_KEY],
    );
    await scores.recordScore(score(PLAYER_JP, HOLE_1, 4));
    await scores.recordScore(score(PLAYER_PAUL, HOLE_1, 5));
    await scores.recordScore(score(PLAYER_JP, HOLE_2, 3));
    await scores.recordScore(score(PLAYER_PAUL, HOLE_2, 3));

    const registry = createDevelopmentRegistry();
    const recalc = async () => {
      const context = (await loadRoundContext(db, ROUND))!;
      return calculateGames(registry, context, await loadGameInstances(db, ROUND));
    };

    const [mid] = await recalc();
    expect(mid!.status).toBe('OK');
    expect(mid!.results).toHaveLength(1);
    expect(mid!.results[0]).toMatchObject({
      winnerId: PLAYER_JP,
      unitCount: 2,
      gameInstanceId: 'gi1',
    });
    expect(mid!.completion).toMatchObject({ complete: false }); // hole 3 not scored

    // Correct Paul's hole 1 to a 4: totals tie, which must not be silently resolved.
    await scores.recordScore(score(PLAYER_PAUL, HOLE_1, 4));
    await scores.recordScore(score(PLAYER_JP, HOLE_3, 5));
    await scores.recordScore(score(PLAYER_PAUL, HOLE_3, 5));
    const [tied] = await recalc();
    expect(tied!.results).toEqual([]);
    expect(tied!.completion).toMatchObject({
      complete: false,
      unresolvedTies: [PLAYER_JP, PLAYER_PAUL],
    });

    // Same inputs, same outputs (determinism).
    expect(await recalc()).toEqual(await recalc());
  });

  it('loadRoundContext returns null for unknown rounds', async () => {
    const { db } = await setup();
    expect(await loadRoundContext(db, 'nope' as typeof ROUND)).toBeNull();
  });
});

describe('profile repository', () => {
  it('saves locally and queues a profile mutation together', async () => {
    const db = await migratedDb();
    const queue = new MutationQueue({
      deviceId: DEVICE,
      generateId: sequentialIds('m'),
      clock: fixedClock(),
    });
    const profiles = new ProfileRepository(db, queue, fixedClock());
    const saved = await profiles.saveBasicProfile({
      userId: USER,
      fullName: ' Jarrod ',
      displayName: ' JP ',
      handicapIndex: 12.4,
    });
    expect(saved).toMatchObject({ displayName: 'JP', fullName: 'Jarrod', handicapIndex: 12.4 });
    expect(await profiles.get(USER)).toEqual(saved);
    expect((await queue.list(db)).map((m) => m.entityType)).toEqual(['profile']);
  });

  it('rejects an invalid profile', async () => {
    const db = await migratedDb();
    const queue = new MutationQueue({ deviceId: DEVICE, generateId: sequentialIds('m') });
    const profiles = new ProfileRepository(db, queue);
    await expect(
      profiles.saveBasicProfile({ userId: USER, fullName: '', displayName: 'JP' }),
    ).rejects.toBeInstanceOf(InvalidProfileError);
  });
});

describe('device id', () => {
  it('is generated once and then stable', async () => {
    const db = await migratedDb();
    const gen = sequentialIds('dev');
    const a = await getOrCreateDeviceId(db, gen);
    const b = await getOrCreateDeviceId(db, gen);
    expect(a).toBe('dev-1');
    expect(b).toBe(a);
  });
});
