import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { Button } from '@/src/components/Button';
import { EmptyState } from '@/src/components/EmptyState';
import { TaskForm } from '@/src/components/TaskForm';
import { getTask } from '@/src/database/taskRepository';
import { deleteTask, updateTask } from '@/src/services/taskService';
import { space, useColors } from '@/src/theme/theme';
import type { Task, TaskInput } from '@/src/types/task';
import { showToast } from '@/src/utils/toast';

type Load = { state: 'loading' } | { state: 'missing' } | { state: 'error' } | { state: 'ready'; task: Task };

/** View, edit and delete a task. */
export default function EditTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const [load, setLoad] = useState<Load>({ state: 'loading' });

  useEffect(() => {
    getTask(id)
      .then((task) => setLoad(task ? { state: 'ready', task } : { state: 'missing' }))
      .catch(() => setLoad({ state: 'error' }));
  }, [id]);

  if (load.state === 'loading') {
    return <ActivityIndicator style={[styles.center, { backgroundColor: c.background }]} color={c.primary} />;
  }
  if (load.state !== 'ready') {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <EmptyState
          icon="alert-circle"
          title={load.state === 'missing' ? 'This task no longer exists' : "Couldn't open this task"}
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  const { task } = load;

  const onSubmit = async (input: TaskInput) => {
    try {
      const { warning } = await updateTask(task, input);
      showToast(warning ?? 'Task updated');
      router.back();
    } catch {
      Alert.alert('Could not save', 'Something went wrong while saving your changes. Please try again.');
    }
  };

  const onDelete = () =>
    Alert.alert('Delete task?', `"${task.title}" will be removed permanently.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTask(task);
            showToast('Task deleted');
            router.back();
          } catch {
            Alert.alert('Could not delete', 'Something went wrong. Please try again.');
          }
        },
      },
    ]);

  return (
    <TaskForm
      initial={task}
      completed={task.completed}
      onSubmit={onSubmit}
      footer={
        <View style={styles.delete}>
          <Button label="Delete task" icon="trash-2" variant="danger" onPress={onDelete} />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', padding: space.xl },
  delete: { marginTop: space.xl },
});
