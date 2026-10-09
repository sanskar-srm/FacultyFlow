import { router } from 'expo-router';
import { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Checkbox, Chip, type Tone } from '@/src/components/Controls';
import { Icon } from '@/src/components/Icon';
import { CATEGORY_OPTIONS, PRIORITY_OPTIONS } from '@/src/constants/appConstants';
import { toggleComplete } from '@/src/services/taskService';
import { radius, space, type, useColors } from '@/src/theme/theme';
import type { Priority, Task } from '@/src/types/task';
import { formatRelativeDate, formatTime12 } from '@/src/utils/dateUtils';
import { isOverdue } from '@/src/utils/taskUtils';
import { showToast } from '@/src/utils/toast';

interface Props {
  task: Task;
  now: Date;
  /** Show the date as well as the time (lists that span several days). */
  showDate?: boolean;
}

const PRIORITY_TONE: Record<Priority, Tone> = { high: 'danger', medium: 'warning', low: 'neutral' };

export const TaskItem = memo(function TaskItem({ task, now, showDate = false }: Props) {
  const c = useColors();
  const [busy, setBusy] = useState(false);
  const overdue = isOverdue(task, now);
  const category = CATEGORY_OPTIONS.find((o) => o.value === task.category);
  const priority = PRIORITY_OPTIONS.find((o) => o.value === task.priority);

  const onToggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { nextDate } = await toggleComplete(task);
      if (nextDate) showToast(`Done. Next: ${formatRelativeDate(nextDate)}`);
    } catch {
      showToast("Couldn't update the task. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const when = showDate
    ? `${formatRelativeDate(task.scheduledDate, now)}, ${formatTime12(task.scheduledTime)}`
    : formatTime12(task.scheduledTime);
  const muted = task.completed ? c.textFaint : c.textMuted;

  return (
    <View style={[styles.row, { backgroundColor: c.surface, borderColor: overdue ? c.dangerSoft : c.border }]}>
      <Checkbox
        checked={task.completed}
        busy={busy}
        onPress={onToggle}
        label={`Mark ${task.title} as ${task.completed ? 'not done' : 'done'}`}
      />
      <Pressable
        style={styles.body}
        onPress={() => router.push({ pathname: '/task/[id]', params: { id: task.id } })}
        accessibilityRole="button"
        accessibilityHint="Opens the task to edit">
        <Text
          style={[type.heading, { color: task.completed ? c.textFaint : c.text }, task.completed && styles.done]}
          numberOfLines={2}>
          {task.title}
        </Text>
        <View style={styles.whenRow}>
          <Icon name="clock" size={13} color={overdue ? c.danger : muted} />
          <Text style={[type.caption, { color: overdue ? c.danger : muted }]}>{when}</Text>
          {task.reminderMinutes !== null && !task.completed ? (
            <Icon name="bell" size={13} color={muted} />
          ) : null}
          {overdue ? <Text style={[type.caption, styles.overdue, { color: c.danger }]}>Overdue</Text> : null}
          {task.repeatType !== 'none' ? <Icon name="repeat" size={13} color={muted} /> : null}
        </View>
        {!task.completed ? (
          <View style={styles.chips}>
            {priority ? <Chip icon="flag" label={priority.label} tone={PRIORITY_TONE[task.priority]} /> : null}
            {category ? <Chip icon={category.icon} label={category.label} /> : null}
          </View>
        ) : null}
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: space.xs,
    paddingRight: space.md,
    marginTop: space.sm,
  },
  body: { flex: 1, minHeight: 48, paddingVertical: space.sm + 2 },
  done: { textDecorationLine: 'line-through' },
  whenRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, marginTop: space.xs },
  overdue: { fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs + 2, marginTop: space.sm },
});
