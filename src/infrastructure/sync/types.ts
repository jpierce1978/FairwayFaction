import type { DeviceId, LocalMutationId } from '@/types/ids';
import type { IsoTimestamp, Json } from '@/types/common';

/** Entities that are written locally and replicated to Supabase. */
export const SYNCED_ENTITY_TYPES = [
  'profile',
  'faction',
  'faction_member',
  'faction_round_template',
  'faction_invite',
  'scheduled_round',
  'round_rsvp',
  'guest_profile',
  'round',
  'round_player',
  'round_team',
  'round_team_member',
  'score_event',
  'game_preset',
  'game_instance',
  'game_result',
  'ledger_entry',
] as const;

export type SyncedEntityType = (typeof SYNCED_ENTITY_TYPES)[number];
export type MutationOperation = 'UPSERT' | 'DELETE';
export type MutationStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED' | 'CONFLICT';

export interface LocalMutation {
  id: LocalMutationId;
  entityType: SyncedEntityType;
  entityId: string;
  operation: MutationOperation;
  /** The full entity snapshot (UPSERT) or its identifying keys (DELETE). */
  payload: Json;
  localTimestamp: IsoTimestamp;
  deviceId: DeviceId;
  retryCount: number;
  status: MutationStatus;
  lastError: string | null;
}

export type NewLocalMutation = Pick<
  LocalMutation,
  'entityType' | 'entityId' | 'operation' | 'payload'
>;

/** What the cloud said about one pushed mutation. */
export type PushOutcome =
  | { status: 'SYNCED' }
  /** The cloud holds a newer/different version; needs resolution, never a silent overwrite. */
  | { status: 'CONFLICT'; reason: string }
  /** Transient (network, 5xx): retry later. */
  | { status: 'RETRY'; error: string }
  /** Permanent for this mutation (validation, RLS rejection). */
  | { status: 'REJECTED'; error: string };

/** Moves mutations to the cloud. The Supabase implementation arrives with the sync milestone. */
export interface SyncTransport {
  /** Must return one outcome per mutation, keyed by mutation id. Throwing means "whole batch failed, retry". */
  push(batch: readonly LocalMutation[]): Promise<Record<string, PushOutcome>>;
}

export interface ConnectivityMonitor {
  isOnline(): Promise<boolean>;
}

export interface SyncReport {
  attempted: number;
  synced: number;
  conflicts: number;
  retried: number;
  failed: number;
  skippedOffline: boolean;
}
