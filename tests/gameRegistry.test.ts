import {
  GameRegistry,
  GameRegistryError,
  calculateGames,
  createDevelopmentRegistry,
  createGameRegistry,
  createProductionRegistry,
  type GameModule,
} from '@/games';
import { lowTotalModule, LOW_TOTAL_KEY } from '@/games/sample/lowTotal';
import type { GameInstance } from '@/domains/games/types';
import { asId } from '@/types/ids';
import { VALID } from '@/types/validation';
import { COMPLETE } from '@/games/core/completion';
import { contextWith, makePlayer, makeScore } from './helpers/context';

const fakeModule = (key: string, version = 1): GameModule => ({
  key,
  version,
  name: key,
  description: '',
  capabilities: [],
  validateConfiguration: () => VALID,
  initialize: () => ({}),
  calculate: () => ({
    state: {},
    results: [],
    summary: { headline: `${key}@${version}`, lines: [] },
  }),
  validateCompletion: () => COMPLETE,
});

const instance = (key: string, config: object, version = 1, id = 'gi1'): GameInstance => ({
  id: asId<'GameInstanceId'>(id),
  roundId: asId<'RoundId'>('r1'),
  gameDefinitionKey: key,
  gameDefinitionVersion: version,
  presetId: null,
  configuration: config as never,
  status: 'ACTIVE',
});

describe('GameRegistry', () => {
  it('registers and looks up modules by key', () => {
    const registry = createGameRegistry([fakeModule('skins'), fakeModule('nassau')]);
    expect(registry.has('skins')).toBe(true);
    expect(registry.get('skins').key).toBe('skins');
    expect(
      registry
        .list()
        .map((m) => m.key)
        .sort(),
    ).toEqual(['nassau', 'skins']);
  });
  it('rejects duplicate key+version but allows new versions side by side', () => {
    const registry = new GameRegistry().register(fakeModule('skins', 1));
    expect(() => registry.register(fakeModule('skins', 1))).toThrow(GameRegistryError);
    registry.register(fakeModule('skins', 2));
    expect(registry.get('skins').version).toBe(2); // latest by default
    expect(registry.get('skins', 1).version).toBe(1); // rounds pin the version they were created with
    expect(registry.list()).toHaveLength(1);
  });
  it('throws NOT_FOUND for unknown keys or versions', () => {
    const registry = createGameRegistry([fakeModule('skins')]);
    expect(() => registry.get('wolf')).toThrow(expect.objectContaining({ code: 'NOT_FOUND' }));
    expect(() => registry.get('skins', 9)).toThrow(GameRegistryError);
    expect(registry.has('skins', 9)).toBe(false);
  });
  it('rejects malformed modules', () => {
    expect(() => new GameRegistry().register(fakeModule('', 1))).toThrow(
      expect.objectContaining({ code: 'INVALID_MODULE' }),
    );
    expect(() => new GameRegistry().register(fakeModule('x', 0))).toThrow(GameRegistryError);
    expect(() => new GameRegistry().register(fakeModule('x', 1.5))).toThrow(GameRegistryError);
  });
  it('production registry is empty in Milestone 1; the sample exists only in the development registry', () => {
    expect(createProductionRegistry().list()).toEqual([]);
    expect(
      createDevelopmentRegistry()
        .list()
        .map((m) => m.key),
    ).toEqual([LOW_TOTAL_KEY]);
  });
});

describe('calculateGames engine', () => {
  const registry = createDevelopmentRegistry();
  const players = [makePlayer('a', 'JP'), makePlayer('b', 'Paul')];

  it('stamps results with the game instance id and returns summary + completion', () => {
    const ctx = contextWith({ players, scores: [makeScore('a', 0, 4), makeScore('b', 0, 5)] });
    const [out] = calculateGames(registry, ctx, [instance(LOW_TOTAL_KEY, { unitsForWin: 3 })]);
    expect(out!.status).toBe('OK');
    expect(out!.results).toEqual([
      expect.objectContaining({
        gameInstanceId: 'gi1',
        winnerType: 'PLAYER',
        winnerId: 'a',
        unitCount: 3,
      }),
    ]);
    expect(out!.summary!.headline).toBe('JP leads (4)');
    expect(out!.completion).toMatchObject({ complete: false });
  });
  it('reports INVALID configuration without calculating', () => {
    const [out] = calculateGames(registry, contextWith({ players }), [
      instance(LOW_TOTAL_KEY, { unitsForWin: 0 }),
    ]);
    expect(out).toMatchObject({ status: 'INVALID', results: [] });
    expect(out!.validation).toMatchObject({ valid: false });
  });
  it('reports UNAVAILABLE for a module this build lacks, and still calculates the others', () => {
    const outs = calculateGames(
      registry,
      contextWith({ players, scores: [makeScore('a', 0, 4)] }),
      [
        instance('future-game', {}, 1, 'gi-x'),
        instance(LOW_TOTAL_KEY, { unitsForWin: 1 }, 1, 'gi-ok'),
      ],
    );
    expect(outs.map((o) => o.status)).toEqual(['UNAVAILABLE', 'OK']);
  });
  it('is deterministic and pure: same context in, same output out, inputs untouched', () => {
    const ctx = contextWith({ players, scores: [makeScore('a', 0, 4), makeScore('b', 0, 3)] });
    const frozen = JSON.stringify(ctx);
    const run = () => calculateGames(registry, ctx, [instance(LOW_TOTAL_KEY, { unitsForWin: 1 })]);
    expect(run()).toEqual(run());
    expect(JSON.stringify(ctx)).toBe(frozen);
  });
  it('recomputing after a correction replaces the outcome (supports undo)', () => {
    const base = [makeScore('a', 0, 4), makeScore('b', 0, 5)];
    const inst = [instance(LOW_TOTAL_KEY, { unitsForWin: 1 })];
    const before = calculateGames(registry, contextWith({ players, scores: base }), inst)[0]!;
    const after = calculateGames(
      registry,
      contextWith({ players, scores: [makeScore('a', 0, 6), base[1]!] }),
      inst,
    )[0]!;
    expect(before.results[0]!.winnerId).toBe('a');
    expect(after.results[0]!.winnerId).toBe('b');
  });
});

describe('sample low-total module', () => {
  const ctx = (scores: ReturnType<typeof makeScore>[]) =>
    contextWith({ players: [makePlayer('a', 'JP'), makePlayer('b', 'Paul')], scores });

  it('produces no result on a tie and flags it for resolution (never invents a winner)', () => {
    const c = ctx([makeScore('a', 0, 4), makeScore('b', 0, 4)]);
    expect(lowTotalModule.calculate(c, { unitsForWin: 1 }).results).toEqual([]);
    expect(lowTotalModule.validateCompletion(c, { unitsForWin: 1 })).toMatchObject({
      complete: false,
      unresolvedTies: ['a', 'b'],
    });
  });
  it('is complete once everyone has every hole and there is a clear winner', () => {
    const scores = [0, 1, 2].flatMap((h) => [makeScore('a', h, 4), makeScore('b', h, 5)]);
    expect(lowTotalModule.validateCompletion(ctx(scores), { unitsForWin: 1 })).toEqual({
      complete: true,
    });
  });
  it('ignores withdrawn players', () => {
    const c = contextWith({
      players: [makePlayer('a', 'JP'), makePlayer('b', 'Paul', { status: 'WITHDRAWN' })],
      scores: [makeScore('a', 0, 9), makeScore('b', 0, 1)],
    });
    expect(lowTotalModule.calculate(c, { unitsForWin: 1 }).results[0]!.winnerId).toBe('a');
  });
  it('validates configuration shape from untrusted JSON', () => {
    for (const bad of [null, {}, { unitsForWin: '2' }, { unitsForWin: 1.5 }, { unitsForWin: 0 }]) {
      expect(lowTotalModule.validateConfiguration(ctx([]), bad).valid).toBe(false);
    }
    expect(lowTotalModule.validateConfiguration(ctx([]), { unitsForWin: 2 })).toEqual(VALID);
  });
});
