import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '@/src/components/EmptyState';
import { Icon } from '@/src/components/Icon';
import { MonthGrid } from '@/src/components/MonthGrid';
import { TaskItem } from '@/src/components/TaskItem';
import { getDatesWithTasks, getTasksByDate } from '@/src/database/taskRepository';
import { useNow, useTaskQuery } from '@/src/hooks/useTasks';
import { radius, space, type, TOUCH, useColors } from '@/src/theme/theme';
import { formatLongDate, formatRelativeDate, monthRange, todayString } from '@/src/utils/dateUtils';

export default function CalendarScreen() {
  const c = useColors();
  const now = useNow();
  const today = todayString(now);
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(() => ({ year: now.getFullYear(), month: now.getMonth() }));

  // Only the visible month's dot dates and the selected day's tasks are loaded.
  const load = useCallback(async () => {
    const { start, end } = monthRange(month.year, month.month);
    const [dates, tasks] = await Promise.all([getDatesWithTasks(start, end), getTasksByDate(selected)]);
    return { dates, tasks };
  }, [month, selected]);
  const { data, error, reload } = useTaskQuery(load);

  const shiftMonth = (delta: number) =>
    setMonth(({ year, month: m }) => {
      const d = new Date(year, m + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.content}>
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <MonthGrid
          year={month.year}
          month={month.month}
          today={today}
          selected={selected}
          datesWithTasks={data?.dates ?? EMPTY}
          onSelect={setSelected}
          onPrev={() => shiftMonth(-1)}
          onNext={() => shiftMonth(1)}
        />
      </View>

      <View style={styles.dayHeader}>
        <View style={styles.flex}>
          <Text style={[type.heading, { color: c.text }]} accessibilityRole="header">
            {formatRelativeDate(selected, now)}
          </Text>
          <Text style={[type.caption, { color: c.textMuted }]}>{formatLongDate(selected)}</Text>
        </View>
        <Pressable
          onPress={() => router.push({ pathname: '/task/new', params: { date: selected } })}
          style={[styles.add, { backgroundColor: c.primarySoft }]}
          accessibilityRole="button"
          accessibilityLabel="Add task on this day">
          <Icon name="plus" size={18} color={c.primary} />
          <Text style={[type.body, { color: c.primary, fontWeight: '600' }]}>Add</Text>
        </Pressable>
      </View>

      {error ? (
        <EmptyState icon="alert-triangle" title="Couldn't load tasks" actionLabel="Retry" onAction={reload} />
      ) : data && data.tasks.length === 0 ? (
        <EmptyState icon="calendar" title="No tasks on this day" />
      ) : (
        data?.tasks.map((t) => <TaskItem key={t.id} task={t} now={now} />)
      )}
    </ScrollView>
  );
}

const EMPTY = new Set<string>();

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, paddingBottom: space.xxl },
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: space.sm },
  dayHeader: { flexDirection: 'row', alignItems: 'center', marginTop: space.xl, marginBottom: space.xs, gap: space.md },
  add: {
    minHeight: TOUCH - 4,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
});
