import { createGameRegistry, type GameRegistry } from './core/registry';
import { lowTotalModule } from './sample/lowTotal';

export * from './core/registry';
export * from './core/engine';
export * from './core/types';
export { COMPLETE, incomplete } from './core/completion';

/**
 * Production registry. Empty in Milestone 1: the real games (Best Ball, Skins,
 * Nassau, Dots) arrive in later milestones and are registered here.
 */
export function createProductionRegistry(): GameRegistry {
  return createGameRegistry([]);
}

/** Development/test registry: production games plus the architecture-proving sample. */
export function createDevelopmentRegistry(): GameRegistry {
  return createGameRegistry([lowTotalModule]);
}
