import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { useThemeColors } from '@/hooks/useThemeColors';

export type StatusTone = 'success' | 'warning' | 'neutral';

const icon: Record<StatusTone, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  warning: 'alert-circle',
  neutral: 'ellipse-outline',
};

/** State is conveyed by icon + text, never color alone (UX_SPEC §39). */
export function StatusPill({ label, tone = 'neutral' }: { label: string; tone?: StatusTone }) {
  const colors = useThemeColors();
  const color =
    tone === 'success' ? colors.success : tone === 'warning' ? colors.warning : colors.contentMuted;
  return (
    <View className="flex-row items-center gap-1 self-start rounded-full bg-surface-muted px-3 py-1">
      <Ionicons name={icon[tone]} size={16} color={color} />
      <Text variant="caption" className="font-semibold">
        {label}
      </Text>
    </View>
  );
}
