import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '@/src/components/BottomSheet';
import { Button } from '@/src/components/Button';
import { MonthGrid } from '@/src/components/MonthGrid';
import { radius, space, type, useColors } from '@/src/theme/theme';
import { addDays, formatRelativeDate, parseLocal, todayString } from '@/src/utils/dateUtils';

interface Props {
  visible: boolean;
  /** Local "YYYY-MM-DD". */
  value: string;
  onCancel: () => void;
  onDone: (date: string) => void;
}

/** Themed date picker in the same bottom-sheet style as the time picker. */
export function DatePickerSheet(props: Props) {
  // Mounted only while open, so every opening starts fresh from `value`.
  return props.visible ? <DatePicker {...props} /> : null;
}

function DatePicker({ value, onCancel, onDone }: Props) {
  const c = useColors();
  const [draft, setDraft] = useState(value);
  const [month, setMonth] = useState(() => monthOf(value));
  const today = todayString();

  const pick = (date: string) => {
    setDraft(date);
    setMonth(monthOf(date));
  };

  const shift = (delta: number) =>
    setMonth(({ year, month: m }) => {
      const d = new Date(year, m + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const quick = [
    { label: 'Today', date: today },
    { label: 'Tomorrow', date: addDays(today, 1) },
    { label: 'In a week', date: addDays(today, 7) },
  ];

  return (
    <BottomSheet
      visible
      title="Select date"
      onClose={onCancel}
      footer={
        <>
          <View style={styles.flex}>
            <Button label="Cancel" variant="secondary" onPress={onCancel} />
          </View>
          <View style={styles.flex}>
            <Button label="Done" onPress={() => onDone(draft)} />
          </View>
        </>
      }>
      <Text style={[styles.big, { color: c.text }]} accessibilityLiveRegion="polite">
        {formatRelativeDate(draft)}
      </Text>
      <View style={styles.quick}>
        {quick.map((q) => (
          <Pressable
            key={q.label}
            onPress={() => pick(q.date)}
            accessibilityRole="button"
            style={[styles.preset, { backgroundColor: q.date === draft ? c.primarySoft : c.surfaceAlt }]}>
            <Text style={[type.caption, { color: q.date === draft ? c.primary : c.text }]}>{q.label}</Text>
          </Pressable>
        ))}
      </View>
      <MonthGrid
        year={month.year}
        month={month.month}
        today={today}
        selected={draft}
        onSelect={setDraft}
        onPrev={() => shift(-1)}
        onNext={() => shift(1)}
      />
    </BottomSheet>
  );
}

function monthOf(date: string) {
  const d = parseLocal(date);
  return { year: d.getFullYear(), month: d.getMonth() };
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  big: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: space.md },
  quick: { flexDirection: 'row', gap: space.sm, justifyContent: 'center', marginBottom: space.sm },
  preset: { minHeight: 40, paddingHorizontal: space.md, borderRadius: radius.pill, justifyContent: 'center' },
});
