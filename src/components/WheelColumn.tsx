import { memo, useCallback, useEffect, useRef } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useColors } from '@/src/theme/theme';

export const WHEEL_ITEM = 44;
const VISIBLE = 5; // odd, so one row sits in the middle
const PAD = Math.floor(VISIBLE / 2) * WHEEL_ITEM;

interface Props {
  items: string[];
  index: number;
  onChange: (index: number) => void;
  label: string;
  width?: number;
}

/** A snapping scroll wheel. Plain FlatList, so it looks the same on every Android version. */
export const WheelColumn = memo(function WheelColumn({ items, index, onChange, label, width = 72 }: Props) {
  const c = useColors();
  const list = useRef<FlatList<string>>(null);
  const shown = useRef(index);

  // Follow outside changes (presets, switching minute steps) without fighting the user's scroll.
  useEffect(() => {
    if (shown.current !== index) {
      shown.current = index;
      list.current?.scrollToOffset({ offset: index * WHEEL_ITEM, animated: true });
    }
  }, [index]);

  const settle = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const i = Math.max(0, Math.min(items.length - 1, Math.round(e.nativeEvent.contentOffset.y / WHEEL_ITEM)));
      if (i !== shown.current) {
        shown.current = i;
        onChange(i);
      }
    },
    [items.length, onChange],
  );

  const select = (i: number) => {
    shown.current = i;
    list.current?.scrollToOffset({ offset: i * WHEEL_ITEM, animated: true });
    onChange(i);
  };

  return (
    <View
      style={{ width, height: WHEEL_ITEM * VISIBLE }}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: items[index] }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const next = index + (e.nativeEvent.actionName === 'increment' ? 1 : -1);
        if (next >= 0 && next < items.length) select(next);
      }}>
      <View
        pointerEvents="none"
        style={[styles.band, { top: PAD, backgroundColor: c.primarySoft }]}
      />
      <FlatList
        ref={list}
        data={items}
        keyExtractor={(item) => item}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM}
        decelerationRate="fast"
        nestedScrollEnabled
        overScrollMode="never"
        contentContainerStyle={{ paddingVertical: PAD }}
        getItemLayout={(_, i) => ({ length: WHEEL_ITEM, offset: WHEEL_ITEM * i, index: i })}
        initialScrollIndex={index}
        onMomentumScrollEnd={settle}
        onScrollEndDrag={(e) => {
          // A slow release without a fling produces no momentum event.
          if (Math.abs(e.nativeEvent.velocity?.y ?? 0) < 0.05) settle(e);
        }}
        renderItem={({ item, index: i }) => (
          <Pressable style={styles.item} onPress={() => select(i)} importantForAccessibility="no">
            <Text
              style={[
                styles.text,
                i === index ? { color: c.primary, fontWeight: '700' } : { color: c.textMuted },
              ]}>
              {item}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  band: { position: 'absolute', left: 0, right: 0, height: WHEEL_ITEM, borderRadius: 10 },
  item: { height: WHEEL_ITEM, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 20, fontVariant: ['tabular-nums'] },
});
