import { useColorScheme } from 'react-native';
import { colors, type ThemeColors } from '@/design/tokens';

/** Token colors for the active light/dark scheme, for props that cannot take className. */
export function useThemeColors(): ThemeColors {
  return useColorScheme() === 'dark' ? colors.dark : colors.light;
}
