import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { TaskForm } from '@/src/components/TaskForm';
import { createTask } from '@/src/services/taskService';
import type { TaskInput } from '@/src/types/task';
import { isValidDateString, nextRoundHour } from '@/src/utils/dateUtils';
import { showToast } from '@/src/utils/toast';

/** Add task. Opened from Today (defaults to the next round hour) or Calendar (`?date=`). */
export default function NewTaskScreen() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const [initial] = useState<TaskInput>(() => {
    const next = nextRoundHour();
    return {
      title: '',
      description: null,
      scheduledDate: date && isValidDateString(date) ? date : next.date,
      scheduledTime: next.time,
      priority: 'medium',
      category: 'other',
      reminderMinutes: null,
      repeatType: 'none',
    };
  });

  const onSubmit = async (input: TaskInput) => {
    try {
      const { warning } = await createTask(input);
      showToast(warning ?? 'Task added');
      router.back();
    } catch {
      Alert.alert('Could not save', 'Something went wrong while saving your task. Please try again.');
    }
  };

  return <TaskForm initial={initial} onSubmit={onSubmit} />;
}
