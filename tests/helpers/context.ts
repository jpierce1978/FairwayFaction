import type { RoundContext } from '@/games/core/types';
import type { RoundPlayer } from '@/domains/rounds/types';
import type { ScoreEvent } from '@/domains/scoring/types';
import { asId } from '@/types/ids';

const holeIds = ['h1', 'h2', 'h3'].map((h) => asId<'HoleId'>(h));

export function makePlayer(id: string, name = id, over: Partial<RoundPlayer> = {}): RoundPlayer {
  return {
    id: asId<'RoundPlayerId'>(id),
    roundId: asId<'RoundId'>('r1'),
    userId: asId<'UserId'>(`u-${id}`),
    guestProfileId: null,
    displayNameSnapshot: name,
    teeId: null,
    handicapSnapshot: null,
    scoringGroupId: null,
    startOrder: 0,
    status: 'ACTIVE',
    ...over,
  };
}

export function makeScore(player: string, holeIndex: number, gross: number): ScoreEvent {
  return {
    id: asId<'ScoreEventId'>(`s-${player}-${holeIndex}`),
    roundId: asId<'RoundId'>('r1'),
    roundPlayerId: asId<'RoundPlayerId'>(player),
    holeId: holeIds[holeIndex]!,
    grossScore: gross,
    putts: null,
    fairwayResult: null,
    gir: null,
    penalties: null,
    metadata: {},
    updatedAt: 't',
    updatedBy: asId<'UserId'>('u'),
    deviceId: asId<'DeviceId'>('d'),
    version: 1,
    syncStatus: 'PENDING',
  };
}

/** A pure in-memory RoundContext (3-hole course) for module/engine tests. */
export function contextWith(over: Partial<RoundContext> = {}): RoundContext {
  const courseId = asId<'CourseId'>('c1');
  return {
    round: {
      id: asId<'RoundId'>('r1'),
      factionId: null,
      scheduledRoundId: null,
      courseId,
      startedAt: null,
      completedAt: null,
      status: 'ACTIVE',
      createdBy: asId<'UserId'>('u'),
      localVersion: 1,
      cloudVersion: 0,
    },
    course: {
      id: courseId,
      name: 'Test Course',
      location: null,
      timezone: 'UTC',
      numberOfHoles: 9,
    },
    holes: holeIds.map((id, i) => ({ id, courseId, holeNumber: i + 1, par: 4 })),
    tees: [],
    teeHoles: [],
    players: [],
    teams: [],
    teamMembers: [],
    scores: [],
    ...over,
  };
}
