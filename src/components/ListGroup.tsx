// Grouped list rows used by Settings and the task form: a titled card of rows with icons.
import { Children, Fragment, type ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Icon, type IconName } from '@/src/components/Icon';
import { radius, space, type, TOUCH, useColors } from '@/src/theme/theme';

export function ListGroup({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  const c = useColors();
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.group}>
      {title ? (
        <Text style={[type.caption, styles.groupTitle, { color: c.textMuted }]} accessibilityRole="header">
          {title.toUpperCase()}
        </Text>
      ) : null}
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        {rows.map((row, i) => (
          <Fragment key={i}>
            {i > 0 ? <View style={[styles.divider, { backgroundColor: c.border }]} /> : null}
            {row}
          </Fragment>
        ))}
      </View>
      {footer ? <Text style={[type.caption, styles.footer, { color: c.textMuted }]}>{footer}</Text> : null}
    </View>
  );
}

interface RowProps {
  icon?: IconName;
  iconColor?: string;
  label: string;
  /** Secondary line under the label. */
  detail?: string;
  detailColor?: string;
  /** Value shown on the right. */
  value?: string;
  onPress?: () => void;
  /** Custom right-hand element (switch, radio, ...). */
  right?: ReactNode;
  chevron?: boolean;
  disabled?: boolean;
  accessibilityRole?: 'button' | 'radio' | 'switch';
  accessibilityState?: { checked?: boolean; selected?: boolean; disabled?: boolean };
}

export function ListRow(props: RowProps) {
  const { icon, iconColor, label, detail, detailColor, value, onPress, right, chevron, disabled } = props;
  const c = useColors();
  const body = (
    <>
      {icon ? (
        <View style={styles.iconWrap}>
          <Icon name={icon} size={20} color={iconColor ?? c.textMuted} />
        </View>
      ) : null}
      <View style={styles.text}>
        <Text style={[type.body, styles.label, { color: c.text }]}>{label}</Text>
        {detail ? <Text style={[type.caption, styles.detail, { color: detailColor ?? c.textMuted }]}>{detail}</Text> : null}
      </View>
      {value ? (
        <Text style={[type.body, styles.value, { color: c.textMuted }]} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {right}
      {chevron ? <Icon name="chevron-right" size={18} color={c.textFaint} /> : null}
    </>
  );
  if (!onPress) return <View style={[styles.row, disabled && styles.disabled]}>{body}</View>;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      android_ripple={{ color: c.border }}
      accessibilityRole={props.accessibilityRole ?? 'button'}
      accessibilityState={{ disabled, ...props.accessibilityState }}
      style={[styles.row, disabled && styles.disabled]}>
      {body}
    </Pressable>
  );
}

export function SwitchRow(props: Omit<RowProps, 'right' | 'onPress' | 'value'> & { value: boolean; onChange: (v: boolean) => void }) {
  const { value, onChange, ...rest } = props;
  const c = useColors();
  return (
    <ListRow
      {...rest}
      value={undefined}
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      right={
        <Switch
          value={value}
          onValueChange={onChange}
          disabled={rest.disabled}
          trackColor={{ true: c.primary, false: c.border }}
          thumbColor={c.surface}
          accessible={false}
        />
      }
    />
  );
}

export function RadioRow(props: Omit<RowProps, 'right'> & { selected: boolean; onPress: () => void }) {
  const { selected, ...rest } = props;
  return (
    <ListRow
      {...rest}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, selected }}
      right={<Radio selected={selected} disabled={rest.disabled} />}
    />
  );
}

export function Radio({ selected, disabled }: { selected: boolean; disabled?: boolean }) {
  const c = useColors();
  const color = selected && !disabled ? c.primary : c.textFaint;
  return (
    <View style={[styles.radio, { borderColor: color }]}>
      {selected ? <View style={[styles.radioDot, { backgroundColor: color }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginTop: space.xl },
  groupTitle: { marginBottom: space.sm, marginLeft: space.xs, letterSpacing: 0.6 },
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 52 },
  footer: { marginTop: space.sm, marginHorizontal: space.xs, fontWeight: '400' },
  row: {
    minHeight: TOUCH + 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    gap: space.md,
  },
  disabled: { opacity: 0.45 },
  iconWrap: { width: 24, alignItems: 'center' },
  text: { flex: 1 },
  label: { fontWeight: '500' },
  detail: { marginTop: 2, fontWeight: '400' },
  value: { maxWidth: '50%' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
});
