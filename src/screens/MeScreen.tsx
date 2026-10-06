import { useEffect, useState } from 'react';
import Constants from 'expo-constants';
import { Button, Card, Screen, Text } from '@/components/ui';
import { useAuth } from '@/providers/AuthProvider';
import { useServices } from '@/providers/ServicesProvider';
import type { MutationStatus } from '@/infrastructure/sync/types';

export function MeScreen() {
  const { profile, session, signOut, isDevelopmentMock } = useAuth();
  const { mutationQueue, db, deviceId } = useServices();
  const [counts, setCounts] = useState<Record<MutationStatus, number> | null>(null);

  useEffect(() => {
    mutationQueue.countByStatus(db).then(setCounts);
  }, [mutationQueue, db]);

  return (
    <Screen>
      <Text variant="title" accessibilityRole="header">
        Me
      </Text>
      <Card className="gap-1">
        <Text variant="heading">{profile?.displayName ?? 'Golfer'}</Text>
        {profile?.fullName ? <Text tone="muted">{profile.fullName}</Text> : null}
        {session?.user.email ? <Text tone="muted">{session.user.email}</Text> : null}
        <Text tone="muted">
          Handicap:{' '}
          {profile?.handicapIndex !== null && profile?.handicapIndex !== undefined
            ? profile.handicapIndex
            : 'Not set'}
        </Text>
      </Card>

      <Card className="gap-1">
        <Text variant="label">Saved on this phone</Text>
        <Text variant="caption" tone="muted">
          {counts
            ? `${counts.PENDING} waiting to sync • ${counts.FAILED} failed • ${counts.CONFLICT} conflicts`
            : 'Checking…'}
        </Text>
        <Text variant="caption" tone="muted">
          Cloud sync is not connected yet; everything stays safely on this device.
        </Text>
      </Card>

      {__DEV__ ? (
        <Card className="gap-1 bg-surface-muted">
          <Text variant="label">Development</Text>
          <Text variant="caption" tone="muted">
            Auth: {isDevelopmentMock ? 'in-memory mock (no Supabase configured)' : 'Supabase'}
          </Text>
          <Text variant="caption" tone="muted">
            Device: {deviceId.slice(0, 8)} • v{Constants.expoConfig?.version}
          </Text>
        </Card>
      ) : null}

      <Button label="Sign Out" variant="secondary" onPress={() => void signOut()} />
    </Screen>
  );
}
