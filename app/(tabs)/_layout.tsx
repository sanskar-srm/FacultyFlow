import { router, Tabs } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { Icon } from '@/src/components/Icon';
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
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/export')}
              style={styles.headerButton}
              android_ripple={{ color: c.border, borderless: true }}
              accessibilityRole="button"
              accessibilityLabel="Export tasks to Excel">
              <Icon name="download" size={22} color={c.text} />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
});
