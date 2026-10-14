import { router, Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Icon } from '@/src/components/Icon';
import { PillTabBar } from '@/src/components/PillTabBar';
import { radius, space, useColors } from '@/src/theme/theme';

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
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/export')}
              style={({ pressed }) => [styles.exportButton, { backgroundColor: c.primary, opacity: pressed ? 0.85 : 1 }]}
              android_ripple={{ color: c.primarySoft }}
              accessibilityRole="button"
              accessibilityLabel="Export tasks to Excel">
              <Icon name="download" size={20} color={c.onPrimary} />
              <Text style={[styles.exportLabel, { color: c.onPrimary }]}>Export</Text>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    height: 44,
    paddingHorizontal: space.lg,
    marginRight: space.lg,
    borderRadius: radius.pill,
    overflow: 'hidden',
    elevation: 2,
  },
  exportLabel: { fontSize: 15, fontWeight: '700' },
});
