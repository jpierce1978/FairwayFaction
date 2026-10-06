import type { CourseId, UserId } from '@/types/ids';
import type { IsoTimestamp, JsonObject } from '@/types/common';

/** Mirrors the Supabase auth identity; the cloud (Supabase Auth) is its source of truth. */
export interface User {
  id: UserId;
  email: string | null;
  createdAt: IsoTimestamp;
}

export interface Profile {
  userId: UserId;
  displayName: string;
  fullName: string | null;
  avatarUrl: string | null;
  homeCourseId: CourseId | null;
  preferredTee: string | null;
  handicapIndex: number | null;
  handicapProvider: string | null;
  handicapProviderId: string | null;
  preferences: JsonObject;
  updatedAt: IsoTimestamp;
}
