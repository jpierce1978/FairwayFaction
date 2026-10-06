import { COMPLETE, incomplete } from '@/games/core/completion';
import type { GameModule, RoundContext } from '@/games/core/types';
import type { GameResultDraft } from '@/domains/games/types';
import { fromIssues, VALID, type ValidationIssue } from '@/types/validation';

/**
 * SAMPLE ONLY. Proves the registry -> validate -> calculate -> completion path.
 * It is not a production golf game, is never offered to users, and is only
 * registered by createDevelopmentRegistry().
 *
 * Rule: lowest gross total across all holes wins `unitsForWin` units.
 */
export interface LowTotalConfig {
  unitsForWin: number;
}

export interface LowTotalState {
  totals: { roundPlayerId: string; holesScored: number; total: number }[];
}

export const LOW_TOTAL_KEY = 'sample-low-total';

function activePlayers(context: RoundContext) {
  return context.players.filter((p) => p.status === 'ACTIVE');
}

function totalsFor(context: RoundContext): LowTotalState['totals'] {
  return activePlayers(context).map((player) => {
    const scores = context.scores.filter((s) => s.roundPlayerId === player.id);
    return {
      roundPlayerId: player.id,
      holesScored: scores.length,
      total: scores.reduce((sum, s) => sum + s.grossScore, 0),
    };
  });
}

function leaders(state: LowTotalState): LowTotalState['totals'] {
  const scored = state.totals.filter((t) => t.holesScored > 0);
  if (scored.length === 0) return [];
  const best = Math.min(...scored.map((t) => t.total));
  return scored.filter((t) => t.total === best);
}

export const lowTotalModule: GameModule<LowTotalConfig, LowTotalState> = {
  key: LOW_TOTAL_KEY,
  version: 1,
  name: 'Low Total (sample)',
  description: 'Sample module used to prove the game architecture.',
  capabilities: ['INDIVIDUAL'],

  validateConfiguration(_context, config) {
    const issues: ValidationIssue[] = [];
    const units = (config as Partial<LowTotalConfig> | null)?.unitsForWin;
    if (typeof units !== 'number' || !Number.isInteger(units) || units < 1) {
      issues.push({
        code: 'INVALID_UNITS',
        message: 'unitsForWin must be a whole number of at least 1.',
        path: 'unitsForWin',
      });
    }
    return issues.length ? fromIssues(issues) : VALID;
  },

  initialize(context) {
    return { totals: totalsFor(context).map((t) => ({ ...t, holesScored: 0, total: 0 })) };
  },

  calculate(context, config) {
    const state: LowTotalState = { totals: totalsFor(context) };
    const top = leaders(state);
    const results: GameResultDraft[] = [];
    // A tie is never resolved silently (UX_SPEC §31): no result is produced.
    const only = top.length === 1 ? top[0] : undefined;
    if (only) {
      const name = nameOf(context, only.roundPlayerId);
      results.push({
        resultType: 'LOW_TOTAL',
        winnerType: 'PLAYER',
        winnerId: only.roundPlayerId,
        loserId: null,
        unitCount: config.unitsForWin,
        description: `${name} has the low total (${only.total})`,
        metadata: { total: only.total },
      });
    }
    const headline = only
      ? `${nameOf(context, only.roundPlayerId)} leads (${only.total})`
      : top.length > 1
        ? 'Tied for the lead'
        : 'No scores yet';
    return { state, results, summary: { headline, lines: [] } };
  },

  validateCompletion(context, config) {
    const state: LowTotalState = { totals: totalsFor(context) };
    const holeCount = context.holes.length;
    const issues: ValidationIssue[] = state.totals
      .filter((t) => t.holesScored < holeCount)
      .map((t) => ({
        code: 'MISSING_SCORES',
        message: `${nameOf(context, t.roundPlayerId)} is missing ${holeCount - t.holesScored} score(s).`,
      }));
    const top = leaders(state);
    const tie = top.length > 1 ? top.map((t) => t.roundPlayerId) : undefined;
    void config;
    if (issues.length === 0 && !tie) return COMPLETE;
    if (tie) issues.push({ code: 'TIE', message: 'Tied for the low total.' });
    return incomplete(issues, tie);
  },
};

function nameOf(context: RoundContext, roundPlayerId: string): string {
  return context.players.find((p) => p.id === roundPlayerId)?.displayNameSnapshot ?? 'Unknown';
}
