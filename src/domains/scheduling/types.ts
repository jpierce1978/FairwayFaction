import type {
  CourseId,
  FactionId,
  FactionRoundTemplateId,
  ScheduledRoundId,
  UserId,
} from '@/types/ids';
import type { IsoTimestamp } from '@/types/common';

export type ScheduledRoundStatus =
  'UPCOMING' | 'OPEN_FOR_RSVP' | 'READY' | 'CONVERTED_TO_ROUND' | 'CANCELLED';

export type RsvpStatus = 'YES' | 'NO' | 'MAYBE' | 'NO_RESPONSE';

export interface ScheduledRound {
  id: ScheduledRoundId;
  factionId: FactionId;
  templateId: FactionRoundTemplateId | null;
  scheduledAt: IsoTimestamp;
  courseId: CourseId;
  status: ScheduledRoundStatus;
}

export interface RoundRsvp {
  scheduledRoundId: ScheduledRoundId;
  userId: UserId;
  status: RsvpStatus;
  updatedAt: IsoTimestamp;
}
