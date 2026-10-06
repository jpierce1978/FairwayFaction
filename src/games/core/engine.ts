import type { GameInstance, GameResult } from '@/domains/games/types';
import { GameRegistryError, type GameRegistry } from './registry';
import type { CompletionValidation, GameSummary, RoundContext, ValidationResult } from './types';

export interface GameInstanceOutcome {
  gameInstanceId: GameInstance['id'];
  status: 'OK' | 'INVALID' | 'UNAVAILABLE';
  /** Present when status is INVALID (bad configuration) or UNAVAILABLE (module missing). */
  validation?: ValidationResult;
  state?: unknown;
  results: GameResult[];
  summary: GameSummary | null;
  completion: CompletionValidation | null;
}

/**
 * Deterministically recompute every game instance from the round context.
 * Pure: no I/O. Persisting the output (local game state/results) is the caller's job.
 * One broken game must never prevent the others from calculating.
 */
export function calculateGames(
  registry: GameRegistry,
  context: RoundContext,
  instances: readonly GameInstance[],
): GameInstanceOutcome[] {
  return instances.map((instance) => calculateInstance(registry, context, instance));
}

function calculateInstance(
  registry: GameRegistry,
  context: RoundContext,
  instance: GameInstance,
): GameInstanceOutcome {
  const base = { gameInstanceId: instance.id, results: [], summary: null, completion: null };

  let module;
  try {
    module = registry.get(instance.gameDefinitionKey, instance.gameDefinitionVersion);
  } catch (e) {
    if (e instanceof GameRegistryError) {
      return {
        ...base,
        status: 'UNAVAILABLE',
        validation: {
          valid: false,
          issues: [{ code: 'MODULE_UNAVAILABLE', message: e.message }],
        },
      };
    }
    throw e;
  }

  const validation = module.validateConfiguration(context, instance.configuration);
  if (!validation.valid) return { ...base, status: 'INVALID', validation };

  const config = instance.configuration;
  const { state, results, summary } = module.calculate(context, config);
  return {
    gameInstanceId: instance.id,
    status: 'OK',
    state,
    results: results.map((r: GameResult) => ({ ...r, gameInstanceId: instance.id })),
    summary,
    completion: module.validateCompletion(context, config),
  };
}
