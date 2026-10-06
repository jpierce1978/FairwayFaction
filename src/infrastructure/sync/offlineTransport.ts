import type { ConnectivityMonitor, LocalMutation, PushOutcome, SyncTransport } from './types';

/**
 * Placeholder transport until the Supabase sync milestone: every push is treated as a
 * transient failure so nothing is ever dropped. Mutations stay safely queued on device.
 */
export const unconfiguredTransport: SyncTransport = {
  async push(batch: readonly LocalMutation[]) {
    const outcomes: Record<string, PushOutcome> = {};
    for (const m of batch) outcomes[m.id] = { status: 'RETRY', error: 'Cloud sync not configured' };
    return outcomes;
  },
};

export const alwaysOffline: ConnectivityMonitor = { isOnline: async () => false };
