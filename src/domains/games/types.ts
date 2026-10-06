import type { GameInstanceId, GamePresetId, FactionId, RoundId, UserId } from '@/types/ids';
import type { IsoTimestamp, JsonObject } from '@/types/common';

export type GameInstanceStatus = 'PENDING' | 'ACTIVE' | 'COMPLETE' | 'INVALID';

/** A reusable configuration, e.g. "Saturday Best Ball". */
export interface GamePreset {
  id: GamePresetId;
  factionId: FactionId | null;
  ownerId: UserId;
  gameDefinitionKey: string;
  name: string;
  configuration: JsonObject;
  createdAt: IsoTimestamp;
}

/** A configured game attached to a Round. */
export interface GameInstance {
  id: GameInstanceId;
  roundId: RoundId;
  gameDefinitionKey: string;
  gameDefinitionVersion: number;
  presetId: GamePresetId | null;
  configuration: JsonObject;
  status: GameInstanceStatus;
}

export type GameWinnerType = 'PLAYER' | 'TEAM';

/** Normalized, game-agnostic outcome. Abstract "units"; money is the ledger's concern. */
export interface GameResultDraft {
  resultType: string;
  winnerType: GameWinnerType;
  winnerId: string;
  loserId: string | null;
  unitCount: number;
  description: string;
  metadata: JsonObject;
}

/** A draft stamped with the GameInstance that produced it. */
export interface GameResult extends GameResultDraft {
  gameInstanceId: GameInstanceId;
}
