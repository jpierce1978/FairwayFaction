import type { ColorValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type IconName = keyof typeof Ionicons.glyphMap;

/** Builds a tabBarIcon renderer that swaps to the filled glyph when focused. */
export function tabIcon(focused: IconName, idle: IconName) {
  return function TabIcon(props: { focused: boolean; color: ColorValue; size: number }) {
    return (
      <Ionicons
        name={props.focused ? focused : idle}
        size={props.size}
        color={props.color as string}
      />
    );
  };
}
