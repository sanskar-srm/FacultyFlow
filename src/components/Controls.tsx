// Small building blocks: segmented control, chip, round checkbox and progress bar.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from '@/src/components/Icon';
import type { Option } from '@/src/constants/appConstants';
import { radius, space, type, TOUCH, useColors } from '@/src/theme/theme';

export function SegmentedControl<T>({ options, value, onChange, label }: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
}) {
  const c = useColors();
  return (
    <View
      style={[styles.segments, { backgroundColor: c.surfaceAlt }]}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.label}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected, checked: selected }}
            style={[styles.segment, selected && [styles.segmentOn, { backgroundColor: c.surface, borderColor: c.border }]]}>
            <Text style={[type.body, { color: selected ? c.text : c.textMuted, fontWeight: selected ? '600' : '500' }]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export type Tone = 'neutral' | 'danger' | 'warning' | 'success' | 'accent';

export function useTone(tone: Tone) {
  const c = useColors();
  return {
    neutral: { fg: c.textMuted, bg: c.surfaceAlt },
    danger: { fg: c.danger, bg: c.dangerSoft },
    warning: { fg: c.warning, bg: c.warningSoft },
    success: { fg: c.success, bg: c.successSoft },
    accent: { fg: c.primary, bg: c.primarySoft },
  }[tone];
}

export function Chip({ icon, label, tone = 'neutral' }: { icon?: IconName; label: string; tone?: Tone }) {
  const t = useTone(tone);
  return (
    <View style={[styles.chip, { backgroundColor: t.bg }]}>
      {icon ? <Icon name={icon} size={12} color={t.fg} /> : null}
      <Text style={[type.caption, { color: t.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Round checkbox with a 48dp touch target. */
export function Checkbox({ checked, onPress, label, busy }: {
  checked: boolean;
  onPress: () => void;
  label: string;
  busy?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={styles.checkHit}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, busy }}
      accessibilityLabel={label}>
      <View
        style={[
          styles.check,
          { borderColor: checked ? c.success : c.textFaint, backgroundColor: checked ? c.success : 'transparent' },
        ]}>
        {checked ? <Icon name="check" size={15} color={c.surface} /> : null}
      </View>
    </Pressable>
  );
}

export function ProgressBar({ done, total }: { done: number; total: number }) {
  const c = useColors();
  const pct = total > 0 ? Math.min(1, done / total) : 0;
  return (
    <View
      style={[styles.track, { backgroundColor: c.surfaceAlt }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: done }}>
      <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: c.primary }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  segments: { flexDirection: 'row', borderRadius: radius.md, padding: 3 },
  segment: {
    flex: 1,
    minHeight: TOUCH - 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm + 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  segmentOn: { elevation: 1 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    maxWidth: 160,
  },
  checkHit: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
});
