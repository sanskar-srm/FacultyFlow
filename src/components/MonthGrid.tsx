import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/src/components/Icon';
import { space, type, TOUCH, useColors } from '@/src/theme/theme';
import { WEEKDAY_INITIALS, formatLongDate, monthGrid, monthTitle } from '@/src/utils/dateUtils';

interface Props {
  year: number;
  month: number;
  today: string;
  selected: string;
  /** Days that get a small dot. Omit for a plain date picker. */
  datesWithTasks?: Set<string>;
  onSelect: (date: string) => void;
  onPrev: () => void;
  onNext: () => void;
}

/** A small hand-built month calendar. Used by the Calendar tab and the date picker. */
export const MonthGrid = memo(function MonthGrid(props: Props) {
  const { year, month, today, selected, datesWithTasks, onSelect, onPrev, onNext } = props;
  const c = useColors();

  return (
    <View>
      <View style={styles.header}>
        <Pressable onPress={onPrev} style={styles.nav} accessibilityRole="button" accessibilityLabel="Previous month">
          <Icon name="chevron-left" size={22} color={c.text} />
        </Pressable>
        <Text style={[type.heading, { color: c.text }]} accessibilityRole="header">
          {monthTitle(year, month)}
        </Text>
        <Pressable onPress={onNext} style={styles.nav} accessibilityRole="button" accessibilityLabel="Next month">
          <Icon name="chevron-right" size={22} color={c.text} />
        </Pressable>
      </View>

      <View style={styles.week}>
        {WEEKDAY_INITIALS.map((d, i) => (
          <Text key={i} style={[type.caption, styles.weekday, { color: c.textFaint }]}>
            {d}
          </Text>
        ))}
      </View>

      {monthGrid(year, month).map((week, wi) => (
        <View key={wi} style={styles.week}>
          {week.map((date, di) => {
            if (!date) return <View key={di} style={styles.cell} />;
            const isSelected = date === selected;
            const isToday = date === today;
            const hasTasks = datesWithTasks?.has(date) ?? false;
            return (
              <Pressable
                key={date}
                style={styles.cell}
                onPress={() => onSelect(date)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${formatLongDate(date)}${isToday ? ', today' : ''}${hasTasks ? ', has tasks' : ''}`}>
                <View
                  style={[
                    styles.day,
                    isSelected && { backgroundColor: c.primary },
                    !isSelected && isToday && { backgroundColor: c.primarySoft },
                  ]}>
                  <Text
                    style={[
                      styles.dayText,
                      { color: isSelected ? c.onPrimary : isToday ? c.primary : c.text },
                      (isSelected || isToday) && styles.bold,
                    ]}>
                    {Number(date.slice(8))}
                  </Text>
                </View>
                <View
                  style={[styles.dot, hasTasks && { backgroundColor: isSelected ? c.primary : c.textFaint }]}
                />
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm },
  nav: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', paddingVertical: space.xs },
  cell: { flex: 1, alignItems: 'center', paddingTop: 2, minHeight: TOUCH },
  day: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 15 },
  bold: { fontWeight: '700' },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
});
