import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '@/src/components/BottomSheet';
import { Button } from '@/src/components/Button';
import { radius, space, type, TOUCH, useColors } from '@/src/theme/theme';
import {
  addDays,
  formatTime12,
  from12Hour,
  timeFromNow,
  toTimeString,
  to12Hour,
  todayString,
  type Period,
} from '@/src/utils/dateUtils';
import { WheelColumn } from './WheelColumn';

interface Props {
  visible: boolean;
  /** Local 24-hour "HH:mm". */
  value: string;
  onCancel: () => void;
  /** `date` is set only when a preset ("Now + 1 hr") also decides the day. */
  onDone: (time: string, date?: string) => void;
}

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES_5 = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
const MINUTES_1 = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const PERIODS: Period[] = ['AM', 'PM'];

const PRESETS: { label: string; time: string | null }[] = [
  { label: 'Now + 1 hr', time: null },
  { label: '9:00 AM', time: '09:00' },
  { label: '12:00 PM', time: '12:00' },
  { label: '4:00 PM', time: '16:00' },
];

/** Themed bottom-sheet time picker: hour / minute / AM-PM wheels plus quick presets. */
export function TimePickerSheet(props: Props) {
  // Mounted only while open, so every opening starts fresh from `value`.
  return props.visible ? <TimePicker {...props} /> : null;
}

function TimePicker({ value, onCancel, onDone }: Props) {
  const c = useColors();
  const [draft, setDraft] = useState(value);
  const [fine, setFine] = useState(() => to12Hour(value).minute % 5 !== 0);
  const [presetDate, setPresetDate] = useState<{ time: string; date: string } | null>(null);

  const { hour, minute, period } = to12Hour(draft);
  const minutes = fine ? MINUTES_1 : MINUTES_5;
  const minuteIndex = fine ? minute : Math.round(minute / 5) % 12;

  const update = useCallback((h: number, m: number, p: Period) => setDraft(from12Hour(h, m, p)), []);

  const onHour = useCallback((i: number) => setDraft((d) => {
    const t = to12Hour(d);
    return from12Hour(i + 1, t.minute, t.period);
  }), []);
  const onMinute = useCallback((i: number) => setDraft((d) => {
    const t = to12Hour(d);
    return from12Hour(t.hour, fine ? i : i * 5, t.period);
  }), [fine]);
  const onPeriod = useCallback((i: number) => setDraft((d) => {
    const t = to12Hour(d);
    return from12Hour(t.hour, t.minute, PERIODS[i]);
  }), []);

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    if (preset.time) {
      setPresetDate(null);
      const t = to12Hour(preset.time);
      update(t.hour, t.minute, t.period);
      return;
    }
    const now = new Date();
    const time = timeFromNow(60, now);
    // Past midnight the preset means tomorrow.
    const date = time < toTimeString(now) ? addDays(todayString(now), 1) : todayString(now);
    setPresetDate({ time, date });
    setDraft(time);
    if (to12Hour(time).minute % 5 !== 0) setFine(true);
  };

  const toggleFine = () => {
    if (fine) {
      // Back to 5-minute steps: snap the draft so the wheel can show it.
      update(hour, (Math.round(minute / 5) % 12) * 5, period);
    }
    setFine(!fine);
  };

  return (
    <BottomSheet
      visible
      title="Select time"
      onClose={onCancel}
      footer={
        <>
          <View style={styles.flex}>
            <Button label="Cancel" variant="secondary" onPress={onCancel} />
          </View>
          <View style={styles.flex}>
            <Button
              label="Done"
              onPress={() => onDone(draft, presetDate?.time === draft ? presetDate.date : undefined)}
            />
          </View>
        </>
      }>
      <Text style={[styles.big, { color: c.text }]} accessibilityLiveRegion="polite">
        {formatTime12(draft)}
      </Text>

      <View style={styles.presets}>
        {PRESETS.map((p) => (
          <Pressable
            key={p.label}
            onPress={() => applyPreset(p)}
            accessibilityRole="button"
            style={[styles.preset, { backgroundColor: c.surfaceAlt }]}>
            <Text style={[type.caption, { color: c.text }]}>{p.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.wheels}>
        <WheelColumn label="Hour" items={HOURS} index={hour - 1} onChange={onHour} />
        <Text style={[styles.colon, { color: c.textMuted }]}>:</Text>
        <WheelColumn key={fine ? 'fine' : 'coarse'} label="Minute" items={minutes} index={minuteIndex} onChange={onMinute} />
        <WheelColumn label="AM or PM" items={PERIODS} index={period === 'AM' ? 0 : 1} onChange={onPeriod} />
      </View>

      <Pressable onPress={toggleFine} style={styles.fine} accessibilityRole="switch" accessibilityState={{ checked: fine }}>
        <Text style={[type.body, { color: c.primary, fontWeight: '600' }]}>
          {fine ? 'Use 5-minute steps' : 'Pick an exact minute'}
        </Text>
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  big: { fontSize: 40, fontWeight: '700', textAlign: 'center', fontVariant: ['tabular-nums'], marginBottom: space.md },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'center', marginBottom: space.md },
  preset: { minHeight: 40, paddingHorizontal: space.md, borderRadius: radius.pill, justifyContent: 'center' },
  wheels: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: space.sm },
  colon: { fontSize: 22, fontWeight: '700' },
  fine: { minHeight: TOUCH, alignItems: 'center', justifyContent: 'center', marginTop: space.xs },
});
