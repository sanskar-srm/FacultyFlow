import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/src/components/Button';
import { SegmentedControl } from '@/src/components/Controls';
import { DatePickerSheet } from '@/src/components/DatePickerSheet';
import { Icon } from '@/src/components/Icon';
import { ListGroup, ListRow } from '@/src/components/ListGroup';
import { APP_NAME, type Option } from '@/src/constants/appConstants';
import { useApp } from '@/src/context/AppContext';
import { rangeFor, rangeLabel, shiftRange, type ExportRange, type RangeKind } from '@/src/export/exportRange';
import { countTasks, createExport } from '@/src/export/exportService';
import type { StatusFilter } from '@/src/export/taskSheet';
import { radius, space, type, TOUCH, useColors } from '@/src/theme/theme';
import { addDays, formatLongDate, todayString } from '@/src/utils/dateUtils';
import { showToast } from '@/src/utils/toast';

const KIND_OPTIONS: Option<RangeKind>[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'custom', label: 'Custom' },
];

const STATUS_OPTIONS: Option<StatusFilter>[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
];

const PERIOD_HINT: Record<Exclude<RangeKind, 'custom'>, string> = {
  day: 'Tasks scheduled on this day',
  week: 'Monday to Sunday',
  month: 'The whole calendar month',
};

type Picking = 'anchor' | 'from' | 'to' | null;

export default function ExportScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = useApp();
  const today = todayString();
  const [range, setRange] = useState<ExportRange>(() => rangeFor('month', today));
  const [status, setStatus] = useState<StatusFilter>('all');
  const [count, setCount] = useState<number | null>(null);
  const [picking, setPicking] = useState<Picking>(null);
  const [creating, setCreating] = useState(false);

  // Recount on every change and when coming back from the result screen.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setCount(null);
      countTasks(range, status)
        .then((n) => !cancelled && setCount(n))
        .catch(() => !cancelled && setCount(0));
      return () => {
        cancelled = true;
      };
    }, [range, status]),
  );

  const changeKind = (kind: RangeKind) => {
    if (kind === range.kind) return;
    // Keep the period in view: a custom range starts as the current week.
    setRange(kind === 'custom' ? rangeFor('custom', addDays(today, -6), today) : rangeFor(kind, today));
  };

  const pickDate = (date: string) => {
    if (picking === 'anchor') setRange(rangeFor(range.kind, date));
    if (picking === 'from') setRange(rangeFor('custom', date, range.end));
    if (picking === 'to') setRange(rangeFor('custom', range.start, date));
    setPicking(null);
  };

  const create = async () => {
    setCreating(true);
    try {
      await createExport(range, status, profile);
      router.push('/export-result');
    } catch {
      showToast("Couldn't create the Excel sheet. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const pickerValue = picking === 'to' ? range.end : range.start;
  const empty = count === 0;

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[type.body, styles.intro, { color: c.textMuted }]}>
          Choose which tasks to put in the Excel sheet. Every detail is included: date, time, title, description,
          category, priority, repeat, reminder and status.
        </Text>

        <Text style={[type.caption, styles.label, { color: c.textMuted }]}>PERIOD</Text>
        <SegmentedControl label="Period" options={KIND_OPTIONS} value={range.kind} onChange={changeKind} />

        {range.kind === 'custom' ? (
          <ListGroup>
            <ListRow icon="calendar" label="From" value={formatLongDate(range.start)} onPress={() => setPicking('from')} chevron />
            <ListRow icon="calendar" label="To" value={formatLongDate(range.end)} onPress={() => setPicking('to')} chevron />
          </ListGroup>
        ) : (
          <View style={[styles.stepper, { backgroundColor: c.surface, borderColor: c.border }]}>
            <StepButton icon="chevron-left" label="Previous" onPress={() => setRange(shiftRange(range, -1))} />
            <Pressable
              style={styles.stepLabel}
              onPress={() => setPicking('anchor')}
              accessibilityRole="button"
              accessibilityHint="Opens a calendar to pick another date">
              <Text style={[type.heading, { color: c.text }]} numberOfLines={1}>{rangeLabel(range)}</Text>
              <Text style={[type.caption, { color: c.textMuted }]}>{PERIOD_HINT[range.kind]}</Text>
            </Pressable>
            <StepButton icon="chevron-right" label="Next" onPress={() => setRange(shiftRange(range, 1))} />
          </View>
        )}

        <Text style={[type.caption, styles.label, { color: c.textMuted }]}>INCLUDE</Text>
        <SegmentedControl label="Include" options={STATUS_OPTIONS} value={status} onChange={setStatus} />

        <View style={[styles.count, { backgroundColor: empty ? c.warningSoft : c.primarySoft }]}>
          <Icon name={empty ? 'alert-circle' : 'file-text'} size={18} color={empty ? c.warning : c.primary} />
          <Text style={[type.body, styles.flex, { color: c.text }]} accessibilityLiveRegion="polite">
            {count === null
              ? 'Counting tasks…'
              : empty
                ? 'No tasks in this period. Try another period or include more tasks.'
                : `${count} ${count === 1 ? 'task' : 'tasks'} will be exported.`}
          </Text>
        </View>

        <Text style={[type.caption, styles.note, { color: c.textMuted }]}>
          {`The sheet is saved automatically to Download/${APP_NAME} on your phone. You can then share it to WhatsApp, Gmail or any other app.`}
        </Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: space.lg + insets.bottom, borderTopColor: c.border, backgroundColor: c.background }]}>
        <Button label="Create Excel sheet" icon="download" onPress={create} loading={creating} disabled={!count} />
      </View>

      <DatePickerSheet visible={picking !== null} value={pickerValue} onCancel={() => setPicking(null)} onDone={pickDate} />
    </View>
  );
}

function StepButton({ icon, label, onPress }: { icon: 'chevron-left' | 'chevron-right'; label: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={styles.stepButton}
      android_ripple={{ color: c.border, borderless: true }}
      accessibilityRole="button"
      accessibilityLabel={label}>
      <Icon name={icon} size={22} color={c.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, paddingBottom: space.xxl },
  intro: { marginBottom: space.sm },
  label: { marginTop: space.xl, marginBottom: space.sm, marginLeft: space.xs, letterSpacing: 0.6 },
  stepper: {
    marginTop: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: space.sm,
  },
  stepButton: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { flex: 1, alignItems: 'center', paddingVertical: space.xs, gap: 2 },
  count: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.md,
    marginTop: space.xl,
  },
  note: { marginTop: space.md, marginHorizontal: space.xs, fontWeight: '400' },
  footer: { paddingHorizontal: space.lg, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth },
});
