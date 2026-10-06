import type { FactionRole } from '@/domains/factions/types';

/**
 * Capabilities are the only thing UI and services check (DOMAIN_MAP §15).
 * Never write `user.role === 'ADMIN'` in a component; ask `can(caps, 'round.edit')`.
 */
export const CAPABILITIES = [
  'faction.view',
  'faction.rsvp',
  'faction.manage',
  'faction.invite',
  'round.view',
  'round.start',
  'round.edit',
  'round.finish',
  'round.score_self',
  'round.score_group',
  'score.correct_any',
  'game.configure',
] as const;

export type Capability = (typeof CAPABILITIES)[number];
export type CapabilitySet = ReadonlySet<Capability>;

const MEMBER: readonly Capability[] = [
  'faction.view',
  'faction.rsvp',
  'round.view',
  'round.score_self',
];

const ADMIN: readonly Capability[] = [
  ...MEMBER,
  'faction.manage',
  'faction.invite',
  'round.start',
  'round.edit',
  'round.finish',
  'round.score_group',
  'score.correct_any',
  'game.configure',
];

/** Roles map to capabilities. Future roles (ORGANIZER, SCORER) are added here only. */
export const ROLE_CAPABILITIES: Record<FactionRole, readonly Capability[]> = {
  ADMIN,
  MEMBER,
};

/** The facts about a user's relationship to a faction/round that grant capabilities. */
export interface PermissionContext {
  /** Null when the user is not a member of the round's faction (or the round has none). */
  factionRole: FactionRole | null;
  isRoundCreator: boolean;
  isRoundParticipant: boolean;
  /** Same scoring group (foursome) as the player being scored. */
  isInScoringGroup: boolean;
}

export const NO_RELATIONSHIP: PermissionContext = {
  factionRole: null,
  isRoundCreator: false,
  isRoundParticipant: false,
  isInScoringGroup: false,
};

export function resolveCapabilities(ctx: Partial<PermissionContext>): CapabilitySet {
  const c = { ...NO_RELATIONSHIP, ...ctx };
  const granted = new Set<Capability>();
  if (c.factionRole) ROLE_CAPABILITIES[c.factionRole].forEach((x) => granted.add(x));
  if (c.isRoundCreator) {
    (
      [
        'round.view',
        'round.start',
        'round.edit',
        'round.finish',
        'round.score_group',
        'score.correct_any',
        'game.configure',
      ] as const
    ).forEach((x) => granted.add(x));
  }
  if (c.isRoundParticipant) {
    granted.add('round.view');
    granted.add('round.score_self');
  }
  if (c.isRoundParticipant && c.isInScoringGroup) granted.add('round.score_group');
  return granted;
}

export function can(caps: CapabilitySet, capability: Capability): boolean {
  return caps.has(capability);
}
