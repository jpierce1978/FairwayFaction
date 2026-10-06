import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { Card, Screen, StatusPill, Text } from '@/components/ui';
import { useHomeData } from '@/hooks/useHomeData';

export function GroupsScreen() {
  const router = useRouter();
  const { viewModel } = useHomeData();
  return (
    <Screen>
      <Text variant="title" accessibilityRole="header">
        Groups
      </Text>
      <StatusPill label="Development data" tone="warning" />
      {viewModel.factions.map((f) => (
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
      <Card>
        <Text variant="caption" tone="muted">
          Creating and joining groups arrives in a later milestone.
        </Text>
      </Card>
    </Screen>
  );
}
