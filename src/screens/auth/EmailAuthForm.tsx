import { useState } from 'react';
import { View } from 'react-native';
import { Button, Text, TextField } from '@/components/ui';
import { validateCredentials } from '@/domains/auth/validation';
import type { AuthResult, OAuthProvider } from '@/infrastructure/auth/authService';

export interface EmailAuthFormProps {
  submitLabel: string;
  onSubmit(email: string, password: string): Promise<AuthResult>;
  onProvider(provider: OAuthProvider): Promise<AuthResult>;
}

/** Identity options from UX_SPEC §6 screen 2: Apple, Google, Email. Shared by sign-in and create-account. */
export function EmailAuthForm({ submitLabel, onSubmit, onProvider }: EmailAuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const run = async (action: () => Promise<AuthResult>) => {
    setBusy(true);
    setFormError(null);
    try {
      const result = await action();
      if (!result.ok) setFormError(result.error.message);
    } catch {
      setFormError('Something went wrong. Nothing was saved. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    const validation = validateCredentials({ email, password });
    if (!validation.valid) {
      setFieldErrors(
        Object.fromEntries(validation.issues.map((i) => [i.path ?? 'form', i.message])),
      );
      return;
    }
    setFieldErrors({});
    void run(() => onSubmit(email, password));
  };

  return (
    <View className="gap-4">
      <Button
        label="Continue with Apple"
        variant="secondary"
        disabled={busy}
        onPress={() => void run(() => onProvider('apple'))}
      />
      <Button
        label="Continue with Google"
        variant="secondary"
        disabled={busy}
        onPress={() => void run(() => onProvider('google'))}
      />
      <Text tone="muted" className="text-center">
        or use email
      </Text>
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={fieldErrors.email}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        error={fieldErrors.password}
        secureTextEntry
        autoComplete="password"
        textContentType="password"
        onSubmitEditing={submit}
      />
      {formError ? (
        <Text tone="danger" accessibilityRole="alert">
          {formError}
        </Text>
      ) : null}
      <Button label={submitLabel} loading={busy} onPress={submit} />
    </View>
  );
}
