import type { HomeData } from '@/domains/rounds/home';
import { asId, type FactionId, type RoundId, type ScheduledRoundId } from '@/types/ids';

/**
 * DEVELOPMENT DATA ONLY. Shaped after the UX_SPEC Home example. Replaced by
 * repository-backed data when the Faction/Scheduling/Round features ship.
 */
export const MOCK_ACTIVE_ROUND_ID = asId<'RoundId'>(
  '00000000-0000-4000-8000-0000000000a1',
) as RoundId;

export function createMockHomeData(now: Date = new Date(), withActiveRound = false): HomeData {
  const today1pm = new Date(now);
  today1pm.setHours(13, 0, 0, 0);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return {
    currentUser: { displayName: 'JP' },
    activeRound: withActiveRound
      ? { roundId: MOCK_ACTIVE_ROUND_ID, factionName: 'Saturday Golf', currentHole: 7 }
      : null,
    nextRound: {
      scheduledRoundId: asId<'ScheduledRoundId'>(
        '00000000-0000-4000-8000-0000000000b1',
      ) as ScheduledRoundId,
      factionName: 'Saturday Golf',
      scheduledAt: today1pm.toISOString(),
      courseName: 'Surrey Hills',
      playerCount: 13,
    },
    factions: [
      {
        id: asId<'FactionId'>('00000000-0000-4000-8000-0000000000c1') as FactionId,
        name: 'Saturday Golf',
        subtitle: '13 going',
      },
      {
        id: asId<'FactionId'>('00000000-0000-4000-8000-0000000000c2') as FactionId,
        name: 'Family Scramble',
        subtitle: 'Next round Oct 18',
      },
    ],
    recentRounds: [
      {
        roundId: asId<'RoundId'>('00000000-0000-4000-8000-0000000000d1') as RoundId,
        date: lastWeek.toISOString(),
        courseName: 'Surrey Hills',
        gross: 74,
        summary: 'Won 2 competitions',
      },
    ],
    lastUpdated: now.toISOString(),
  };
}
