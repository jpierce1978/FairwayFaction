import { fromIssues, VALID, type ValidationIssue, type ValidationResult } from '@/types/validation';
import type { RoundPlayer, RoundTeam, RoundTeamMember } from './types';

/** SCREEN_CONTRACTS §5: at least one player must remain selected. */
export function validatePlayerSelection(players: readonly RoundPlayer[]): ValidationResult {
  const active = players.filter((p) => p.status === 'ACTIVE');
  const issues: ValidationIssue[] = [];
  if (active.length === 0) {
    issues.push({ code: 'NO_PLAYERS', message: 'Select at least one player.', path: 'players' });
  }
  const seen = new Set<string>();
  for (const p of active) {
    const identity = p.userId ?? p.guestProfileId;
    if ((p.userId === null) === (p.guestProfileId === null)) {
      issues.push({
        code: 'PLAYER_IDENTITY',
        message: `${p.displayNameSnapshot} must be either a member or a guest.`,
        path: 'players',
      });
    } else if (identity && seen.has(identity)) {
      issues.push({
        code: 'DUPLICATE_PLAYER',
        message: `${p.displayNameSnapshot} is already in the round.`,
        path: 'players',
      });
    }
    if (identity) seen.add(identity);
  }
  return fromIssues(issues);
}

/**
 * Structural team validity only (SCREEN_CONTRACTS §6): game-specific rules such as
 * team size belong to GameModules and are NOT checked here.
 */
export function validateTeamStructure(
  players: readonly RoundPlayer[],
  teams: readonly RoundTeam[],
  members: readonly RoundTeamMember[],
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const playerIds = new Set(players.map((p) => p.id));
  const teamIds = new Set(teams.map((t) => t.id));
  const assigned = new Set<string>();
  for (const m of members) {
    if (!teamIds.has(m.teamId)) {
      issues.push({ code: 'UNKNOWN_TEAM', message: 'A team member references a missing team.' });
    }
    if (!playerIds.has(m.roundPlayerId)) {
      issues.push({ code: 'UNKNOWN_PLAYER', message: 'A team member is not in this round.' });
    }
    if (assigned.has(m.roundPlayerId)) {
      issues.push({ code: 'PLAYER_ON_TWO_TEAMS', message: 'A player is on more than one team.' });
    }
    assigned.add(m.roundPlayerId);
  }
  return issues.length ? fromIssues(issues) : VALID;
}
