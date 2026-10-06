import type { CompletionValidation } from './completion';
import type { Course, Hole, CourseTee, TeeHole } from '@/domains/courses/types';
import type { GameResultDraft } from '@/domains/games/types';
import type { Round, RoundPlayer, RoundTeam, RoundTeamMember } from '@/domains/rounds/types';
import type { ScoreEvent } from '@/domains/scoring/types';
import type { ValidationResult } from '@/types/validation';

export type { ValidationResult, ValidationIssue } from '@/types/validation';
export type { CompletionValidation } from './completion';

/**
 * Everything a game module may read to compute outcomes. A plain, serializable
 * snapshot: modules are pure functions of (context, config) and never touch
 * SQLite, Supabase or the UI.
 */
export interface RoundContext {
  round: Round;
  course: Course;
  holes: readonly Hole[];
  tees: readonly CourseTee[];
  teeHoles: readonly TeeHole[];
  players: readonly RoundPlayer[];
  teams: readonly RoundTeam[];
  teamMembers: readonly RoundTeamMember[];
  scores: readonly ScoreEvent[];
}

/** Plain-language lines a module offers for UI display (the UI never computes these itself). */
export interface GameSummary {
  headline: string;
  lines: string[];
}

export interface GameCalculation<TState, TResult extends GameResultDraft = GameResultDraft> {
  state: TState;
  results: TResult[];
  summary: GameSummary;
}

/**
 * The contract every game implements. Calculation is a deterministic recompute
 * from round state (DOMAIN_MAP §20): the same context + config always yields the
 * same output, which keeps undo, corrections, sync reconciliation and tests simple.
 */
export interface GameModule<
  TConfig = unknown,
  TState = unknown,
  TResult extends GameResultDraft = GameResultDraft,
> {
  readonly key: string;
  readonly version: number;
  readonly name: string;
  readonly description: string;
  readonly capabilities: readonly GameCapability[];

  /** Narrow untrusted JSON (preset / stored instance) into TConfig, or explain why it is invalid. */
  validateConfiguration(context: RoundContext, config: unknown): ValidationResult;

  initialize(context: RoundContext, config: TConfig): TState;

  calculate(context: RoundContext, config: TConfig): GameCalculation<TState, TResult>;

  validateCompletion(context: RoundContext, config: TConfig): CompletionValidation;
}

export type GameCapability = 'TEAMS' | 'INDIVIDUAL' | 'HOLE_BY_HOLE' | 'MATCH_PLAY' | 'EVENTS';

/** Registry entries are stored type-erased; the registry re-narrows config at the boundary. */
export type AnyGameModule = GameModule<any, any, any>;
