import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './AuthProvider';
import { ServicesProvider } from './ServicesProvider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider>
      <ServicesProvider>
        <AuthProvider>{children}</AuthProvider>
      </ServicesProvider>
    </SafeAreaProvider>
  );
}
