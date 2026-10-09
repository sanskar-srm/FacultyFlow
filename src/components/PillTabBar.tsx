// Floating pill-shaped bottom tab bar. Plain views, no animation: the active tab just gets a tint.
import type { BottomTabBarProps } from 'expo-router/tabs';
import { useEffect, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/src/components/Icon';
import { space, TOUCH, useColors } from '@/src/theme/theme';

const ICONS: Record<string, IconName> = {
  index: 'home',
  calendar: 'calendar',
  tasks: 'check-square',
  settings: 'settings',
};

const BAR_HEIGHT = 68;
const INSET = 6;

export function PillTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (keyboardOpen) return null;

  return (
    <View style={[styles.outer, { backgroundColor: c.background, paddingBottom: insets.bottom + space.md }]}>
      <View style={[styles.bar, { backgroundColor: c.tabBar, borderColor: c.tabBarBorder }]} accessibilityRole="tablist">
        {state.routes.map((route, index) => {
          const selected = state.index === index;
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!selected && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected }}
              style={[styles.tab, selected && { backgroundColor: c.tabActiveBg }]}>
              <Icon name={ICONS[route.name] ?? 'circle'} size={24} color={selected ? c.tabActive : c.tabIcon} />
              <Text
                maxFontSizeMultiplier={1.3}
                style={[styles.label, selected ? { color: c.tabActive, fontWeight: '700' } : { color: c.tabLabel }]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { paddingHorizontal: 14, paddingTop: space.sm },
  bar: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    borderWidth: 1,
    flexDirection: 'row',
    padding: INSET,
    elevation: 7,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  tab: {
    flex: 1,
    minHeight: TOUCH,
    borderRadius: (BAR_HEIGHT - INSET * 2) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: { fontSize: 12, fontWeight: '500' },
});
