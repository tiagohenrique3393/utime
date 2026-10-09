import { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useReducedMotion } from '@/components/motion';
import { fonts, ui } from '@/constants/theme';
import { calendarDateKey } from '@/lib/habit-day';
import { journeyDayOnDate, sameDay, startOfDay } from '@/lib/journey-view';
import { dayProgress, type JourneyBoard } from '@/lib/tasks';

const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function monthCells(year: number, month: number) {
  const first = new Date(year, month, 1);
  const count = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let index = 0; index < first.getDay(); index += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= count; day += 1) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}

export function ConsistencyCalendar({
  source,
  today,
  onOpenDay,
  percents = null,
}: {
  source: JourneyBoard;
  today: Date;
  onOpenDay: (dateKey: string) => void;
  percents?: Record<string, number> | null;
}) {
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();
  const [cursor, setCursor] = useState(() => ({ year: today.getFullYear(), month: today.getMonth() }));
  const fade = useRef(new Animated.Value(1)).current;
  const todayStart = startOfDay(today);
  const column = Math.min(width - 44, width >= 840 ? 460 : 480);
  const cell = Math.min(46, Math.max(36, Math.floor(column / 7)));
  const title = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
    new Date(cursor.year, cursor.month, 1),
  );
  const cells = monthCells(cursor.year, cursor.month);

  function shift(delta: number) {
    const apply = () => {
      const next = new Date(cursor.year, cursor.month + delta, 1);
      setCursor({ year: next.getFullYear(), month: next.getMonth() });
    };
    if (reduced) {
      apply();
      return;
    }
    Animated.timing(fade, { toValue: 0.35, duration: 120, useNativeDriver: true }).start(() => {
      apply();
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    });
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.toolbar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" onPress={() => shift(-1)} style={styles.arrow}>
          <Text style={styles.arrowLabel}>‹</Text>
        </Pressable>
        <Text style={styles.month}>{title}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Próximo mês" onPress={() => shift(1)} style={styles.arrow}>
          <Text style={styles.arrowLabel}>›</Text>
        </Pressable>
      </View>
      <View style={styles.weekdays}>
        {weekdays.map((day, index) => (
          <Text key={`${day}-${index}`} style={[styles.weekday, { width: cell }]}>
            {day}
          </Text>
        ))}
      </View>
      <Animated.View style={[styles.grid, { opacity: fade }]}>
        {cells.map((date, index) => {
          if (!date) {
            return <View key={`empty-${index}`} style={{ width: cell, height: cell }} />;
          }
          const journeyDay = journeyDayOnDate(source, date, today);
          const dateKey = calendarDateKey(date);
          const future = date.getTime() > todayStart.getTime();
          const isToday = sameDay(date, todayStart);
          const usingHabits = percents != null;
          const habitPercent = usingHabits ? percents[dateKey] : undefined;
          const recorded = usingHabits ? typeof habitPercent === 'number' : Boolean(journeyDay);
          const percent = usingHabits ? (habitPercent ?? 0) : journeyDay ? dayProgress(source, journeyDay) : 0;
          const complete = recorded && !future && (usingHabits ? percent >= 70 : percent === 100);
          const incomplete = recorded && !future && (usingHabits ? percent < 70 : percent < 100);
          const canOpen = !future;
          const label = `${date.getDate()} de ${title}${complete ? ', pelo menos 70%' : incomplete ? ', abaixo de 70%' : future ? ', futuro' : ''}${isToday ? ', hoje' : ''}`;
          const body = (
            <View
              style={[
                styles.day,
                { width: cell - 6, height: cell - 6 },
                complete && styles.complete,
                incomplete && styles.incomplete,
                isToday && styles.today,
              ]}>
              <Text style={[styles.dayNumber, future && styles.future, complete && styles.dayNumberOn]}>
                {date.getDate()}
              </Text>
            </View>
          );

          if (!canOpen) {
            return (
              <View key={dateKey} accessibilityLabel={label} style={[styles.slot, { width: cell, height: cell }]}>
                {body}
              </View>
            );
          }

          return (
            <Pressable
              key={dateKey}
              accessibilityRole="button"
              accessibilityLabel={label}
              onPress={() => onOpenDay(dateKey)}
              style={({ pressed }) => [styles.slot, { width: cell, height: cell }, pressed && styles.pressed]}>
              {body}
            </Pressable>
          );
        })}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
  },
  toolbar: {
    width: '100%',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrow: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowLabel: {
    color: ui.champagne,
    fontFamily: fonts.text,
    fontSize: 22,
    lineHeight: 24,
  },
  month: {
    flex: 1,
    textAlign: 'center',
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 13,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  weekdays: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  weekday: {
    textAlign: 'center',
    color: ui.faint,
    fontFamily: fonts.text,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  slot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  day: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  complete: {
    backgroundColor: 'rgba(232, 201, 155, 0.24)',
  },
  incomplete: {
    backgroundColor: '#141210',
  },
  today: {
    borderWidth: 1,
    borderColor: ui.champagne,
  },
  dayNumber: {
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 13,
  },
  dayNumberOn: {
    color: ui.text,
  },
  future: {
    color: ui.faint,
  },
  pressed: {
    opacity: 0.72,
  },
});
