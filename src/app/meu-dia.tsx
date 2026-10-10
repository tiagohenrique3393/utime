import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { DayPlanet } from '@/components/day-planet';
import { HydrationMeter } from '@/components/hydration-meter';
import { fonts, ui } from '@/constants/theme';
import { getSessionUserId } from '@/lib/accounts';
import { dailyCounts, isDailyHabitDone, refreshDailyBoard, toggleDailyHabit, type DailyHabit } from '@/lib/daily-board';
import { useDailyBoard } from '@/lib/use-daily-board';
import { habitPeriods, periodLabels, pillarLabels, type HabitPeriod } from '@/lib/habit-catalog';
import { formatCalendarDate, formatDailyPercent, parseDateKey, todayKey, zonedHour } from '@/lib/habit-day';
import { getProgressColor } from '@/lib/progress-color';
import { useRequireSession } from '@/lib/require-session';
import { HYDRATION_HABIT_ID } from '@/lib/suggested-habits';

const page = '#050505';
const rowPress = { cursor: 'pointer', userSelect: 'none' } as ViewStyle;
const bandColor = {
  red: '#E15A4C',
  yellow: '#E4C36A',
  green: '#5FCB68',
} as const;

function formatDayHeading(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  if (!year || !month || !day) {
    return '';
  }
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' })
    .format(date)
    .replace('.', '')
    .toUpperCase();
  const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' }).format(date).toUpperCase();
  return `${weekday}, ${day} DE ${monthName} · ${formatCalendarDate(dateKey)}`;
}

function currentPeriod(date = new Date()): HabitPeriod {
  const hour = zonedHour(date);
  if (hour < 12) {
    return 'manha';
  }
  if (hour < 18) {
    return 'tarde';
  }
  return 'noite';
}

function Chevron({ open, color = 'rgba(243,239,232,0.55)' }: { open: boolean; color?: string }) {
  return <View style={[styles.chevron, { borderColor: color, marginTop: open ? 3 : 0, transform: [{ rotate: open ? '-135deg' : '45deg' }] }]} />;
}

function HabitCheck({ habit, checked, locked }: { habit: DailyHabit; checked: boolean; locked: boolean }) {
  if (locked) {
    return (
      <View accessibilityLabel={`${habit.label}, somente leitura`} style={styles.task}>
        <View pointerEvents="none" style={[styles.mark, checked && styles.markOn]}>
          {checked ? <View style={styles.tick} /> : null}
        </View>
        <View pointerEvents="none" style={styles.nameRow}>
          <Text numberOfLines={1} style={styles.taskLabel}>
            {habit.label}
          </Text>
          <Text numberOfLines={1} style={styles.pillar}>
            {`· ${pillarLabels[habit.pillar].toUpperCase()}`}
          </Text>
        </View>
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={`${habit.label}, ${pillarLabels[habit.pillar]}`}
      hitSlop={6}
      onPress={() => void toggleDailyHabit(habit)}
      style={({ pressed }) => [styles.task, rowPress, pressed && styles.pressed]}>
      <View pointerEvents="none" style={[styles.mark, checked && styles.markOn]}>
        {checked ? <View style={styles.tick} /> : null}
      </View>
      <View pointerEvents="none" style={styles.nameRow}>
        <Text numberOfLines={1} style={styles.taskLabel}>
          {habit.label}
        </Text>
        <Text numberOfLines={1} style={styles.pillar}>
          {`· ${pillarLabels[habit.pillar].toUpperCase()}`}
        </Text>
      </View>
    </Pressable>
  );
}

export default function MyDayScreen() {
  const signedIn = useRequireSession();
  const params = useLocalSearchParams<{ data?: string | string[] }>();
  const selectedDate = parseDateKey(params.data);
  const board = useDailyBoard(selectedDate);
  const counts = dailyCounts(board.habits, board.completed);
  const locked = board.dateKey !== '' && board.dateKey !== todayKey();
  const userId = getSessionUserId();
  const tone = bandColor[getProgressColor(counts.percent)];
  const periodNow = currentPeriod();
  const [overrides, setOverrides] = useState<Partial<Record<HabitPeriod, boolean>>>({});
  const groups = habitPeriods.map((period) => ({
    period,
    habits: board.habits.filter((habit) => habit.period === period && habit.catalogHabitId !== HYDRATION_HABIT_ID),
  }));
  const currentCount = groups.find((group) => group.period === periodNow)?.habits.length ?? 0;
  const firstPeriod = groups.find((group) => group.habits.length > 0)?.period ?? null;

  function sectionOpen(period: HabitPeriod) {
    if (overrides[period] !== undefined) {
      return overrides[period] === true;
    }
    if (selectedDate) {
      return true;
    }
    if (currentCount > 0) {
      return period === periodNow;
    }
    return period === firstPeriod;
  }

  if (!signedIn) {
    return <View style={styles.blank} />;
  }

  return (
    <AppScreen backgroundColor={page} backdrop={<DayPlanet />}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Evolução pessoal</Text>
        <Text accessibilityRole="header" style={styles.title}>
          Meu dia
        </Text>
        {board.dateKey ? <Text style={styles.date}>{formatDayHeading(board.dateKey)}</Text> : null}
      </View>

      {!board.ready ? <Text style={styles.note}>Carregando sua rotina.</Text> : null}

      {board.ready && board.habits.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.note}>Nenhum hábito na rotina.</Text>
        </View>
      ) : null}

      {board.ready && board.habits.length > 0 ? (
        <>
          <View style={styles.progress}>
            <Text style={[styles.percent, { color: tone }]}>{formatDailyPercent(counts.percent)}</Text>
            <View
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: 100, now: Math.round(counts.percent) }}
              style={styles.rail}>
              {counts.percent > 0 ? <View style={[styles.fill, { width: `${Math.min(100, counts.percent)}%`, backgroundColor: tone }]} /> : null}
            </View>
          </View>
          <Text style={styles.count}>
            {counts.done} de {counts.total} hábitos
          </Text>
          {board.notice ? <Text style={styles.notice}>{board.notice}</Text> : null}

          {groups.map((group) => {
            if (group.habits.length === 0) {
              return null;
            }
            const open = sectionOpen(group.period);
            const done = group.habits.filter((habit) => isDailyHabitDone(habit, board.completed)).length;
            return (
              <View key={group.period} style={styles.group}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                  accessibilityLabel={periodLabels[group.period]}
                  onPress={() => setOverrides((prev) => ({ ...prev, [group.period]: !open }))}
                  style={({ pressed }) => [styles.groupHead, rowPress, pressed && styles.pressed]}>
                  <Text style={styles.groupTitle}>{periodLabels[group.period]}</Text>
                  <Text style={styles.groupCount}>
                    {done}/{group.habits.length}
                  </Text>
                  <Chevron open={open} />
                </Pressable>
                {open
                  ? group.habits.map((habit) => (
                      <HabitCheck key={habit.id} habit={habit} checked={isDailyHabitDone(habit, board.completed)} locked={locked} />
                    ))
                  : null}
              </View>
            );
          })}
        </>
      ) : null}

      {board.ready && userId && board.dateKey ? (
        <View style={styles.hydration}>
          <HydrationMeter
            userId={userId}
            dateKey={board.dateKey}
            onSaved={() => {
              void refreshDailyBoard(userId, selectedDate ?? undefined);
            }}
          />
        </View>
      ) : null}

      {board.ready ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/personalizar-habitos' as Href)}
          style={({ pressed }) => [styles.personalize, rowPress, pressed && styles.pressed]}>
          <Text style={styles.personalizeLabel}>Personalizar hábitos</Text>
          <View style={styles.personalizeChevron} />
        </Pressable>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  blank: {
    flex: 1,
    backgroundColor: page,
  },
  header: {
    gap: 6,
    paddingTop: 4,
  },
  kicker: {
    color: '#E6E1D8',
    fontFamily: fonts.display,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 3.1,
    textTransform: 'uppercase',
  },
  title: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  date: {
    color: '#8E8A84',
    fontFamily: fonts.text,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.15,
    textTransform: 'uppercase',
  },
  progress: {
    marginTop: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  percent: {
    fontFamily: fonts.textLight,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -0.4,
  },
  rail: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2A2926',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  count: {
    marginTop: 8,
    color: '#8A8680',
    fontFamily: fonts.text,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.35,
    textTransform: 'uppercase',
  },
  group: {
    marginTop: 14,
    borderRadius: 16,
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: 'rgba(243,239,232,0.08)',
    paddingHorizontal: 14,
  },
  groupHead: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  groupTitle: {
    flex: 1,
    color: ui.champagne,
    fontFamily: fonts.display,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 1.7,
    textTransform: 'uppercase',
  },
  groupCount: {
    color: '#9A958E',
    fontFamily: fonts.text,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.3,
  },
  chevron: {
    width: 7,
    height: 7,
    borderRightWidth: 1.25,
    borderBottomWidth: 1.25,
  },
  task: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(243,239,232,0.08)',
  },
  mark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.4,
    borderColor: 'rgba(196,192,186,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markOn: {
    backgroundColor: ui.champagne,
    borderColor: ui.champagne,
  },
  tick: {
    width: 8,
    height: 4,
    marginBottom: 2,
    borderLeftWidth: 1.6,
    borderBottomWidth: 1.6,
    borderColor: '#141210',
    transform: [{ rotate: '-45deg' }],
  },
  nameRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taskLabel: {
    flexShrink: 1,
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 14,
    lineHeight: 18,
  },
  pillar: {
    flexShrink: 0,
    color: '#6E6A64',
    fontFamily: fonts.text,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.7,
  },
  empty: {
    marginTop: 28,
  },
  hydration: {
    marginTop: 14,
  },
  personalize: {
    marginTop: 14,
    minHeight: 52,
    borderRadius: 999,
    backgroundColor: ui.champagne,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 22,
  },
  personalizeLabel: {
    color: ui.ink,
    fontFamily: fonts.textMedium,
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  personalizeChevron: {
    width: 7,
    height: 7,
    marginTop: -1,
    borderRightWidth: 1.4,
    borderBottomWidth: 1.4,
    borderColor: ui.ink,
    transform: [{ rotate: '-45deg' }],
  },
  note: {
    marginTop: 28,
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 15,
    lineHeight: 22,
  },
  notice: {
    marginTop: 12,
    color: ui.champagne,
    fontFamily: fonts.text,
    fontSize: 14,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.72,
  },
});
