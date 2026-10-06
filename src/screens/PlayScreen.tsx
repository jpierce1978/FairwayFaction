import { Card, Screen, StatusPill, Text } from '@/components/ui';

export function PlayScreen() {
  return (
    <Screen>
      <Text variant="title" accessibilityRole="header">
        Play
      </Text>
      <StatusPill label="Not built yet" tone="warning" />
      <Card className="gap-2">
        <Text variant="label">Coming in a later milestone</Text>
        {['Start Round (Quick Start and New Round)', 'Upcoming', 'Round History', 'Courses'].map(
          (l) => (
            <Text key={l} variant="caption">
              • {l}
            </Text>
          ),
        )}
      </Card>
    </Screen>
  );
}
