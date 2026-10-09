import { SectionList, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '@/src/components/EmptyState';
import type { IconName } from '@/src/components/Icon';
import { TaskItem } from '@/src/components/TaskItem';
import { getCompletedTasks, getOverdueTasks, getUpcomingTasks } from '@/src/database/taskRepository';
import { useNow, useTaskQuery } from '@/src/hooks/useTasks';
import { space, type, useColors } from '@/src/theme/theme';
import type { Task } from '@/src/types/task';

async function loadTasks() {
  const now = new Date();
  const [overdue, upcoming, completed] = await Promise.all([
    getOverdueTasks(now),
    getUpcomingTasks(now),
    getCompletedTasks(),
  ]);
  // Overdue tasks come first, then today's remaining and future tasks in time order.
  return { active: [...overdue, ...upcoming], completed };
}

export default function TasksScreen() {
  const c = useColors();
  const now = useNow();
  const { data, error, reload } = useTaskQuery(loadTasks);

  if (error) {
    return (
      <View style={[styles.flex, { backgroundColor: c.background }]}>
        <EmptyState icon="alert-triangle" title="Couldn't load your tasks" message="Please try again." actionLabel="Retry" onAction={reload} />
      </View>
    );
  }
  if (!data) return <View style={[styles.flex, { backgroundColor: c.background }]} />;

  const sections: { title: string; empty: string; icon: IconName; data: Task[] }[] = [
    { title: 'Active', empty: 'No active tasks', icon: 'inbox', data: data.active },
    { title: 'Completed', empty: 'No completed tasks yet', icon: 'check-circle', data: data.completed },
  ];

  return (
    <SectionList
      style={{ backgroundColor: c.background }}
      contentContainerStyle={styles.content}
      sections={sections}
      keyExtractor={(t) => t.id}
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => (
        <Text style={[type.caption, styles.section, { color: c.textMuted }]} accessibilityRole="header">
          {`${section.title} (${section.data.length})`.toUpperCase()}
        </Text>
      )}
      renderItem={({ item }) => <TaskItem task={item} now={now} showDate />}
      renderSectionFooter={({ section }) =>
        section.data.length === 0 ? <EmptyState icon={section.icon} title={section.empty} /> : null
      }
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, paddingBottom: space.xxl },
  section: { marginTop: space.md, marginLeft: space.xs, letterSpacing: 0.6 },
});
