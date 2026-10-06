import {
  STALE_AFTER_MS,
  buildHomeViewModel,
  formatWhen,
  greetingFor,
  type HomeData,
} from '@/domains/rounds/home';
import { createMockHomeData, MOCK_ACTIVE_ROUND_ID } from '@/dev/mockData';

const NOW = new Date(2026, 9, 10, 9, 0, 0); // local time, Sat Oct 10 2026 9:00

describe('Home view model', () => {
  it('prioritizes an active round over the upcoming round', () => {
    const vm = buildHomeViewModel(createMockHomeData(NOW, true), NOW);
    expect(vm.hero).toMatchObject({
      kind: 'ACTIVE_ROUND',
      roundId: MOCK_ACTIVE_ROUND_ID,
      subtitle: 'Hole 7',
      title: 'Saturday Golf',
    });
  });
  it('shows the next round when nothing is active', () => {
    const vm = buildHomeViewModel(createMockHomeData(NOW, false), NOW);
    expect(vm.hero).toMatchObject({
      kind: 'UPCOMING_ROUND',
      title: 'Saturday Golf',
      courseName: 'Surrey Hills',
      playerCount: 13,
    });
    expect(vm.hero.kind === 'UPCOMING_ROUND' && vm.hero.whenLabel).toBe('Today • 1:00 PM');
  });
  it('has an empty hero (empty state) with no rounds at all', () => {
    const data: HomeData = {
      ...createMockHomeData(NOW),
      nextRound: null,
      activeRound: null,
      factions: [],
      recentRounds: [],
    };
    expect(buildHomeViewModel(data, NOW)).toMatchObject({
      hero: { kind: 'NONE' },
      factions: [],
      recentRounds: [],
    });
  });
  it('greets by display name and time of day', () => {
    expect(buildHomeViewModel(createMockHomeData(NOW), NOW).greeting).toBe('Good morning, JP');
    expect(greetingFor(new Date(2026, 0, 1, 12))).toBe('Good afternoon');
    expect(greetingFor(new Date(2026, 0, 1, 18))).toBe('Good evening');
  });
  it('reports staleness only after the threshold (offline "Last updated" banner)', () => {
    const fresh = createMockHomeData(NOW);
    expect(buildHomeViewModel(fresh, NOW).staleSince).toBeNull();
    const old = {
      ...fresh,
      lastUpdated: new Date(NOW.getTime() - STALE_AFTER_MS - 1000).toISOString(),
    };
    expect(buildHomeViewModel(old, NOW).staleSince).toBe(old.lastUpdated);
  });
  it('labels non-today rounds with the weekday', () => {
    const tomorrow = new Date(2026, 9, 11, 13, 0);
    expect(formatWhen(tomorrow.toISOString(), NOW)).toBe('Sunday • 1:00 PM');
  });
});
