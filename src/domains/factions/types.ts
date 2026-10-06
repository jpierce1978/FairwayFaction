import type {
  CourseId,
  FactionId,
  FactionInviteId,
  FactionRoundTemplateId,
  GamePresetId,
  UserId,
} from '@/types/ids';
import type { IsoTimestamp, JsonObject } from '@/types/common';

export type FactionVisibility = 'PRIVATE' | 'INVITE_ONLY';
export type FactionRole = 'ADMIN' | 'MEMBER';
export type FactionMemberStatus = 'ACTIVE' | 'INVITED' | 'REMOVED';
export type TeamMethod = 'RANDOM' | 'MANUAL' | 'SAVED';
export type InviteStatus = 'ACTIVE' | 'USED' | 'REVOKED' | 'EXPIRED';

export interface Faction {
  id: FactionId;
  name: string;
  homeCourseId: CourseId | null;
  timezone: string;
  visibility: FactionVisibility;
  createdBy: UserId;
  settings: JsonObject;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export interface FactionMember {
  factionId: FactionId;
  userId: UserId;
  role: FactionRole;
  status: FactionMemberStatus;
  joinedAt: IsoTimestamp;
}

export interface FactionRoundTemplate {
  id: FactionRoundTemplateId;
  factionId: FactionId;
  name: string;
  courseId: CourseId;
  /** e.g. { weekday: 6, time: "13:00" }. Shape is owned by the scheduling domain. */
  scheduleDefaults: JsonObject;
  defaultGamePresetIds: GamePresetId[];
  defaultTeamMethod: TeamMethod;
  defaultRoundSettings: JsonObject;
}

export interface FactionInvite {
  id: FactionInviteId;
  factionId: FactionId;
  code: string;
  invitedBy: UserId;
  expiresAt: IsoTimestamp | null;
  status: InviteStatus;
}
