import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { Icon, type IconName } from '@/src/components/Icon';
import { radius, space, useColors } from '@/src/theme/theme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
}

export function Button({ label, onPress, variant = 'primary', icon, loading = false, disabled = false }: Props) {
  const c = useColors();
  const fg = variant === 'primary' ? c.onPrimary : variant === 'danger' ? c.danger : c.text;
  const bg = variant === 'primary' ? c.primary : variant === 'danger' ? c.dangerSoft : c.surfaceAlt;
  return (
    <Pressable
      onPress={onPress}
      disabled={loading || disabled}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled }}
      android_ripple={{ color: c.border }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={18} color={fg} /> : null}
          <Text style={[styles.label, { color: fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    overflow: 'hidden',
  },
  label: { fontSize: 16, fontWeight: '600' },
});
