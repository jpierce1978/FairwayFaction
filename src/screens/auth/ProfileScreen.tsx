import { useState } from 'react';
import { Button, Screen, Text, TextField } from '@/components/ui';
import { validateBasicProfile } from '@/domains/auth/validation';
import { useAuth } from '@/providers/AuthProvider';
import { useServices } from '@/providers/ServicesProvider';

/**
 * UX_SPEC §6 screen 3: name, display name, optional handicap. Deliberately NOT asked:
 * GHIN, home course, statistics, payment, notifications. Avatar upload arrives later.
 */
export function ProfileScreen() {
  const { profiles } = useServices();
  const { session, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [handicap, setHandicap] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!session) return;
    const parsed = handicap.trim() === '' ? null : Number(handicap);
    const input = { fullName, displayName, handicapIndex: parsed };
    const validation = validateBasicProfile(input);
    if (!validation.valid) {
      setErrors(Object.fromEntries(validation.issues.map((i) => [i.path ?? 'form', i.message])));
      return;
    }
    setErrors({});
    setSaveError(null);
    setBusy(true);
    try {
      await profiles.saveBasicProfile({ userId: session.user.id, ...input });
      await refreshProfile();
    } catch {
      setSaveError("We couldn't save your profile on this phone. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Text variant="title" accessibilityRole="header">
        About You
      </Text>
      <TextField
        label="Name"
        value={fullName}
        onChangeText={setFullName}
        error={errors.fullName}
        autoComplete="name"
        textContentType="name"
      />
      <TextField
        label="Display name"
        value={displayName}
        onChangeText={setDisplayName}
        error={errors.displayName}
        placeholder="What your group calls you"
      />
      <TextField
        label="Handicap (optional)"
        value={handicap}
        onChangeText={setHandicap}
        error={errors.handicapIndex}
        keyboardType="decimal-pad"
        placeholder="e.g. 12.4"
      />
      {saveError ? (
        <Text tone="danger" accessibilityRole="alert">
          {saveError}
        </Text>
      ) : null}
      <Button label="Continue" loading={busy} onPress={() => void save()} />
    </Screen>
  );
}
