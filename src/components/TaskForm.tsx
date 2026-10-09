import { useHeaderHeight } from 'expo-router/react-navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/src/components/Button';
import { SegmentedControl } from '@/src/components/Controls';
import { DatePickerSheet } from '@/src/components/DatePickerSheet';
import { Icon } from '@/src/components/Icon';
import { ListGroup, ListRow, SwitchRow } from '@/src/components/ListGroup';
import { OptionSheet } from '@/src/components/OptionSheet';
import { TimePickerSheet } from '@/src/components/TimePickerSheet';
import {
  CATEGORY_OPTIONS,
  DEFAULT_REMINDER_MINUTES,
  PRIORITY_OPTIONS,
  REMINDER_OPTIONS,
  REPEAT_OPTIONS,
  labelFor,
} from '@/src/constants/appConstants';
import { useApp } from '@/src/context/AppContext';
import { radius, space, type, useColors } from '@/src/theme/theme';
import type { TaskInput } from '@/src/types/task';
import {
  formatLongDate,
  formatRelativeDate,
  formatTime12,
  isValidDateString,
  isValidTimeString,
  nextRoundHour,
} from '@/src/utils/dateUtils';
import { needsReminder, validateTask, type TaskErrors } from '@/src/utils/taskUtils';

interface Props {
  initial: TaskInput;
  /** Whether the task is completed (completed tasks get no reminder). */
  completed?: boolean;
  onSubmit: (input: TaskInput) => Promise<void>;
  /** Extra controls at the end of the form, e.g. Delete. */
  footer?: ReactNode;
}

type Sheet = 'date' | 'time' | 'reminder' | 'repeat' | 'category' | null;

export function TaskForm({ initial, completed = false, onSubmit, footer }: Props) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { remindersEnabled, reminderStyle } = useApp();
  const [input, setInput] = useState<TaskInput>(initial);
  const [errors, setErrors] = useState<TaskErrors>({});
  const [saving, setSaving] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  // The timing to restore when Remind me is switched back on.
  const [lastMinutes, setLastMinutes] = useState(initial.reminderMinutes ?? DEFAULT_REMINDER_MINUTES);
  const remind = input.reminderMinutes !== null;

  // With the keyboard up, the Save bar sits on the keyboard, not above the navigation bar.
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const set = <K extends keyof TaskInput>(key: K, value: TaskInput[K]) => {
    setInput((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key === 'scheduledDate' ? 'date' : key === 'scheduledTime' ? 'time' : key]: undefined }));
  };

  const save = async () => {
    const found = validateTask(input);
    setErrors(found);
    if (Object.keys(found).length > 0 || saving) return;
    setSaving(true);
    try {
      await onSubmit(input);
    } finally {
      setSaving(false);
    }
  };

  const dateValid = isValidDateString(input.scheduledDate);
  const timeValid = isValidTimeString(input.scheduledTime);
  let reminderHint: string | null = null;
  if (input.reminderMinutes !== null && dateValid && timeValid && !completed) {
    if (!remindersEnabled) reminderHint = 'Task Reminders are turned off in Settings.';
    else if (!needsReminder({ ...input, completed })) reminderHint = 'This reminder time has already passed, so no reminder will be sent.';
  }
  const fallback = nextRoundHour();

  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={headerHeight}>
      <ScrollView
        style={[styles.flex, { backgroundColor: c.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: errors.title ? c.danger : c.border }]}>
          <TextInput
            value={input.title}
            onChangeText={(t) => set('title', t)}
            placeholder="What needs to be done?"
            placeholderTextColor={c.textFaint}
            autoFocus={!initial.title}
            returnKeyType="done"
            maxLength={200}
            style={[styles.title, { color: c.text }]}
            accessibilityLabel="Task title"
          />
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          <TextInput
            value={input.description ?? ''}
            onChangeText={(t) => set('description', t)}
            placeholder="Notes (optional)"
            placeholderTextColor={c.textFaint}
            multiline
            maxLength={2000}
            style={[type.body, styles.notes, { color: c.text }]}
            accessibilityLabel="Notes"
          />
        </View>
        <ErrorText text={errors.title} />

        <ListGroup title="When">
          <ListRow
            icon="calendar"
            label="Date"
            value={dateValid ? formatRelativeDate(input.scheduledDate) : 'Pick a date'}
            detail={dateValid ? formatLongDate(input.scheduledDate) : undefined}
            onPress={() => setSheet('date')}
            chevron
          />
          <ListRow
            icon="clock"
            label="Time"
            value={timeValid ? formatTime12(input.scheduledTime) : 'Pick a time'}
            onPress={() => setSheet('time')}
            chevron
          />
          <ListRow
            icon="repeat"
            label="Repeat"
            value={labelFor(REPEAT_OPTIONS, input.repeatType)}
            onPress={() => setSheet('repeat')}
            chevron
          />
        </ListGroup>
        <ErrorText text={errors.date ?? errors.time} />

        <ListGroup title="Reminder">
          <SwitchRow
            icon="bell"
            label="Remind me"
            detail={remind ? undefined : 'Saved as a note, no reminder'}
            value={remind}
            onChange={(on) => set('reminderMinutes', on ? lastMinutes : null)}
          />
          {input.reminderMinutes !== null ? (
            <ListRow
              icon={reminderStyle === 'alarm' ? 'alert-circle' : 'clock'}
              label="When"
              detail={remindersEnabled ? (reminderStyle === 'alarm' ? 'As an alarm alert' : 'As a notification') : undefined}
              value={labelFor(REMINDER_OPTIONS, input.reminderMinutes)}
              onPress={() => setSheet('reminder')}
              chevron
            />
          ) : null}
        </ListGroup>
        {reminderHint ? (
          <View style={[styles.hint, { backgroundColor: c.warningSoft }]}>
            <Icon name="info" size={16} color={c.warning} />
            <Text style={[type.caption, styles.flex, { color: c.warning }]}>{reminderHint}</Text>
          </View>
        ) : null}

        <ListGroup title="Details">
          <View style={styles.segmentRow}>
            <View style={styles.segmentLabel}>
              <Icon name="flag" size={20} color={c.textMuted} />
              <Text style={[type.body, { color: c.text, fontWeight: '500' }]}>Priority</Text>
            </View>
            <SegmentedControl
              label="Priority"
              options={PRIORITY_OPTIONS}
              value={input.priority}
              onChange={(v) => set('priority', v)}
            />
          </View>
          <ListRow
            icon={CATEGORY_OPTIONS.find((o) => o.value === input.category)?.icon ?? 'tag'}
            label="Category"
            value={labelFor(CATEGORY_OPTIONS, input.category)}
            onPress={() => setSheet('category')}
            chevron
          />
        </ListGroup>

        {footer}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: space.md + (keyboardOpen ? 0 : insets.bottom), borderTopColor: c.border, backgroundColor: c.surface }]}>
        <Button label="Save" icon="check" onPress={save} loading={saving} />
      </View>

      <DatePickerSheet
        visible={sheet === 'date'}
        value={dateValid ? input.scheduledDate : fallback.date}
        onCancel={() => setSheet(null)}
        onDone={(d) => {
          set('scheduledDate', d);
          setSheet(null);
        }}
      />
      <TimePickerSheet
        visible={sheet === 'time'}
        value={timeValid ? input.scheduledTime : fallback.time}
        onCancel={() => setSheet(null)}
        onDone={(t, d) => {
          set('scheduledTime', t);
          if (d) set('scheduledDate', d);
          setSheet(null);
        }}
      />
      <OptionSheet
        visible={sheet === 'reminder'}
        title="Remind me"
        options={REMINDER_OPTIONS}
        value={input.reminderMinutes ?? lastMinutes}
        onSelect={(v) => {
          setLastMinutes(v);
          set('reminderMinutes', v);
        }}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === 'repeat'}
        title="Repeat"
        options={REPEAT_OPTIONS}
        value={input.repeatType}
        onSelect={(v) => set('repeatType', v)}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === 'category'}
        title="Category"
        options={CATEGORY_OPTIONS}
        value={input.category}
        onSelect={(v) => set('category', v)}
        onClose={() => setSheet(null)}
      />
    </KeyboardAvoidingView>
  );
}

function ErrorText({ text }: { text?: string }) {
  const c = useColors();
  return text ? <Text style={[type.caption, styles.error, { color: c.danger }]}>{text}</Text> : null;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, paddingBottom: space.xxl },
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: space.lg },
  title: { fontSize: 18, fontWeight: '600', minHeight: 56, paddingVertical: space.md },
  divider: { height: StyleSheet.hairlineWidth },
  notes: { minHeight: 56, paddingVertical: space.md, textAlignVertical: 'top' },
  error: { marginTop: space.sm, marginLeft: space.xs },
  hint: {
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'center',
    borderRadius: radius.md,
    padding: space.md,
    marginTop: space.sm,
  },
  segmentRow: { padding: space.lg, gap: space.md },
  segmentLabel: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  footer: { paddingHorizontal: space.lg, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth },
});
