import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Card, Screen, StatusPill, Text } from '@/components/ui';
import { PlaceholderScreen } from './PlaceholderScreen';

export function ScoreShellScreen() {
  const { roundId } = useLocalSearchParams<{ roundId: string }>();
  return (
    <PlaceholderScreen
      title="Score"
      description={`Primary score entry for round ${roundId?.slice(0, 8) ?? ''}. Scores will write to local SQLite first, then sync.`}
      planned={[
        'Hole header, per-player par-aware score buttons (UX_SPEC §19–20)',
        'Instant record + undo, no confirmation dialogs',
        'Game status strip, Next Hole',
      ]}
    />
  );
}

export function GamesShellScreen() {
  return (
    <PlaceholderScreen
      title="Games"
      description="Live standings for every game attached to the round, rendered from module-calculated results."
      planned={[
        'Saturday Best Ball, Skins, Nassau, Dots',
        'Results are displayed, never calculated, by the UI',
      ]}
    />
  );
}

export function GpsShellScreen() {
  return (
    <PlaceholderScreen
      title="GPS"
      description="Front / center / back distances. Score entry stays fully usable when GPS is unavailable."
      planned={['Distance to green', 'Hole map (later)']}
    />
  );
}

/** The Round tab is also where the user leaves the round shell and returns Home. */
export function RoundMenuShellScreen() {
  const router = useRouter();
  const { roundId } = useLocalSearchParams<{ roundId: string }>();
  return (
    <Screen>
      <Text variant="title" accessibilityRole="header">
        Round
      </Text>
      <StatusPill label="Not built yet" tone="warning" />
      <Card className="gap-1">
        <Text variant="label">Round {roundId?.slice(0, 8)}</Text>
        <Text variant="caption" tone="muted">
          Planned: Full Scorecard, Players, Teams, Games, Course, Sync Status. Admin: Edit Round,
          Correct Scores, Finish Round.
        </Text>
      </Card>
      <Button label="Leave Round View" variant="secondary" onPress={() => router.replace('/')} />
    </Screen>
  );
}
