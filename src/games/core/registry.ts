import type { AnyGameModule } from './types';

export class GameRegistryError extends Error {
  constructor(
    message: string,
    readonly code: 'DUPLICATE' | 'NOT_FOUND' | 'INVALID_MODULE',
  ) {
    super(message);
    this.name = 'GameRegistryError';
  }
}

/** Code-backed lookup of game modules by key and version (DOMAIN_MAP §8: GameDefinitions are code-backed early on). */
export class GameRegistry {
  private readonly modules = new Map<string, Map<number, AnyGameModule>>();

  register(module: AnyGameModule): this {
    if (!module.key || !Number.isInteger(module.version) || module.version < 1) {
      throw new GameRegistryError(
        `Game module needs a non-empty key and integer version >= 1 (got "${module.key}" v${module.version}).`,
        'INVALID_MODULE',
      );
    }
    const versions = this.modules.get(module.key) ?? new Map<number, AnyGameModule>();
    if (versions.has(module.version)) {
      throw new GameRegistryError(
        `Game module "${module.key}" v${module.version} is already registered.`,
        'DUPLICATE',
      );
    }
    versions.set(module.version, module);
    this.modules.set(module.key, versions);
    return this;
  }

  has(key: string, version?: number): boolean {
    const versions = this.modules.get(key);
    return !!versions && (version === undefined || versions.has(version));
  }

  /** Exact version when given (rounds pin the version they were created with); otherwise the latest. */
  get(key: string, version?: number): AnyGameModule {
    const versions = this.modules.get(key);
    const found =
      versions &&
      (version === undefined ? versions.get(Math.max(...versions.keys())) : versions.get(version));
    if (!found) {
      throw new GameRegistryError(
        `No game module registered for "${key}"${version === undefined ? '' : ` v${version}`}.`,
        'NOT_FOUND',
      );
    }
    return found;
  }

  /** Latest version of every registered game. */
  list(): AnyGameModule[] {
    return [...this.modules.keys()].map((key) => this.get(key));
  }
}

export function createGameRegistry(modules: readonly AnyGameModule[] = []): GameRegistry {
  const registry = new GameRegistry();
  modules.forEach((m) => registry.register(m));
  return registry;
}
