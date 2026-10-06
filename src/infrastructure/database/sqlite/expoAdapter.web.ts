import type { SqlDatabase } from './types';

export const DATABASE_NAME = 'fairwayfaction.db';

/**
 * FairwayFaction is a mobile app: scores live in on-device SQLite. expo-sqlite's web
 * build is experimental and needs extra bundler setup, so web is intentionally
 * unsupported in Milestone 1. This stub keeps web bundling working and fails with a clear message.
 */
export async function openExpoDatabase(): Promise<SqlDatabase> {
  throw new Error(
    'Local storage is not available in the web build. Run FairwayFaction on iOS or Android.',
  );
}
