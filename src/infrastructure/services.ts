import * as Network from 'expo-network';
import { createDevelopmentRegistry, createProductionRegistry, type GameRegistry } from '@/games';
import { createDevAuthService } from '@/infrastructure/auth/devAuthService';
import type { AuthService } from '@/infrastructure/auth/authService';
import { createSupabaseAuthService } from '@/infrastructure/auth/supabaseAuthService';
import { readConfig, isSupabaseConfigured } from '@/infrastructure/config';
import { openExpoDatabase } from '@/infrastructure/database/sqlite/expoAdapter';
import { getOrCreateDeviceId } from '@/infrastructure/database/sqlite/deviceId';
import { MIGRATIONS, runMigrations } from '@/infrastructure/database/sqlite';
import type { SqlDatabase } from '@/infrastructure/database/sqlite/types';
import { ProfileRepository } from '@/infrastructure/database/sqlite/repositories/profileRepository';
import { ScoreRepository } from '@/infrastructure/database/sqlite/repositories/scoreRepository';
import { createSupabaseClient } from '@/infrastructure/database/supabase/client';
import {
  freeEntitlementService,
  type EntitlementService,
} from '@/infrastructure/entitlements/entitlements';
import { MutationQueue } from '@/infrastructure/sync/mutationQueue';
import { SyncService } from '@/infrastructure/sync/syncService';
import { unconfiguredTransport } from '@/infrastructure/sync/offlineTransport';
import type { ConnectivityMonitor } from '@/infrastructure/sync/types';
import type { DeviceId } from '@/types/ids';
import { generateId } from '@/utils/ids';

/** The app's composed infrastructure. Screens receive these through context, never construct them. */
export interface AppServices {
  db: SqlDatabase;
  deviceId: DeviceId;
  auth: AuthService;
  registry: GameRegistry;
  entitlements: EntitlementService;
  mutationQueue: MutationQueue;
  syncService: SyncService;
  profiles: ProfileRepository;
  scores: ScoreRepository;
}

const connectivity: ConnectivityMonitor = {
  async isOnline() {
    const state = await Network.getNetworkStateAsync();
    return state.isConnected === true && state.isInternetReachable !== false;
  },
};

export async function createAppServices(): Promise<AppServices> {
  const db = await openExpoDatabase();
  await runMigrations(db, MIGRATIONS);
  const deviceId = await getOrCreateDeviceId(db, generateId);

  const config = readConfig();
  const auth = isSupabaseConfigured(config)
    ? createSupabaseAuthService(createSupabaseClient(config))
    : createDevAuthService(generateId);

  const mutationQueue = new MutationQueue({ deviceId, generateId });
  const syncService = new SyncService({
    db,
    queue: mutationQueue,
    transport: unconfiguredTransport,
    connectivity,
  });

  return {
    db,
    deviceId,
    auth,
    registry: __DEV__ ? createDevelopmentRegistry() : createProductionRegistry(),
    entitlements: freeEntitlementService,
    mutationQueue,
    syncService,
    profiles: new ProfileRepository(db, mutationQueue),
    scores: new ScoreRepository(db, mutationQueue, deviceId, generateId),
  };
}
