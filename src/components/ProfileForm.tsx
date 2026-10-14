import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/src/components/Button';
import { radius, space, type, useColors } from '@/src/theme/theme';
import type { Profile } from '@/src/types/task';

interface Props {
  initial?: Profile | null;
  intro?: string;
  submitLabel: string;
  onSubmit: (profile: Profile) => Promise<void>;
}

export function ProfileForm({ initial, intro, submitLabel, onSubmit }: Props) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(initial?.name ?? '');
  const [designation, setDesignation] = useState(initial?.designation ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) return setError('Please enter your name.');
    if (!designation.trim()) return setError('Please enter your designation.');
    setError(null);
    setSaving(true);
    try {
      await onSubmit({ name: name.trim(), designation: designation.trim() });
    } catch {
      setError("Couldn't save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = [styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }];

  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding">
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={[styles.content, { paddingBottom: space.xxl + insets.bottom }]}
      keyboardShouldPersistTaps="handled">
      {intro ? <Text style={[type.body, styles.intro, { color: c.textMuted }]}>{intro}</Text> : null}

      <Text style={[type.caption, styles.label, { color: c.textMuted }]}>YOUR NAME</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. Sanskar"
        placeholderTextColor={c.textFaint}
        autoFocus={!initial}
        autoCapitalize="words"
        maxLength={60}
        style={inputStyle}
        accessibilityLabel="Your name"
      />

      <Text style={[type.caption, styles.label, { color: c.textMuted }]}>DESIGNATION</Text>
      <TextInput
        value={designation}
        onChangeText={setDesignation}
        placeholder="e.g. Assistant Professor"
        placeholderTextColor={c.textFaint}
        autoCapitalize="words"
        maxLength={40}
        returnKeyType="done"
        onSubmitEditing={submit}
        style={inputStyle}
        accessibilityLabel="Your designation"
      />

      {error ? <Text style={[type.body, styles.error, { color: c.danger }]}>{error}</Text> : null}

      <View style={styles.submit}>
        <Button label={submitLabel} onPress={submit} loading={saving} />
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, gap: space.xs },
  intro: { marginBottom: space.sm },
  label: { marginTop: space.xl, marginBottom: space.sm, letterSpacing: 0.6 },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.md, fontSize: 17, minHeight: 52 },
  error: { marginTop: space.md },
  submit: { marginTop: space.xxl },
});
