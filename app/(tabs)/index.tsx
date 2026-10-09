import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProgressBar } from '@/src/components/Controls';
import { EmptyState } from '@/src/components/EmptyState';
import { Icon } from '@/src/components/Icon';
import { TaskItem } from '@/src/components/TaskItem';
import { useApp } from '@/src/context/AppContext';
import { getOverdueTasks, getTodayTasks } from '@/src/database/taskRepository';
import { useNow, useTaskQuery } from '@/src/hooks/useTasks';
import { radius, space, type, useColors } from '@/src/theme/theme';
import { formatLongDate, todayString, weekdayName } from '@/src/utils/dateUtils';
import { greeting } from '@/src/utils/greeting';

async function loadToday() {
  const now = new Date();
  const today = todayString(now);
  const [todayTasks, overdue] = await Promise.all([getTodayTasks(now), getOverdueTasks(now)]);
  // Today's own overdue tasks already appear in the Today list.
  return { todayTasks, earlierOverdue: overdue.filter((t) => t.scheduledDate < today) };
}

export default function TodayScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = useApp();
  const now = useNow();
  const today = todayString(now);
  const { data, error, reload } = useTaskQuery(loadToday);

  // Reload when the date rolls over while the screen is open.
  const lastDay = useRef(today);
  useEffect(() => {
    if (lastDay.current !== today) {
      lastDay.current = today;
      reload();
    }
  }, [today, reload]);

  const total = data?.todayTasks.length ?? 0;
  const done = data?.todayTasks.filter((t) => t.completed).length ?? 0;
  const left = total - done;

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + space.lg }]}>
        <Text style={[type.caption, { color: c.textMuted }]}>
          {`${weekdayName(today)}, ${formatLongDate(today)}`.toUpperCase()}
        </Text>
        <Text style={[type.title, styles.greeting, { color: c.text }]} accessibilityRole="header">
          {greeting(profile, now)}
        </Text>

        {error ? (
          <EmptyState icon="alert-triangle" title="Couldn't load your tasks" message="Please try again." actionLabel="Retry" onAction={reload} />
        ) : data ? (
          <>
            <View style={[styles.summary, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={styles.summaryRow}>
                {left > 0 ? (
                  <Text style={[type.heading, { color: c.text }]}>
                    {left} {left === 1 ? 'task' : 'tasks'} left today
                  </Text>
                ) : (
                  <View style={styles.caughtUp}>
                    <Icon name="check-circle" size={18} color={c.success} />
                    <Text style={[type.heading, { color: c.text }]}>You&apos;re all caught up</Text>
                  </View>
                )}
                <Text style={[type.caption, { color: c.textMuted }]}>
                  {done} of {total} done
                </Text>
              </View>
              <ProgressBar done={done} total={total} />
            </View>

            {data.earlierOverdue.length > 0 && (
              <>
                <SectionTitle text="Overdue" color={c.danger} />
                {data.earlierOverdue.map((t) => (
                  <TaskItem key={t.id} task={t} now={now} showDate />
                ))}
              </>
            )}

            <SectionTitle text="Today" color={c.textMuted} />
            {data.todayTasks.length === 0 ? (
              <EmptyState icon="sun" title="No tasks scheduled for today" message="Tap Add task to plan something." />
            ) : (
              data.todayTasks.map((t) => <TaskItem key={t.id} task={t} now={now} />)
            )}
          </>
        ) : null}
      </ScrollView>
      {/* Keeps scrolled content from running under the status bar (the app is edge-to-edge). */}
      <View style={[styles.statusBar, { height: insets.top, backgroundColor: c.background }]} />

      <Pressable
        onPress={() => router.push('/task/new')}
        android_ripple={{ color: c.onPrimary, borderless: false }}
        style={({ pressed }) => [styles.fab, { backgroundColor: c.primary, opacity: pressed ? 0.9 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel="Add task">
        <Icon name="plus" size={22} color={c.onPrimary} />
        <Text style={[styles.fabText, { color: c.onPrimary }]}>Add task</Text>
      </Pressable>
    </View>
  );
}

function SectionTitle({ text, color }: { text: string; color: string }) {
  return (
    <Text style={[type.caption, styles.section, { color }]} accessibilityRole="header">
      {text.toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  statusBar: { position: 'absolute', top: 0, left: 0, right: 0 },
  content: { paddingHorizontal: space.lg, paddingBottom: 110 },
  greeting: { marginTop: space.xs },
  summary: { marginTop: space.lg, padding: space.lg, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, gap: space.md },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  caughtUp: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  section: { marginTop: space.xl, marginLeft: space.xs, letterSpacing: 0.6 },
  fab: {
    position: 'absolute',
    right: space.lg,
    bottom: space.lg,
    minHeight: 56,
    paddingHorizontal: space.xl - 4,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    elevation: 3,
    overflow: 'hidden',
  },
  fabText: { fontSize: 16, fontWeight: '600' },
});
