import {
  CAPABILITIES,
  NO_RELATIONSHIP,
  ROLE_CAPABILITIES,
  can,
  resolveCapabilities,
} from '@/domains/permissions';

describe('capability-based permissions', () => {
  it('a faction member can view, RSVP and score themself, but not manage', () => {
    const caps = resolveCapabilities({ factionRole: 'MEMBER' });
    for (const c of ['faction.view', 'faction.rsvp', 'round.view', 'round.score_self'] as const)
      expect(can(caps, c)).toBe(true);
    for (const c of [
      'faction.manage',
      'faction.invite',
      'round.edit',
      'round.start',
      'round.finish',
      'score.correct_any',
      'game.configure',
      'round.score_group',
    ] as const) {
      expect(can(caps, c)).toBe(false);
    }
  });
  it('a faction admin holds every capability', () => {
    expect([...resolveCapabilities({ factionRole: 'ADMIN' })].sort()).toEqual(
      [...CAPABILITIES].sort(),
    );
  });
  it('a stranger holds nothing', () => {
    expect(resolveCapabilities(NO_RELATIONSHIP).size).toBe(0);
  });
  it('a solo-round creator can run their own round without any faction role', () => {
    const caps = resolveCapabilities({ isRoundCreator: true });
    for (const c of [
      'round.start',
      'round.edit',
      'round.finish',
      'score.correct_any',
      'game.configure',
    ] as const)
      expect(can(caps, c)).toBe(true);
    expect(can(caps, 'faction.manage')).toBe(false);
  });
  it('a participant can score themself; scoring the group needs the same scoring group', () => {
    expect(can(resolveCapabilities({ isRoundParticipant: true }), 'round.score_self')).toBe(true);
    expect(can(resolveCapabilities({ isRoundParticipant: true }), 'round.score_group')).toBe(false);
    expect(
      can(
        resolveCapabilities({ isRoundParticipant: true, isInScoringGroup: true }),
        'round.score_group',
      ),
    ).toBe(true);
    expect(can(resolveCapabilities({ isInScoringGroup: true }), 'round.score_group')).toBe(false); // not a participant
  });
  it('capabilities from several relationships combine', () => {
    const caps = resolveCapabilities({ factionRole: 'MEMBER', isRoundCreator: true });
    expect(can(caps, 'faction.rsvp')).toBe(true);
    expect(can(caps, 'round.finish')).toBe(true);
  });
  it('every role maps only to known capabilities', () => {
    for (const caps of Object.values(ROLE_CAPABILITIES))
      for (const c of caps) expect(CAPABILITIES).toContain(c);
  });
  it('member capabilities are a strict subset of admin capabilities', () => {
    for (const c of ROLE_CAPABILITIES.MEMBER) expect(ROLE_CAPABILITIES.ADMIN).toContain(c);
  });
});
