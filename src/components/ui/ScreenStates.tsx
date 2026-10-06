import { ActivityIndicator, View } from 'react-native';
import { Button } from './Button';
import { Text } from './Text';
import { useThemeColors } from '@/hooks/useThemeColors';

/** SCREEN_CONTRACTS §20: every screen defines loading, empty and error states. These are the shared shells. */
export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  const colors = useThemeColors();
  return (
    <View className="flex-1 items-center justify-center gap-3 p-6" accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={colors.primary} />
      <Text tone="muted">{label}</Text>
    </View>
  );
}

export interface EmptyStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** UX_SPEC §40: tell the user what to do next, not just that nothing is here. */
export function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View className="items-center gap-3 p-6">
      <Text variant="heading" className="text-center">
        {title}
      </Text>
      <Text tone="muted" className="text-center">
        {message}
      </Text>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

export interface ErrorStateProps {
  /** What happened. */
  title: string;
  /** Whether data is safe and what to do (UX_SPEC §41). */
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
}

export function ErrorState({ title, message, retryLabel = 'Try Again', onRetry }: ErrorStateProps) {
  return (
    <View className="items-center gap-3 p-6" accessibilityRole="alert">
      <Text variant="heading" tone="danger" className="text-center">
        {title}
      </Text>
      <Text tone="muted" className="text-center">
        {message}
      </Text>
      {onRetry ? <Button label={retryLabel} variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}
