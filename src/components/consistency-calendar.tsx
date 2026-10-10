import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GoldStar } from '@/components/gold-star';
import { fonts, ui } from '@/constants/theme';
import { dayOutcome, monthCells, type DayMark } from '@/lib/constancy';

const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function monthTitle(year: number, month: number) {
  const date = new Date(Date.UTC(year, month - 1, 1, 12));
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date).toUpperCase();
}

function shiftMonth(year: number, month: number, delta: number) {
  const index = year * 12 + (month - 1) + delta;
  const nextYear = Math.floor(index / 12);
  return { year: nextYear, month: index - nextYear * 12 + 1 };
}

export function ConsistencyCalendar({
  today,
  cursor,
  marks,
  onCursor,
  onOpenDay,
}: {
  today: string;
  cursor: { year: number; month: number };
  marks: ReadonlyMap<string, DayMark>;
  onCursor: (next: { year: number; month: number }) => void;
  onOpenDay: (dateKey: string) => void;
}) {
  const todayMonth = Number(today.slice(0, 4)) * 12 + Number(today.slice(5, 7));
  const cursorMonth = cursor.year * 12 + cursor.month;
  const canNext = cursorMonth < todayMonth;
  const cells = monthCells(cursor.year, cursor.month);
  const title = monthTitle(cursor.year, cursor.month);

  return (
    <View style={styles.wrap}>
      <View style={styles.toolbar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mês anterior"
          onPress={() => onCursor(shiftMonth(cursor.year, cursor.month, -1))}
          style={styles.arrow}>
          <Text style={styles.arrowLabel}>‹</Text>
        </Pressable>
        <Text style={styles.month}>{title}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Próximo mês"
          accessibilityState={{ disabled: !canNext }}
          disabled={!canNext}
          onPress={() => {
            if (canNext) {
              onCursor(shiftMonth(cursor.year, cursor.month, 1));
            }
          }}
          style={styles.arrow}>
          <Text style={[styles.arrowLabel, !canNext && styles.arrowOff]}>›</Text>
        </Pressable>
      </View>
      <View style={styles.weekdays}>
        {weekdays.map((day, index) => (
          <Text key={`${day}-${index}`} style={styles.weekday}>
            {day}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((dateKey, index) => {
          if (!dateKey) {
            return <View key={`empty-${cursor.year}-${cursor.month}-${index}`} style={styles.slot} />;
          }
          const outcome = dayOutcome(marks.get(dateKey), dateKey, today);
          const day = Number(dateKey.slice(8, 10));
          const isToday = dateKey === today;
          const marked = outcome === 'keep' || outcome === 'star';
          const future = outcome === 'future';
          const status =
            outcome === 'star'
              ? 'dia perfeito, uma estrela'
              : outcome === 'keep'
                ? 'entra na sequência'
                : outcome === 'miss'
                  ? 'abaixo de 70%'
                  : outcome === 'empty'
                    ? 'sem hábitos programados'
                    : outcome === 'open'
                      ? 'dia em andamento'
                      : 'futuro';
          const label = `${day} de ${title}, ${status}${isToday ? ', hoje' : ''}`;
          const body = (
            <View style={[styles.day, marked && styles.marked, isToday && styles.today]}>
              <Text style={[styles.dayNumber, future && styles.future, marked && styles.dayNumberOn, isToday && styles.dayNumberOn]}>
                {day}
              </Text>
              {outcome === 'star' ? <GoldStar size={9} /> : null}
              {outcome === 'keep' ? <View style={styles.dot} /> : null}
            </View>
          );
          if (future) {
            return (
              <View
                key={dateKey}
                accessibilityLabel={label}
                accessibilityState={{ disabled: true }}
                style={styles.slot}>
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
              style={({ pressed }) => [styles.slot, pressed && styles.pressed]}>
              {body}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  toolbar: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 26,
    lineHeight: 28,
  },
  arrowOff: {
    opacity: 0.28,
  },
  month: {
    flex: 1,
    textAlign: 'center',
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 16,
    letterSpacing: 2.4,
  },
  weekdays: {
    flexDirection: 'row',
    marginTop: 6,
  },
  weekday: {
    width: '14.2857%',
    textAlign: 'center',
    color: ui.faint,
    fontFamily: fonts.text,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  slot: {
    width: '14.2857%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  day: {
    width: '82%',
    aspectRatio: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marked: {
    backgroundColor: '#161616',
  },
  today: {
    borderWidth: 1.5,
    borderColor: ui.champagne,
  },
  dayNumber: {
    color: '#9C978F',
    fontFamily: fonts.textMedium,
    fontSize: 13,
    lineHeight: 16,
  },
  dayNumberOn: {
    color: ui.text,
  },
  future: {
    color: ui.faint,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#5FCB68',
    marginTop: -1,
  },
  pressed: {
    opacity: 0.72,
  },
});
