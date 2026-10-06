import type { IsoTimestamp } from '@/types/common';

/** Injected into services so tests can control time. */
export type Clock = () => IsoTimestamp;

export const systemClock: Clock = () => new Date().toISOString();
