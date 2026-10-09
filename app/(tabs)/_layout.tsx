import { Tabs } from 'expo-router';
import { PillTabBar } from '@/src/components/PillTabBar';
import { useColors } from '@/src/theme/theme';

export default function TabLayout() {
  const c = useColors();
  return (
    <Tabs
      tabBar={(props) => <PillTabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: c.background },
        headerShadowVisible: false,
        headerTintColor: c.text,
        headerTitleStyle: { fontWeight: '700' },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Today', headerShown: false }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar' }} />
      <Tabs.Screen name="tasks" options={{ title: 'Tasks' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
