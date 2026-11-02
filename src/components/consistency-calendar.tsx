import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { constancyColors } from '@/components/constancy-colors';
import { GoldStar } from '@/components/gold-star';
import { fonts, ui } from '@/constants/theme';
import {
  activityRatio,
  activityStatus,
  activityTone,
  monthGrid,
  monthTitle,
  shiftMonth,
  todayCursor,
  type ActivityTone,
  type DayMark,
} from '@/lib/constancy';

const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const toneFill: Record<ActivityTone, string> = {
  future: constancyColors.idle,
  idle: constancyColors.idle,
  below: constancyColors.below,
  meta: constancyColors.meta,
  excellence: constancyColors.excellence,
};

export function ConsistencyCalendar({
  today,
  cursor,
  marks,
  selected,
  onCursor,
  onSelect,
  onOpenDay,
}: {
  today: string;
  cursor: { year: number; month: number };
  marks: ReadonlyMap<string, DayMark>;
  selected: string;
  onCursor: (next: { year: number; month: number }) => void;
  onSelect: (dateKey: string) => void;
  onOpenDay: (dateKey: string) => void;
}) {
  const [gridWidth, setGridWidth] = useState(0);
  const { width } = useWindowDimensions();
  const tight = width < 390;
  const todayMonth = Number(today.slice(0, 4)) * 12 + Number(today.slice(5, 7));
  const cursorMonth = cursor.year * 12 + cursor.month;
  const canNext = cursorMonth < todayMonth;
  const cells = monthGrid(cursor.year, cursor.month);
  const title = monthTitle(cursor.year, cursor.month);
  const diameter = gridWidth > 0 ? Math.max(32, Math.min(48, Math.floor(gridWidth / 7 - 4))) : 38;
  const numberSize = diameter >= 40 ? 15 : 13;
  const starSize = Math.max(8, Math.round(diameter * 0.26));

  return (
    <View style={styles.card}>
      <View style={styles.toolbar}>
        {tight ? null : <View style={styles.todaySpacer} />}
        <View style={styles.monthGroup}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mês anterior"
            onPress={() => onCursor(shiftMonth(cursor.year, cursor.month, -1))}
            style={styles.arrow}>
            <Text style={styles.arrowLabel}>‹</Text>
          </Pressable>
          <Text style={[styles.month, tight && styles.monthTight]}>{title}</Text>
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar para hoje"
          onPress={() => {
            onSelect(today);
            onCursor(todayCursor(today));
          }}
          style={styles.todayButton}>
          <Text style={styles.todayLabel}>HOJE</Text>
        </Pressable>
      </View>
      <View style={styles.weekdays}>
        {weekdays.map((day, index) => (
          <Text key={`${day}-${index}`} style={styles.weekday}>
            {day}
          </Text>
        ))}
      </View>
      <View style={styles.grid} onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}>
        {cells.map((cell) => {
          const tone = activityTone(marks.get(cell.dateKey), cell.dateKey, today);
          const ratio = activityRatio(marks.get(cell.dateKey), cell.dateKey, today);
          const day = Number(cell.dateKey.slice(8, 10));
          const isSelected = !cell.outside && cell.dateKey === selected;
          const isToday = cell.dateKey === today && !cell.outside;
          const locked = cell.outside || tone === 'future';
          const excellence = !cell.outside && tone === 'excellence';
          const label = cell.outside
            ? `${day} de ${title}, fora deste mês`
            : `${day} de ${title}, ${activityStatus(tone, ratio)}${isToday ? ', hoje' : ''}${isSelected ? ', selecionado' : ''}`;
          const body = (
            <View
              style={[
                styles.halo,
                {
                  width: diameter + 6,
                  height: diameter + 6,
                  borderRadius: (diameter + 6) / 2,
                },
                isSelected && styles.haloOn,
              ]}>
              <View
                style={[
                  styles.day,
                  {
                    width: diameter,
                    height: diameter,
                    borderRadius: diameter / 2,
                    backgroundColor: cell.outside ? constancyColors.outside : toneFill[tone],
                  },
                  excellence && styles.excellence,
                ]}>
                <Text
                  style={[
                    styles.dayNumber,
                    { fontSize: numberSize, lineHeight: numberSize + 1 },
                    cell.outside && styles.outsideNumber,
                  ]}>
                  {day}
                </Text>
                {excellence ? <GoldStar size={starSize} style={{ marginTop: -2, lineHeight: starSize }} /> : null}
              </View>
            </View>
          );
          if (locked) {
            return (
              <View
                key={`${cell.dateKey}-${cell.outside ? 'out' : 'in'}`}
                accessibilityLabel={label}
                accessibilityState={{ disabled: true }}
                style={[styles.slot, { minHeight: Math.max(44, diameter + 10) }]}>
                {body}
              </View>
            );
          }
          return (
            <Pressable
              key={cell.dateKey}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected: isSelected }}
              onPress={() => {
                onSelect(cell.dateKey);
                onOpenDay(cell.dateKey);
              }}
              style={({ pressed }) => [styles.slot, { minHeight: Math.max(44, diameter + 10) }, pressed && styles.pressed]}>
              {body}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: constancyColors.line,
    backgroundColor: constancyColors.card,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 12,
  },
  toolbar: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
  },
  todaySpacer: {
    width: 58,
  },
  monthGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    width: 36,
    height: 44,
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
    flexShrink: 1,
    color: constancyColors.text,
    fontFamily: fonts.display,
    fontSize: 15,
    lineHeight: 18,
    letterSpacing: 1.1,
    textAlign: 'center',
  },
  monthTight: {
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: 0.2,
  },
  todayButton: {
    minHeight: 32,
    width: 58,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(224, 177, 90, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayLabel: {
    color: constancyColors.text,
    fontFamily: fonts.display,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.8,
  },
  weekdays: {
    flexDirection: 'row',
    marginTop: 6,
    marginBottom: 2,
  },
  weekday: {
    width: '14.2857%',
    textAlign: 'center',
    color: constancyColors.muted,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  haloOn: {
    borderColor: constancyColors.excellenceEdge,
    boxShadow: '0 0 8px rgba(224, 177, 90, 0.35)',
  },
  day: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  excellence: {
    borderWidth: 1,
    borderColor: constancyColors.excellenceEdge,
    boxShadow: '0 0 8px rgba(224, 177, 90, 0.4)',
  },
  dayNumber: {
    color: '#FFFFFF',
    fontFamily: fonts.display,
    textAlign: 'center',
  },
  outsideNumber: {
    color: constancyColors.quiet,
  },
  pressed: {
    opacity: 0.74,
  },
});
