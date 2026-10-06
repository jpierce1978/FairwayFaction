import { validateBasicProfile, validateCredentials } from '@/domains/auth/validation';
import { validateFactionCreation } from '@/domains/factions/validation';
import { validatePlayerSelection, validateTeamStructure } from '@/domains/rounds/validation';
import { validateRoundStart } from '@/domains/rounds/startCondition';
import { validateScoreInput } from '@/domains/scoring/validation';
import { mergeValidation, VALID } from '@/types/validation';
import { createDevelopmentRegistry, createGameRegistry } from '@/games';
import { LOW_TOTAL_KEY } from '@/games/sample/lowTotal';
import type { RoundPlayer, RoundTeam, RoundTeamMember } from '@/domains/rounds/types';
import type { GameInstance } from '@/domains/games/types';
import type { RoundContext } from '@/games/core/types';
import { asId } from '@/types/ids';
import { contextWith } from './helpers/context';

const issueCodes = (r: ReturnType<typeof validateScoreInput>) =>
  r.valid ? [] : r.issues.map((i) => i.code);

const player = (id: string, over: Partial<RoundPlayer> = {}): RoundPlayer => ({
  id: asId<'RoundPlayerId'>(id),
  roundId: asId<'RoundId'>('r'),
  userId: asId<'UserId'>(`u-${id}`),
  guestProfileId: null,
  displayNameSnapshot: id,
  teeId: null,
  handicapSnapshot: null,
  scoringGroupId: null,
  startOrder: 0,
  status: 'ACTIVE',
  ...over,
});

describe('auth validation', () => {
  it('accepts a valid email and password', () => {
    expect(validateCredentials({ email: 'jp@example.com', password: 'longenough' })).toEqual(VALID);
  });
  it('flags a bad email and short password with field paths', () => {
    const r = validateCredentials({ email: 'nope', password: 'short' });
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.issues.map((i) => i.path)).toEqual(['email', 'password']);
  });
  it('basic profile needs name + display name only; handicap optional but bounded', () => {
    expect(validateBasicProfile({ fullName: 'Jarrod', displayName: 'JP' })).toEqual(VALID);
    expect(
      validateBasicProfile({ fullName: 'Jarrod', displayName: 'JP', handicapIndex: null }),
    ).toEqual(VALID);
    expect(validateBasicProfile({ fullName: '', displayName: ' ' }).valid).toBe(false);
    expect(validateBasicProfile({ fullName: 'a', displayName: 'b', handicapIndex: 60 }).valid).toBe(
      false,
    );
    expect(
      validateBasicProfile({ fullName: 'a', displayName: 'b', handicapIndex: -11 }).valid,
    ).toBe(false);
    expect(
      validateBasicProfile({ fullName: 'a', displayName: 'b', handicapIndex: NaN }).valid,
    ).toBe(false);
    expect(validateBasicProfile({ fullName: 'a', displayName: 'x'.repeat(31) }).valid).toBe(false);
  });
});

describe('faction validation', () => {
  it('requires a name and a supported visibility', () => {
    expect(validateFactionCreation({ name: 'Saturday Golf', visibility: 'PRIVATE' })).toEqual(
      VALID,
    );
    expect(validateFactionCreation({ name: '  ', visibility: 'PRIVATE' }).valid).toBe(false);
    expect(validateFactionCreation({ name: 'x'.repeat(61), visibility: 'INVITE_ONLY' }).valid).toBe(
      false,
    );
    expect(validateFactionCreation({ name: 'ok', visibility: 'PUBLIC' as never }).valid).toBe(
      false,
    );
  });
});

describe('scoring validation', () => {
  it('accepts whole numbers 1..30 and ignores absent advanced stats', () => {
    expect(validateScoreInput({ grossScore: 4 })).toEqual(VALID);
    expect(validateScoreInput({ grossScore: 30 })).toEqual(VALID);
  });
  it('rejects 0, 31, fractions, NaN', () => {
    for (const grossScore of [0, 31, 4.5, NaN, -1])
      expect(issueCodes(validateScoreInput({ grossScore }))).toContain('INVALID_GROSS_SCORE');
  });
  it('range-checks advanced stats only when present', () => {
    expect(validateScoreInput({ grossScore: 4, putts: 2, penalties: 0 })).toEqual(VALID);
    expect(issueCodes(validateScoreInput({ grossScore: 4, putts: -1 }))).toEqual(['INVALID_COUNT']);
    expect(issueCodes(validateScoreInput({ grossScore: 4, penalties: 1.5 }))).toEqual([
      'INVALID_COUNT',
    ]);
  });
});

describe('round validation', () => {
  it('requires at least one active player', () => {
    expect(validatePlayerSelection([]).valid).toBe(false);
    expect(validatePlayerSelection([player('a', { status: 'WITHDRAWN' })]).valid).toBe(false);
    expect(validatePlayerSelection([player('a')])).toEqual(VALID);
  });
  it('rejects duplicates and ambiguous identity (member xor guest)', () => {
    expect(
      validatePlayerSelection([player('a'), player('b', { userId: asId<'UserId'>('u-a') })]).valid,
    ).toBe(false);
    expect(
      validatePlayerSelection([player('a', { guestProfileId: asId<'GuestProfileId'>('g') })]).valid,
    ).toBe(false);
    expect(validatePlayerSelection([player('a', { userId: null })]).valid).toBe(false);
  });
  it('guests are valid players without an account', () => {
    expect(
      validatePlayerSelection([
        player('g', { userId: null, guestProfileId: asId<'GuestProfileId'>('g1') }),
      ]),
    ).toEqual(VALID);
  });

  it('checks team structure only, not game-specific team size', () => {
    const players = [player('a'), player('b')];
    const teams: RoundTeam[] = [
      { id: asId<'RoundTeamId'>('t1'), roundId: asId<'RoundId'>('r'), name: 'T1', displayOrder: 0 },
    ];
    const m = (team: string, p: string): RoundTeamMember => ({
      teamId: asId<'RoundTeamId'>(team),
      roundPlayerId: asId<'RoundPlayerId'>(p),
    });
    expect(validateTeamStructure(players, teams, [m('t1', 'a')])).toEqual(VALID); // team of one is structurally fine
    expect(validateTeamStructure(players, teams, [m('t1', 'a'), m('t1', 'a')]).valid).toBe(false);
    expect(validateTeamStructure(players, teams, [m('missing', 'a')]).valid).toBe(false);
    expect(validateTeamStructure(players, teams, [m('t1', 'zzz')]).valid).toBe(false);
  });

  describe('round start condition', () => {
    const registry = createDevelopmentRegistry();
    const context = contextWith({ players: [player('a')] });
    const instance = (config: object, key = LOW_TOTAL_KEY): GameInstance => ({
      id: asId<'GameInstanceId'>('gi'),
      roundId: asId<'RoundId'>('r'),
      gameDefinitionKey: key,
      gameDefinitionVersion: 1,
      presetId: null,
      configuration: config as never,
      status: 'PENDING',
    });
    const start = (
      players: RoundPlayer[],
      course: RoundContext['course'] | null,
      instances: GameInstance[],
    ) => validateRoundStart({ players, course }, { registry, context, instances });

    it('starts with one player, a course and no games (optional info never blocks)', () => {
      expect(start([player('a')], context.course, [])).toEqual(VALID);
    });
    it('blocks on missing course, no players, invalid game config, or unavailable game', () => {
      expect(start([player('a')], null, []).valid).toBe(false);
      expect(start([], context.course, []).valid).toBe(false);
      expect(start([player('a')], context.course, [instance({ unitsForWin: 0 })]).valid).toBe(
        false,
      );
      const missing = start([player('a')], context.course, [instance({}, 'unknown-game')]);
      expect(missing.valid).toBe(false);
      if (!missing.valid) expect(missing.issues[0]!.code).toBe('GAME_UNAVAILABLE');
    });
    it('reports every problem at once', () => {
      const r = start([], null, [instance({ unitsForWin: -1 })]);
      expect(r.valid).toBe(false);
      if (!r.valid) expect(r.issues.length).toBeGreaterThanOrEqual(3);
    });
    it('works against an empty production-style registry', () => {
      const r = validateRoundStart(
        { players: [player('a')], course: context.course },
        { registry: createGameRegistry([]), context, instances: [instance({ unitsForWin: 1 })] },
      );
      expect(r.valid).toBe(false);
    });
  });

  it('mergeValidation combines issues', () => {
    expect(mergeValidation(VALID, VALID)).toEqual(VALID);
    const r = mergeValidation(
      validateScoreInput({ grossScore: 0 }),
      validateScoreInput({ grossScore: 99 }),
    );
    expect(r.valid ? 0 : r.issues.length).toBe(2);
  });
});
