import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Screen, StatusPill, Text } from '@/components/ui';
import { useAuth } from '@/providers/AuthProvider';

/** UX_SPEC §6 Screen 1. */
export function WelcomeScreen() {
  const router = useRouter();
  const { isDevelopmentMock } = useAuth();
  return (
    <Screen scroll={false}>
      <View className="flex-1 justify-center gap-3">
        <Text variant="display" tone="primary" accessibilityRole="header">
          FairwayFaction
        </Text>
        <Text variant="heading">Golf with your crew. Without the chaos.</Text>
        {isDevelopmentMock && __DEV__ ? (
          <StatusPill label="Dev mode: mock sign-in" tone="warning" />
        ) : null}
      </View>
      <View className="gap-3 pb-8">
        <Button label="Get Started" onPress={() => router.push('/create-account')} />
        <Button
          label="I already have an account"
          variant="ghost"
          onPress={() => router.push('/sign-in')}
        />
      </View>
    </Screen>
  );
}
