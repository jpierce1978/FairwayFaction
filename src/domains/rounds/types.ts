import type {
  CourseId,
  CourseTeeId,
  FactionId,
  GuestProfileId,
  RoundId,
  RoundPlayerId,
  RoundTeamId,
  ScheduledRoundId,
  ScoringGroupId,
  UserId,
} from '@/types/ids';
import type { IsoTimestamp, JsonObject } from '@/types/common';

export type RoundStatus = 'DRAFT' | 'READY' | 'ACTIVE' | 'FINALIZING' | 'COMPLETE' | 'CANCELLED';
export type RoundPlayerStatus = 'ACTIVE' | 'WITHDRAWN';

export interface Round {
  id: RoundId;
  factionId: FactionId | null;
  scheduledRoundId: ScheduledRoundId | null;
  courseId: CourseId;
  startedAt: IsoTimestamp | null;
  completedAt: IsoTimestamp | null;
  status: RoundStatus;
  createdBy: UserId;
  /** Incremented on every local change to the round; compared with cloudVersion for conflict detection. */
  localVersion: number;
  cloudVersion: number;
}

/**
 * Participation. Exactly one of userId / guestProfileId is set.
 * displayNameSnapshot and handicapSnapshot freeze values so old rounds never change.
 */
export interface RoundPlayer {
  id: RoundPlayerId;
  roundId: RoundId;
  userId: UserId | null;
  guestProfileId: GuestProfileId | null;
  displayNameSnapshot: string;
  teeId: CourseTeeId | null;
  handicapSnapshot: number | null;
  scoringGroupId: ScoringGroupId | null;
  startOrder: number;
  status: RoundPlayerStatus;
}

/** A guest does not need an account. Belongs to the round first; may be converted later. */
export interface GuestProfile {
  id: GuestProfileId;
  displayName: string;
  contact: JsonObject | null;
  createdBy: UserId;
}

export interface RoundTeam {
  id: RoundTeamId;
  roundId: RoundId;
  name: string;
  displayOrder: number;
}

export interface RoundTeamMember {
  teamId: RoundTeamId;
  roundPlayerId: RoundPlayerId;
}
