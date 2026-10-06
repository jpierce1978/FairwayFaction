import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LoadingState } from '@/components/ui';
import { AppProviders } from '@/providers/AppProviders';
import { useAuth } from '@/providers/AuthProvider';

/**
 * Auth gating via protected route groups. Which group is reachable is decided in one
 * place from AuthStatus; individual screens never check "is the user signed in".
 */
function RootNavigator() {
  const { status } = useAuth();
  if (status === 'loading') return <LoadingState label="Signing you in…" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={status === 'signedOut'}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'needsProfile'}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'ready'}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="round/[roundId]" options={{ gestureEnabled: false }} />
        <Stack.Screen name="faction/[factionId]" options={{ headerShown: true, title: 'Group' }} />
        <Stack.Screen
          name="round-preview/[scheduledRoundId]"
          options={{ headerShown: true, title: 'Round' }}
        />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="auto" />
      <RootNavigator />
    </AppProviders>
  );
}
