import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, space, type, useColors } from '@/src/theme/theme';

interface Props {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Footer row (e.g. Cancel / Done). */
  footer?: ReactNode;
}

/** A plain bottom sheet built on Modal. Tapping the backdrop or Back closes it. */
export function BottomSheet({ visible, title, onClose, children, footer }: Props) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: c.backdrop }]} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: space.lg + insets.bottom }]}>
          <View style={[styles.handle, { backgroundColor: c.border }]} />
          <Text style={[type.heading, styles.title, { color: c.text }]} accessibilityRole="header">
            {title}
          </Text>
          {children}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.lg + 4,
    borderTopRightRadius: radius.lg + 4,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    maxHeight: '90%',
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginBottom: space.md },
  title: { marginBottom: space.md },
  footer: { flexDirection: 'row', gap: space.md, marginTop: space.lg },
});
