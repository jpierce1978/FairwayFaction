import { Tabs } from 'expo-router';
import { tabIcon } from '@/components/ui/tabIcon';
import { useThemeColors } from '@/hooks/useThemeColors';

/** UX_SPEC §3: exactly four primary destinations. Labels are always visible (no icon-only tabs). */
export default function TabsLayout() {
  const colors = useThemeColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.contentMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          minHeight: 60,
        },
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: tabIcon('home', 'home-outline') }}
      />
      <Tabs.Screen
        name="play"
        options={{ title: 'Play', tabBarIcon: tabIcon('golf', 'golf-outline') }}
      />
      <Tabs.Screen
        name="groups"
        options={{ title: 'Groups', tabBarIcon: tabIcon('people', 'people-outline') }}
      />
      <Tabs.Screen
        name="me"
        options={{ title: 'Me', tabBarIcon: tabIcon('person', 'person-outline') }}
      />
    </Tabs>
  );
}
