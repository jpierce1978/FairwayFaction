import { useRouter } from 'expo-router';
import { Button, Screen, Text } from '@/components/ui';
import { useServices } from '@/providers/ServicesProvider';
import { EmailAuthForm } from './EmailAuthForm';

export function SignInScreen() {
  const { auth } = useServices();
  const router = useRouter();
  return (
    <Screen>
      <Text variant="title" accessibilityRole="header">
        Sign In
      </Text>
      <EmailAuthForm
        submitLabel="Sign In"
        onSubmit={(e, p) => auth.signInWithEmail(e, p)}
        onProvider={(p) => auth.signInWithProvider(p)}
      />
      <Button
        label="Create an account"
        variant="ghost"
        onPress={() => router.replace('/create-account')}
      />
    </Screen>
  );
}
