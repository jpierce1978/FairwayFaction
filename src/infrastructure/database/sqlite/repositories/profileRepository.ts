import type { SqlDatabase } from '../types';
import type { MutationQueue } from '@/infrastructure/sync/mutationQueue';
import type { Profile } from '@/domains/auth/types';
import { validateBasicProfile } from '@/domains/auth/validation';
import type { JsonObject } from '@/types/common';
import { asId, type CourseId, type UserId } from '@/types/ids';
import type { Clock } from '@/utils/clock';
import { systemClock } from '@/utils/clock';

interface ProfileRow {
  user_id: string;
  display_name: string;
  full_name: string | null;
  avatar_url: string | null;
  home_course_id: string | null;
  preferred_tee: string | null;
  handicap_index: number | null;
  handicap_provider: string | null;
  handicap_provider_id: string | null;
  preferences: string;
  updated_at: string;
}

function toProfile(row: ProfileRow): Profile {
  return {
    userId: asId<'UserId'>(row.user_id) as UserId,
    displayName: row.display_name,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    homeCourseId:
      row.home_course_id === null ? null : (asId<'CourseId'>(row.home_course_id) as CourseId),
    preferredTee: row.preferred_tee,
    handicapIndex: row.handicap_index,
    handicapProvider: row.handicap_provider,
    handicapProviderId: row.handicap_provider_id,
    preferences: JSON.parse(row.preferences) as JsonObject,
    updatedAt: row.updated_at,
  };
}

export interface BasicProfileInput {
  userId: UserId;
  fullName: string;
  displayName: string;
  handicapIndex?: number | null;
}

export class InvalidProfileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidProfileError';
  }
}

export class ProfileRepository {
  constructor(
    private readonly db: SqlDatabase,
    private readonly queue: MutationQueue,
    private readonly clock: Clock = systemClock,
  ) {}

  async get(userId: UserId): Promise<Profile | null> {
    const row = await this.db.get<ProfileRow>('SELECT * FROM profiles WHERE user_id = ?', [userId]);
    return row ? toProfile(row) : null;
  }

  /** Local write first, cloud later: the profile and its sync mutation commit together. */
  async saveBasicProfile(input: BasicProfileInput): Promise<Profile> {
    const validation = validateBasicProfile(input);
    if (!validation.valid)
      throw new InvalidProfileError(validation.issues[0]?.message ?? 'Invalid profile');

    return this.db.transaction(async (tx) => {
      await tx.run(
        `INSERT INTO profiles (user_id, display_name, full_name, handicap_index, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (user_id) DO UPDATE SET
           display_name = excluded.display_name,
           full_name = excluded.full_name,
           handicap_index = excluded.handicap_index,
           updated_at = excluded.updated_at`,
        [
          input.userId,
          input.displayName.trim(),
          input.fullName.trim(),
          input.handicapIndex ?? null,
          this.clock(),
        ],
      );
      const saved = toProfile(
        (await tx.get<ProfileRow>('SELECT * FROM profiles WHERE user_id = ?', [input.userId]))!,
      );
      await this.queue.enqueue(tx, {
        entityType: 'profile',
        entityId: saved.userId,
        operation: 'UPSERT',
        payload: saved as unknown as JsonObject,
      });
      return saved;
    });
  }
}
