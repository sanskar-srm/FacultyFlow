import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/src/components/Button';
import { EmptyState } from '@/src/components/EmptyState';
import { Icon } from '@/src/components/Icon';
import { rangeLabel } from '@/src/export/exportRange';
import { getLastExport, openExport, shareExport } from '@/src/export/exportService';
import { radius, space, type, useColors } from '@/src/theme/theme';
import { showToast } from '@/src/utils/toast';

/** Pixels per spreadsheet width unit, so the preview keeps the sheet's proportions. */
const CHAR = 7.5;

export default function ExportResultScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  // Read once: the export screen sets it just before navigating here.
  const [result] = useState(getLastExport);
  const [busy, setBusy] = useState<'share' | 'open' | null>(null);

  if (!result) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: c.background }]}>
        <EmptyState icon="file" title="No sheet to show" message="Create a new Excel sheet to see it here." actionLabel="Back" onAction={() => router.back()} />
      </View>
    );
  }

  const { preview, summary } = result;
  const widths = preview.widths.map((w) => Math.round(w * CHAR));
  const tableWidth = widths.reduce((a, b) => a + b, 0);

  const share = async () => {
    setBusy('share');
    try {
      await shareExport(result);
    } catch {
      showToast("Couldn't open the share menu.");
    } finally {
      setBusy(null);
    }
  };

  const open = async () => {
    setBusy('open');
    try {
      const opened = await openExport(result);
      if (!opened) showToast('No app can open Excel files. Use Share instead.');
    } catch {
      showToast("Couldn't open the sheet.");
    } finally {
      setBusy(null);
    }
  };

  const row = (cells: string[], header: boolean, index = 0) => (
    <View
      style={[
        styles.row,
        { borderColor: c.border },
        header ? { backgroundColor: c.primary } : { backgroundColor: index % 2 ? c.surfaceAlt : c.surface },
      ]}>
      {cells.map((cell, i) => (
        <Text
          key={i}
          numberOfLines={header ? 1 : 3}
          style={[
            styles.cell,
            { width: widths[i], borderColor: c.border, color: header ? c.onPrimary : c.text },
            header && styles.headerCell,
          ]}>
          {cell}
        </Text>
      ))}
    </View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <View style={styles.top}>
        <View style={styles.fileRow}>
          <View style={[styles.fileIcon, { backgroundColor: c.successSoft }]}>
            <Icon name="check-circle" size={22} color={c.success} />
          </View>
          <View style={styles.flex}>
            <Text style={[type.heading, { color: c.text }]} numberOfLines={2} selectable>
              {result.fileName}
            </Text>
            <Text style={[type.caption, { color: c.textMuted }]}>
              {`${rangeLabel(result.range)} · ${summary.total} ${summary.total === 1 ? 'task' : 'tasks'}`}
            </Text>
          </View>
        </View>

        <View style={[styles.saved, { backgroundColor: result.savedPath ? c.surface : c.warningSoft, borderColor: c.border }]}>
          <Icon name={result.savedPath ? 'folder' : 'alert-triangle'} size={18} color={result.savedPath ? c.primary : c.warning} />
          <View style={styles.flex}>
            <Text style={[type.caption, { color: c.textMuted }]}>{result.savedPath ? 'SAVED TO' : 'NOT SAVED'}</Text>
            <Text style={[type.body, { color: c.text }]} selectable>
              {result.savedPath ?? "Couldn't save a copy to your phone's storage. You can still open or share it."}
            </Text>
          </View>
        </View>

        <View style={styles.stats}>
          <Stat label="Completed" value={summary.completed} color={c.success} />
          <Stat label="Pending" value={summary.pending} color={c.primary} />
          <Stat label="Overdue" value={summary.overdue} color={c.danger} />
        </View>

        <Text style={[type.caption, styles.previewTitle, { color: c.textMuted }]}>PREVIEW · SCROLL SIDEWAYS FOR ALL COLUMNS</Text>
      </View>

      <View style={[styles.table, { borderColor: c.border, backgroundColor: c.surface }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <FlatList
            style={{ width: tableWidth }}
            data={preview.rows}
            keyExtractor={(_, i) => String(i)}
            ListHeaderComponent={row(preview.headers, true)}
            stickyHeaderIndices={[0]}
            renderItem={({ item, index }) => row(item, false, index)}
            initialNumToRender={20}
          />
        </ScrollView>
      </View>

      <View style={[styles.footer, { paddingBottom: space.lg + insets.bottom, borderTopColor: c.border }]}>
        <View style={styles.flex}>
          <Button label="Open" icon="external-link" variant="secondary" onPress={open} loading={busy === 'open'} disabled={busy !== null} />
        </View>
        <View style={styles.flex}>
          <Button label="Share" icon="share-2" onPress={share} loading={busy === 'share'} disabled={busy !== null} />
        </View>
      </View>
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  const c = useColors();
  return (
    <View style={[styles.stat, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Text style={[type.heading, { color }]}>{value}</Text>
      <Text style={[type.caption, { color: c.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { justifyContent: 'center', padding: space.xl },
  top: { paddingHorizontal: space.lg, paddingTop: space.sm },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  fileIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  saved: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: space.lg,
  },
  stats: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  previewTitle: { marginTop: space.xl, marginBottom: space.sm, marginLeft: space.xs, letterSpacing: 0.6 },
  table: {
    flex: 1,
    marginHorizontal: space.lg,
    marginBottom: space.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  cell: {
    fontSize: 13,
    paddingHorizontal: space.sm,
    paddingVertical: space.sm,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  headerCell: { fontWeight: '700' },
  footer: {
    flexDirection: 'row',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
