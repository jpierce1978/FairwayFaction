import {
  fromIssues,
  mergeValidation,
  type ValidationIssue,
  type ValidationResult,
} from '@/types/validation';
import type { GameInstance } from '@/domains/games/types';
import type { Course } from '@/domains/courses/types';
import type { GameRegistry } from '@/games/core/registry';
import type { RoundContext } from '@/games/core/types';
import { validatePlayerSelection } from './validation';

/**
 * SCREEN_CONTRACTS §3: a round may begin if at least one player exists, a course
 * exists, and required game configuration is valid. Missing OPTIONAL information
 * (teams, tees, RSVPs) must never block the round.
 */
export function validateRoundStart(
  context: Pick<RoundContext, 'players'> & { course: Course | null },
  games: { registry: GameRegistry; context: RoundContext; instances: readonly GameInstance[] },
): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (!context.course) {
    issues.push({ code: 'NO_COURSE', message: 'Choose a course.', path: 'course' });
  }

  const gameIssues: ValidationResult[] = games.instances.map((instance) => {
    if (!games.registry.has(instance.gameDefinitionKey, instance.gameDefinitionVersion)) {
      return {
        valid: false as const,
        issues: [
          {
            code: 'GAME_UNAVAILABLE',
            message: `Game "${instance.gameDefinitionKey}" is not available in this version of the app.`,
            path: `games.${instance.id}`,
          },
        ],
      };
    }
    const module = games.registry.get(instance.gameDefinitionKey, instance.gameDefinitionVersion);
    return module.validateConfiguration(games.context, instance.configuration);
  });

  return mergeValidation(
    validatePlayerSelection(context.players),
    fromIssues(issues),
    ...gameIssues,
  );
}
