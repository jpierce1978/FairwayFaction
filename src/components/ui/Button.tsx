import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';
import { Text } from './Text';
import { useThemeColors } from '@/hooks/useThemeColors';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const container: Record<ButtonVariant, string> = {
  primary: 'bg-primary active:opacity-80',
  secondary: 'bg-surface border-2 border-primary active:opacity-80',
  danger: 'bg-danger active:opacity-80',
  ghost: 'bg-transparent active:bg-surface-muted',
};

const labelTone = {
  primary: 'onPrimary',
  secondary: 'primary',
  danger: 'onDanger',
  ghost: 'primary',
} as const;

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  className?: string;
}

/** Minimum 56pt tall (UX_SPEC §39). Label is always text; never an icon alone. */
export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  className = '',
  ...rest
}: ButtonProps) {
  const colors = useThemeColors();
  const isDisabled = disabled || loading;
  const spinner =
    variant === 'primary'
      ? colors.onPrimary
      : variant === 'danger'
        ? colors.onDanger
        : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      className={`min-h-touch flex-row items-center justify-center rounded-xl px-5 ${container[variant]} ${isDisabled ? 'opacity-50' : ''} ${className}`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={spinner} />
      ) : (
        <Text variant="label" tone={labelTone[variant]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
