import { useRouter } from 'expo-router';
import { Button, Screen, Text } from '@/components/ui';
import { useServices } from '@/providers/ServicesProvider';
import { EmailAuthForm } from './EmailAuthForm';

export function CreateAccountScreen() {
  const { auth } = useServices();
  const router = useRouter();
  return (
    <Screen>
      <Text variant="title" accessibilityRole="header">
        Create Account
      </Text>
      <EmailAuthForm
        submitLabel="Create Account"
        onSubmit={(e, p) => auth.signUpWithEmail(e, p)}
        onProvider={(p) => auth.signInWithProvider(p)}
      />
      <Button
        label="I already have an account"
        variant="ghost"
        onPress={() => router.replace('/sign-in')}
      />
    </Screen>
  );
}
