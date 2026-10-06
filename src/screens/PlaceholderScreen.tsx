import { View } from 'react-native';
import { Card, Screen, StatusPill, Text } from '@/components/ui';

/** Honest stand-in for a screen whose real implementation is a later milestone. */
export function PlaceholderScreen({
  title,
  description,
  planned,
  topInset = true,
}: {
  title: string;
  description: string;
  /** What the production screen will contain, from the specs. */
  planned: string[];
  topInset?: boolean;
}) {
  return (
    <Screen topInset={topInset}>
      <Text variant="title">{title}</Text>
      <StatusPill label="Not built yet" tone="warning" />
      <Text tone="muted">{description}</Text>
      <Card className="gap-2">
        <Text variant="label">Planned</Text>
        <View className="gap-1">
          {planned.map((line) => (
            <Text key={line} variant="caption">
              • {line}
            </Text>
          ))}
        </View>
      </Card>
    </Screen>
  );
}
