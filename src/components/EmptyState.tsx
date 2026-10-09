import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from '@/src/components/Icon';
import { space, type, useColors } from '@/src/theme/theme';

interface Props {
  title: string;
  message?: string;
  icon?: IconName;
  actionLabel?: string;
  onAction?: () => void;
}

/** Plain empty/error state: a small icon and a line or two of text. */
export function EmptyState({ title, message, icon, actionLabel, onAction }: Props) {
  const c = useColors();
  return (
    <View style={styles.wrap}>
      {icon ? (
        <View style={[styles.badge, { backgroundColor: c.surfaceAlt }]}>
          <Icon name={icon} size={20} color={c.textMuted} />
        </View>
      ) : null}
      <Text style={[type.heading, styles.center, { color: c.text }]}>{title}</Text>
      {message ? <Text style={[type.body, styles.center, styles.message, { color: c.textMuted }]}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={styles.action} accessibilityRole="button">
          <Text style={[type.heading, { color: c.primary }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: space.xl, alignItems: 'center' },
  badge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: space.md },
  center: { textAlign: 'center' },
  message: { marginTop: space.xs },
  action: { minHeight: 48, justifyContent: 'center', paddingHorizontal: space.md, marginTop: space.sm },
});
