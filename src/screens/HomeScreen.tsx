import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, EmptyState, Screen, StatusPill, Text } from '@/components/ui';
import { useHomeData } from '@/hooks/useHomeData';
import { MOCK_ACTIVE_ROUND_ID } from '@/dev/mockData';

/**
 * Home answers "What do I need to care about right now?" (UX_SPEC §11).
 * Layout and priority come from the HomeViewModel; this component holds no business logic.
 * Data is development mock data in Milestone 1.
 */
export function HomeScreen() {
  const router = useRouter();
  const [simulateActive, setSimulateActive] = useState(false);
  const { viewModel: vm } = useHomeData({ withActiveRound: simulateActive });

  return (
    <Screen>
      <Text variant="title" accessibilityRole="header">
        {vm.greeting}
      </Text>

      {vm.staleSince ? (
        <Text variant="caption" tone="muted">
          Last updated {new Date(vm.staleSince).toLocaleString()}
        </Text>
      ) : null}

      {vm.hero.kind === 'ACTIVE_ROUND' ? (
        <Card className="gap-3 border-primary">
          <Text variant="label" tone="primary">
            ROUND IN PROGRESS
          </Text>
          <Text variant="heading">{vm.hero.title}</Text>
          <Text>{vm.hero.subtitle}</Text>
          <Button
            label="Return to Round"
            onPress={() =>
              router.push(`/round/${vm.hero.kind === 'ACTIVE_ROUND' ? vm.hero.roundId : ''}/score`)
            }
          />
        </Card>
      ) : vm.hero.kind === 'UPCOMING_ROUND' ? (
        <Card className="gap-2">
          <Text variant="label" tone="muted">
            NEXT ROUND
          </Text>
          <Text variant="heading">{vm.hero.title}</Text>
          <Text>{vm.hero.whenLabel}</Text>
          <Text>{vm.hero.courseName}</Text>
          <Text tone="muted">{vm.hero.playerCount} Players</Text>
          <Button
            label="View Round"
            className="mt-2"
            onPress={() =>
              router.push(
                `/round-preview/${vm.hero.kind === 'UPCOMING_ROUND' ? vm.hero.scheduledRoundId : ''}`,
              )
            }
          />
        </Card>
      ) : (
        <Card>
          <EmptyState
            title="No rounds yet."
            message="Create a round or join a golf group to get started."
            actionLabel="Start Round"
            onAction={() => router.push('/play')}
          />
        </Card>
      )}

      {vm.factions.length > 0 ? (
        <View className="gap-2">
          <Text variant="label" tone="muted">
            YOUR GROUPS
          </Text>
          {vm.factions.map((f) => (
            <Pressable
              key={f.id}
              accessibilityRole="button"
              accessibilityLabel={`${f.name}, ${f.subtitle}`}
              onPress={() => router.push(`/faction/${f.id}`)}
              className="min-h-touch justify-center rounded-2xl border border-border bg-surface px-4 py-3 active:opacity-80"
            >
              <Text variant="label">{f.name}</Text>
              <Text variant="caption" tone="muted">
                {f.subtitle}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {vm.recentRounds.length > 0 ? (
        <View className="gap-2">
          <Text variant="label" tone="muted">
            RECENT
          </Text>
          {vm.recentRounds.map((r) => (
            <Card key={r.roundId}>
              <Text variant="label">
                {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
              <Text>
                {r.gross !== null ? `${r.gross} • ` : ''}
                {r.courseName}
              </Text>
              <Text variant="caption" tone="muted">
                {r.summary}
              </Text>
            </Card>
          ))}
        </View>
      ) : null}

      {__DEV__ ? (
        <Card className="gap-2 bg-surface-muted">
          <StatusPill label="Development data" tone="warning" />
          <View className="min-h-touch flex-row items-center justify-between">
            <Text variant="label">Simulate active round</Text>
            <Switch
              value={simulateActive}
              onValueChange={setSimulateActive}
              accessibilityLabel="Simulate active round"
            />
          </View>
          <Button
            variant="secondary"
            label="Open active-round shell"
            onPress={() => router.push(`/round/${MOCK_ACTIVE_ROUND_ID}/score`)}
          />
        </Card>
      ) : null}
    </Screen>
  );
}
