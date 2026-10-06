import type { SqlDatabase, SqlExecutor } from '../types';
import type { MutationQueue } from '@/infrastructure/sync/mutationQueue';
import type { ScoreEvent, FairwayResult } from '@/domains/scoring/types';
import { validateScoreInput, type ScoreInput } from '@/domains/scoring/validation';
import {
  asId,
  type DeviceId,
  type HoleId,
  type RoundId,
  type RoundPlayerId,
  type ScoreEventId,
  type UserId,
} from '@/types/ids';
import type { JsonObject } from '@/types/common';
import type { Clock } from '@/utils/clock';
import { systemClock } from '@/utils/clock';
import type { IdGenerator } from '@/utils/ids';

interface ScoreRow {
  id: string;
  round_id: string;
  round_player_id: string;
  hole_id: string;
  gross_score: number;
  putts: number | null;
  fairway_result: string | null;
  gir: number | null;
  penalties: number | null;
  metadata: string;
  updated_at: string;
  updated_by: string;
  device_id: string;
  version: number;
  sync_status: string;
}

export function toScoreEvent(row: ScoreRow): ScoreEvent {
  return {
    id: asId<'ScoreEventId'>(row.id) as ScoreEventId,
    roundId: asId<'RoundId'>(row.round_id) as RoundId,
    roundPlayerId: asId<'RoundPlayerId'>(row.round_player_id) as RoundPlayerId,
    holeId: asId<'HoleId'>(row.hole_id) as HoleId,
    grossScore: row.gross_score,
    putts: row.putts,
    fairwayResult: row.fairway_result as FairwayResult | null,
    gir: row.gir === null ? null : row.gir === 1,
    penalties: row.penalties,
    metadata: JSON.parse(row.metadata) as JsonObject,
    updatedAt: row.updated_at,
    updatedBy: asId<'UserId'>(row.updated_by) as UserId,
    deviceId: asId<'DeviceId'>(row.device_id) as DeviceId,
    version: row.version,
    syncStatus: row.sync_status as ScoreEvent['syncStatus'],
  };
}

export interface RecordScoreInput extends ScoreInput {
  roundId: RoundId;
  roundPlayerId: RoundPlayerId;
  holeId: HoleId;
  fairwayResult?: FairwayResult | null;
  gir?: boolean | null;
  updatedBy: UserId;
}

export class InvalidScoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidScoreError';
  }
}

/**
 * The local-first write path for golf scores (architecture only in Milestone 1;
 * no UI calls this yet). One SQLite transaction: upsert the ScoreEvent AND queue
 * its sync mutation. The network is never involved; the UI and game recalculation
 * read the committed local row.
 */
export class ScoreRepository {
  constructor(
    private readonly db: SqlDatabase,
    private readonly queue: MutationQueue,
    private readonly deviceId: DeviceId,
    private readonly generateId: IdGenerator,
    private readonly clock: Clock = systemClock,
  ) {}

  async recordScore(input: RecordScoreInput): Promise<ScoreEvent> {
    const validation = validateScoreInput(input);
    if (!validation.valid)
      throw new InvalidScoreError(validation.issues[0]?.message ?? 'Invalid score');

    return this.db.transaction(async (tx) => {
      const existing = await tx.get<ScoreRow>(
        'SELECT * FROM score_events WHERE round_player_id = ? AND hole_id = ?',
        [input.roundPlayerId, input.holeId],
      );
      const now = this.clock();
      const id = existing?.id ?? this.generateId();
      const version = (existing?.version ?? 0) + 1;

      await tx.run(
        `INSERT INTO score_events
           (id, round_id, round_player_id, hole_id, gross_score, putts, fairway_result, gir, penalties,
            metadata, updated_at, updated_by, device_id, version, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
         ON CONFLICT (round_player_id, hole_id) DO UPDATE SET
           gross_score = excluded.gross_score,
           putts = COALESCE(excluded.putts, putts),
           fairway_result = COALESCE(excluded.fairway_result, fairway_result),
           gir = COALESCE(excluded.gir, gir),
           penalties = COALESCE(excluded.penalties, penalties),
           updated_at = excluded.updated_at,
           updated_by = excluded.updated_by,
           device_id = excluded.device_id,
           version = excluded.version,
           sync_status = 'PENDING'`,
        [
          id,
          input.roundId,
          input.roundPlayerId,
          input.holeId,
          input.grossScore,
          input.putts ?? null,
          input.fairwayResult ?? null,
          input.gir === undefined || input.gir === null ? null : input.gir ? 1 : 0,
          input.penalties ?? null,
          existing?.metadata ?? '{}',
          now,
          input.updatedBy,
          this.deviceId,
          version,
        ],
      );

      const saved = toScoreEvent(
        (await tx.get<ScoreRow>('SELECT * FROM score_events WHERE id = ?', [id]))!,
      );
      await this.queue.enqueue(tx, {
        entityType: 'score_event',
        entityId: saved.id,
        operation: 'UPSERT',
        payload: scoreToPayload(saved),
      });
      return saved;
    });
  }

  async listForRound(executor: SqlExecutor, roundId: RoundId): Promise<ScoreEvent[]> {
    const rows = await executor.all<ScoreRow>(
      'SELECT * FROM score_events WHERE round_id = ? ORDER BY updated_at, id',
      [roundId],
    );
    return rows.map(toScoreEvent);
  }
}

/** Cloud-facing shape: everything except the local-only syncStatus. */
function scoreToPayload(score: ScoreEvent): JsonObject {
  const { syncStatus: _local, ...cloud } = score;
  return cloud as unknown as JsonObject;
}
