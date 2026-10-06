import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';

export interface ScreenProps {
  children: ReactNode;
  /** Scroll by default; set false for screens that manage their own scrolling. */
  scroll?: boolean;
  /** Apply top inset; false when a navigation header already does. */
  topInset?: boolean;
  className?: string;
}

/** Page container: safe areas, background, 16pt gutters. */
export function Screen({ children, scroll = true, topInset = true, className = '' }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const style = { paddingTop: topInset ? insets.top : 0 };
  if (!scroll) {
    return (
      <View className={`flex-1 bg-background px-4 ${className}`} style={style}>
        {children}
      </View>
    );
  }
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName={`px-4 pb-8 gap-4 ${className}`}
      contentContainerStyle={style}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}
