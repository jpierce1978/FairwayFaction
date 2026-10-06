import { renderRouter, fireEvent } from 'expo-router/testing-library';
import TabsLayout from '@/app/(tabs)/_layout';
import RoundLayout from '@/app/round/[roundId]/_layout';
import HomeRoute from '@/app/(tabs)/index';
import PlayRoute from '@/app/(tabs)/play';
import GroupsRoute from '@/app/(tabs)/groups';
import ScoreRoute from '@/app/round/[roundId]/score';
import GamesRoute from '@/app/round/[roundId]/games';
import GpsRoute from '@/app/round/[roundId]/gps';
import RoundRoute from '@/app/round/[roundId]/round';
import { View } from 'react-native';

// MeScreen needs app services (SQLite); the navigation shell test substitutes a plain view for it.
const MeStub = () => <View testID="me-stub" />;

const routes = {
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': HomeRoute,
  '(tabs)/play': PlayRoute,
  '(tabs)/groups': GroupsRoute,
  '(tabs)/me': MeStub,
  'round/[roundId]/_layout': RoundLayout,
  'round/[roundId]/score': ScoreRoute,
  'round/[roundId]/games': GamesRoute,
  'round/[roundId]/gps': GpsRoute,
  'round/[roundId]/round': RoundRoute,
};

/**
 * expo-router's helper predates RNTL v14's async render: the returned promise carries the
 * pathname helpers (used by toHavePathname) while the awaited value carries the queries.
 */
async function open(initialUrl: string) {
  const nav = renderRouter(routes, { initialUrl });
  return { nav, view: await nav };
}

describe('navigation shell', () => {
  it('main navigation has exactly Home / Play / Groups / Me and lands on Home', async () => {
    const { view, nav } = await open('/');
    expect(nav).toHavePathname('/');
    for (const label of ['Home', 'Play', 'Groups', 'Me'])
      expect(view.getByRole('button', { name: new RegExp(label) })).toBeTruthy();
    for (const label of ['Score', 'Games', 'GPS'])
      expect(view.queryByRole('button', { name: new RegExp(`^${label}`) })).toBeNull();
    expect(view.getByText(/Good (morning|afternoon|evening), JP/)).toBeTruthy();
  });

  it('switches between primary destinations', async () => {
    const { view, nav } = await open('/');
    await fireEvent.press(view.getByRole('button', { name: /Play/ }));
    expect(nav).toHavePathname('/play');
    await fireEvent.press(view.getByRole('button', { name: /Groups/ }));
    expect(nav).toHavePathname('/groups');
    expect(view.getByText('Saturday Golf')).toBeTruthy();
  });

  it('Home shows the upcoming round, and View Round is one tap away', async () => {
    const { view, nav } = await open('/');
    expect(view.getByText('NEXT ROUND')).toBeTruthy();
    expect(view.getByText('Surrey Hills')).toBeTruthy();
    expect(view.getByRole('button', { name: 'View Round' })).toBeTruthy();
  });

  it('an active round takes precedence on Home and returns to Score', async () => {
    const { view, nav } = await open('/');
    await fireEvent(view.getByLabelText('Simulate active round'), 'valueChange', true);
    expect(view.getByText('ROUND IN PROGRESS')).toBeTruthy();
    expect(view.getByText('Hole 7')).toBeTruthy();
    expect(view.queryByText('NEXT ROUND')).toBeNull();
    await fireEvent.press(view.getByRole('button', { name: 'Return to Round' }));
    expect(nav).toHavePathname('/round/00000000-0000-4000-8000-0000000000a1/score');
  });

  it('inside a round, navigation is Score / Games / GPS / Round and the main tabs are gone', async () => {
    const { view, nav } = await open('/round/abc/score');
    for (const label of ['Score', 'Games', 'GPS', 'Round'])
      expect(view.getByRole('button', { name: new RegExp(label) })).toBeTruthy();
    for (const label of ['Home', 'Play', 'Groups', 'Me'])
      expect(view.queryByRole('button', { name: new RegExp(`^${label}`) })).toBeNull();
    await fireEvent.press(view.getByRole('button', { name: /Games/ }));
    expect(nav).toHavePathname('/round/abc/games');
    await fireEvent.press(view.getByRole('button', { name: /GPS/ }));
    expect(nav).toHavePathname('/round/abc/gps');
    await fireEvent.press(view.getByRole('button', { name: /Round/ }));
    expect(nav).toHavePathname('/round/abc/round');
  });

  it('the Round tab offers a way back Home', async () => {
    const { view, nav } = await open('/round/abc/round');
    await fireEvent.press(view.getByRole('button', { name: 'Leave Round View' }));
    expect(nav).toHavePathname('/');
  });
});
