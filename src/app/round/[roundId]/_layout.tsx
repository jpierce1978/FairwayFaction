import { Tabs } from 'expo-router';
import { tabIcon } from '@/components/ui/tabIcon';
import { useThemeColors } from '@/hooks/useThemeColors';

/**
 * Active-round navigation (UX_SPEC §4). While a round is open, the normal
 * Home/Play/Groups/Me tabs are replaced by Score/Games/GPS/Round; nothing in the
 * round requires going back to Home.
 */
export default function ActiveRoundLayout() {
  const colors = useThemeColors();
  return (
    <Tabs
      initialRouteName="score"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.contentMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          minHeight: 64,
        },
        tabBarLabelStyle: { fontSize: 14, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="score"
        options={{ title: 'Score', tabBarIcon: tabIcon('create', 'create-outline') }}
      />
      <Tabs.Screen
        name="games"
        options={{ title: 'Games', tabBarIcon: tabIcon('trophy', 'trophy-outline') }}
      />
      <Tabs.Screen
        name="gps"
        options={{ title: 'GPS', tabBarIcon: tabIcon('navigate', 'navigate-outline') }}
      />
      <Tabs.Screen
        name="round"
        options={{ title: 'Round', tabBarIcon: tabIcon('menu', 'menu-outline') }}
      />
    </Tabs>
  );
}
