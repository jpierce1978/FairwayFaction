/**
 * Branded identifier types. All IDs are client-generated UUID strings so that
 * rows created offline have stable identities in SQLite and Supabase alike.
 */
declare const brand: unique symbol;
export type Brand<T, B extends string> = T & { readonly [brand]: B };

export type UserId = Brand<string, 'UserId'>;
export type FactionId = Brand<string, 'FactionId'>;
export type FactionInviteId = Brand<string, 'FactionInviteId'>;
export type FactionRoundTemplateId = Brand<string, 'FactionRoundTemplateId'>;
export type ScheduledRoundId = Brand<string, 'ScheduledRoundId'>;
export type CourseId = Brand<string, 'CourseId'>;
export type CourseTeeId = Brand<string, 'CourseTeeId'>;
export type HoleId = Brand<string, 'HoleId'>;
export type GuestProfileId = Brand<string, 'GuestProfileId'>;
export type RoundId = Brand<string, 'RoundId'>;
export type RoundPlayerId = Brand<string, 'RoundPlayerId'>;
export type RoundTeamId = Brand<string, 'RoundTeamId'>;
export type ScoringGroupId = Brand<string, 'ScoringGroupId'>;
export type ScoreEventId = Brand<string, 'ScoreEventId'>;
export type GamePresetId = Brand<string, 'GamePresetId'>;
export type GameInstanceId = Brand<string, 'GameInstanceId'>;
export type GameResultId = Brand<string, 'GameResultId'>;
export type LedgerEntryId = Brand<string, 'LedgerEntryId'>;
export type LocalMutationId = Brand<string, 'LocalMutationId'>;
export type DeviceId = Brand<string, 'DeviceId'>;

/** Cast a raw string (e.g. a database column) to a branded id. */
export function asId<T extends string>(value: string): Brand<string, T> {
  return value as Brand<string, T>;
}
