import type { DeviceId, HoleId, RoundId, RoundPlayerId, ScoreEventId, UserId } from '@/types/ids';
import type { IsoTimestamp, JsonObject } from '@/types/common';

export type FairwayResult = 'LEFT' | 'HIT' | 'RIGHT';
export type ScoreSyncStatus = 'LOCAL_ONLY' | 'PENDING' | 'SYNCED' | 'CONFLICT';

/**
 * One logical score record for RoundPlayer + Hole (unique on roundPlayerId + holeId).
 * The single source of truth for golf scores; games and statistics only read it.
 */
export interface ScoreEvent {
  id: ScoreEventId;
  roundId: RoundId;
  roundPlayerId: RoundPlayerId;
  holeId: HoleId;
  grossScore: number;
  putts: number | null;
  fairwayResult: FairwayResult | null;
  gir: boolean | null;
  penalties: number | null;
  metadata: JsonObject;
  updatedAt: IsoTimestamp;
  updatedBy: UserId;
  deviceId: DeviceId;
  version: number;
  /** Local-only bookkeeping; not stored in Supabase. */
  syncStatus: ScoreSyncStatus;
}
