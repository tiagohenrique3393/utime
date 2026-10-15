import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GoldStar } from '@/components/gold-star';
import { fonts, ui } from '@/constants/theme';
import { dayOutcome, monthGrid, type DayMark } from '@/lib/constancy';

const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const green = '#46C36A';
const card = 'rgba(10, 10, 10, 0.78)';
const line = 'rgba(184, 160, 120, 0.32)';

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
  const cells = monthGrid(cursor.year, cursor.month);
  const title = monthTitle(cursor.year, cursor.month);

  return (
    <View style={styles.card}>
      <View style={styles.toolbar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" onPress={() => onCursor(shiftMonth(cursor.year, cursor.month, -1))} style={styles.arrow}>
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar para o mês de hoje"
          onPress={() => onCursor({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) })}
          style={styles.todayButton}>
          <Text style={styles.todayLabel}>Hoje</Text>
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
        {cells.map((cell) => {
          const outcome = dayOutcome(marks.get(cell.dateKey), cell.dateKey, today);
          const day = Number(cell.dateKey.slice(8, 10));
          const isToday = cell.dateKey === today && !cell.outside;
          const future = outcome === 'future' || cell.outside;
          const status =
            cell.outside
              ? 'fora deste mês'
              : outcome === 'star'
                ? 'excelência, 100%'
                : outcome === 'keep'
                  ? 'meta atingida'
                  : outcome === 'miss'
                    ? 'abaixo de 70%'
                    : outcome === 'empty'
                      ? 'sem hábitos programados'
                      : outcome === 'open'
                        ? 'dia em andamento'
                        : 'futuro';
          const label = `${day} de ${title}, ${status}${isToday ? ', hoje' : ''}`;
          const body = (
            <View style={[styles.day, isToday && styles.today]}>
              <Text style={[styles.dayNumber, (future || outcome === 'miss' || outcome === 'empty') && styles.quiet, isToday && styles.dayNumberOn]}>
                {day}
              </Text>
              {cell.outside ? null : outcome === 'star' ? <GoldStar size={9} /> : null}
              {cell.outside ? null : outcome === 'keep' ? <View style={styles.dot} /> : null}
            </View>
          );
          if (future) {
            return (
              <View key={cell.dateKey} accessibilityLabel={label} accessibilityState={{ disabled: true }} style={styles.slot}>
                {body}
              </View>
            );
          }
          return (
            <Pressable
              key={cell.dateKey}
              accessibilityRole="button"
              accessibilityLabel={label}
              onPress={() => onOpenDay(cell.dateKey)}
              style={({ pressed }) => [styles.slot, pressed && styles.pressed]}>
              {body}
            </Pressable>
          );
        })}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <GoldStar size={10} />
          <Text style={styles.legendText}>Excelência (100%)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendDot} />
          <Text style={styles.legendText}>Meta atingida (≥70%)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendMiss} />
          <Text style={styles.legendText}>Abaixo da meta</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendRing} />
          <Text style={styles.legendText}>Dia selecionado</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: line,
    backgroundColor: card,
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 10,
  },
  toolbar: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrow: {
    width: 28,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowLabel: {
    color: ui.textChampagne,
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 24,
  },
  arrowOff: {
    opacity: 0.28,
  },
  month: {
    flex: 1,
    textAlign: 'center',
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 14,
    letterSpacing: 1.2,
  },
  todayButton: {
    minHeight: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: line,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  todayLabel: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  weekdays: {
    flexDirection: 'row',
    marginTop: 2,
  },
  weekday: {
    width: '14.2857%',
    textAlign: 'center',
    color: ui.faint,
    fontFamily: fonts.text,
    fontSize: 11,
    lineHeight: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  slot: {
    width: '14.2857%',
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  day: {
    width: 34,
    height: 38,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  today: {
    borderWidth: 1,
    borderColor: ui.textChampagne,
  },
  dayNumber: {
    color: ui.text,
    fontFamily: fonts.textMedium,
    fontSize: 13,
    lineHeight: 16,
  },
  dayNumberOn: {
    color: ui.text,
  },
  quiet: {
    color: '#6E6A64',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: green,
    marginTop: -1,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 6,
    rowGap: 3,
    paddingHorizontal: 4,
    paddingTop: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendText: {
    color: '#A39E96',
    fontFamily: fonts.text,
    fontSize: 7.5,
    lineHeight: 10,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: green,
  },
  legendMiss: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#6E6A64',
  },
  legendRing: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: ui.textChampagne,
  },
  pressed: {
    opacity: 0.72,
  },
});
