import { TextInput, View, type TextInputProps } from 'react-native';
import { Text } from './Text';
import { useThemeColors } from '@/hooks/useThemeColors';

export interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string | null;
}

/** Labeled input with an inline error. Errors are text, not color alone. */
export function TextField({ label, error, ...rest }: TextFieldProps) {
  const colors = useThemeColors();
  return (
    <View className="gap-1">
      <Text variant="label">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.contentMuted}
        className={`min-h-touch rounded-xl border-2 bg-surface px-4 text-[17px] text-content ${error ? 'border-danger' : 'border-border'}`}
        {...rest}
      />
      {error ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
