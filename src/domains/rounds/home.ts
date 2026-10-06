import type { FactionId, RoundId, ScheduledRoundId } from '@/types/ids';
import type { IsoTimestamp } from '@/types/common';

/** SCREEN_CONTRACTS §1 "Required Data" for Home. */
export interface HomeData {
  currentUser: { displayName: string };
  activeRound: { roundId: RoundId; factionName: string | null; currentHole: number } | null;
  nextRound: {
    scheduledRoundId: ScheduledRoundId;
    factionName: string;
    scheduledAt: IsoTimestamp;
    courseName: string;
    playerCount: number;
  } | null;
  factions: { id: FactionId; name: string; subtitle: string }[];
  recentRounds: {
    roundId: RoundId;
    date: IsoTimestamp;
    courseName: string;
    gross: number | null;
    summary: string;
  }[];
  /** When this snapshot was last refreshed from the cloud. */
  lastUpdated: IsoTimestamp;
}

export type HomeHero =
  | { kind: 'ACTIVE_ROUND'; roundId: RoundId; title: string; subtitle: string }
  | {
      kind: 'UPCOMING_ROUND';
      scheduledRoundId: ScheduledRoundId;
      title: string;
      whenLabel: string;
      courseName: string;
      playerCount: number;
    }
  | { kind: 'NONE' };

export interface HomeViewModel {
  greeting: string;
  hero: HomeHero;
  factions: HomeData['factions'];
  recentRounds: HomeData['recentRounds'];
  /** "Last updated …" shown only when data is older than the stale threshold. */
  staleSince: IsoTimestamp | null;
}

export const STALE_AFTER_MS = 60 * 60 * 1000;

export function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function formatWhen(iso: IsoTimestamp, now: Date): string {
  const when = new Date(iso);
  const time = when.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const sameDay = when.toDateString() === now.toDateString();
  if (sameDay) return `Today • ${time}`;
  const day = when.toLocaleDateString('en-US', { weekday: 'long' });
  return `${day} • ${time}`;
}

/**
 * Home priority order (SCREEN_CONTRACTS §1): active round, then upcoming round,
 * then group activity, then recent history. Pure so it is testable without a UI.
 */
export function buildHomeViewModel(data: HomeData, now: Date = new Date()): HomeViewModel {
  let hero: HomeHero = { kind: 'NONE' };
  if (data.activeRound) {
    hero = {
      kind: 'ACTIVE_ROUND',
      roundId: data.activeRound.roundId,
      title: data.activeRound.factionName ?? 'Your round',
      subtitle: `Hole ${data.activeRound.currentHole}`,
    };
  } else if (data.nextRound) {
    hero = {
      kind: 'UPCOMING_ROUND',
      scheduledRoundId: data.nextRound.scheduledRoundId,
      title: data.nextRound.factionName,
      whenLabel: formatWhen(data.nextRound.scheduledAt, now),
      courseName: data.nextRound.courseName,
      playerCount: data.nextRound.playerCount,
    };
  }
  const stale = now.getTime() - new Date(data.lastUpdated).getTime() > STALE_AFTER_MS;
  return {
    greeting: `${greetingFor(now)}, ${data.currentUser.displayName}`,
    hero,
    factions: data.factions,
    recentRounds: data.recentRounds,
    staleSince: stale ? data.lastUpdated : null,
  };
}
