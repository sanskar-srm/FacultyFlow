import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/src/components/Icon';
import type { Option } from '@/src/constants/appConstants';
import { radius, space, type, useColors } from '@/src/theme/theme';

interface Props<T> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
}

/** A wrap of single-select chips. */
export function OptionChips<T>({ options, value, onChange, label }: Props<T>) {
  const c = useColors();
  return (
    <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.label}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected, checked: selected }}
            style={[
              styles.chip,
              {
                borderColor: selected ? c.primary : c.border,
                backgroundColor: selected ? c.primarySoft : c.surface,
              },
            ]}>
            {selected ? <Icon name="check" size={14} color={c.primary} /> : null}
            <Text style={[type.body, { color: selected ? c.primary : c.text, fontWeight: selected ? '600' : '400' }]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
});
