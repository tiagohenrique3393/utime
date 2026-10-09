import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { AppScreen, Eyebrow, Meta, PageTitle, PrimaryButton, TextButton } from '@/components/app-screen';
import { DayProgress } from '@/components/day-progress';
import { HydrationMeter } from '@/components/hydration-meter';
import { fonts, ui } from '@/constants/theme';
import { getSessionUserId } from '@/lib/accounts';
import { dailyCounts, isDailyHabitDone, refreshDailyBoard, toggleDailyHabit, type DailyHabit } from '@/lib/daily-board';
import { useDailyBoard } from '@/lib/use-daily-board';
import { habitPeriods, periodLabels, relevanceLabels } from '@/lib/habit-catalog';
import { formatCalendarDate, formatDailyPercent, formatLongDate, parseDateKey } from '@/lib/habit-day';
import { useRequireSession } from '@/lib/require-session';
import { HYDRATION_HABIT_ID } from '@/lib/suggested-habits';

const rowPress = { cursor: 'pointer', userSelect: 'none' } as ViewStyle;

function hydrationHabit(habits: readonly DailyHabit[]) {
  return habits.find((habit) => habit.catalogHabitId === HYDRATION_HABIT_ID) ?? null;
}

function HabitCheck({ habit, checked }: { habit: DailyHabit; checked: boolean }) {
  const relevance = habit.relevance;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={habit.label}
      hitSlop={6}
      onPress={() => void toggleDailyHabit(habit)}
      style={({ pressed }) => [styles.task, rowPress, pressed && styles.pressed]}>
      <View pointerEvents="none" style={styles.copy}>
        <Text style={[styles.taskLabel, checked && styles.taskDone]}>{habit.label}</Text>
        <Text style={styles.state}>
          {checked ? 'Concluído' : periodLabels[habit.period]}
          {relevance ? ` · ${relevanceLabels[relevance]}` : ''}
        </Text>
      </View>
      <View pointerEvents="none" style={[styles.mark, checked && styles.markOn]} />
    </Pressable>
  );
}

export default function MyDayScreen() {
  const signedIn = useRequireSession();
  const params = useLocalSearchParams<{ data?: string | string[] }>();
  const selectedDate = parseDateKey(params.data);
  const board = useDailyBoard(selectedDate);
  const counts = dailyCounts(board.habits, board.completed);
  const userId = getSessionUserId();
  const waterHabit = hydrationHabit(board.habits);

  if (!signedIn) {
    return <View style={styles.blank} />;
  }

  return (
    <AppScreen>
      <View style={styles.links}>
        <TextButton label="Hoje" onPress={() => router.navigate('/inicio')} />
      </View>
      <View style={styles.header}>
        <Eyebrow>Evolução pessoal</Eyebrow>
        <PageTitle compact>Meu dia</PageTitle>
        <Meta>{board.dateKey ? `${formatLongDate(board.dateKey)} · ${formatCalendarDate(board.dateKey)}` : ''}</Meta>
      </View>

      {!board.ready ? <Text style={styles.note}>Carregando sua rotina.</Text> : null}

      {board.ready && board.habits.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.note}>Nenhum hábito na rotina.</Text>
        </View>
      ) : null}

      {board.ready && board.habits.length > 0 ? (
        <>
          <Text style={styles.percent}>{formatDailyPercent(counts.percent)}</Text>
          <Text style={styles.count}>
            {counts.done} de {counts.total} hábitos
          </Text>
          <View style={styles.track}>
            <DayProgress percent={counts.percent} />
          </View>
          <Meta>Evolução pessoal. Não altera o ranking.</Meta>
          {board.notice ? <Text style={styles.notice}>{board.notice}</Text> : null}

          {habitPeriods.map((period) => {
            const group = board.habits.filter(
              (habit) => habit.period === period && habit.catalogHabitId !== HYDRATION_HABIT_ID,
            );
            if (group.length === 0) {
              return null;
            }
            return (
              <View key={period} style={styles.group}>
                <Text style={styles.groupTitle}>{periodLabels[period]}</Text>
                {group.map((habit) => (
                  <HabitCheck key={habit.id} habit={habit} checked={isDailyHabitDone(habit, board.completed)} />
                ))}
              </View>
            );
          })}
        </>
      ) : null}

      {board.ready && userId && board.dateKey ? (
        <View style={styles.hydration}>
          <Text style={styles.groupTitle}>Hidratação</Text>
          {waterHabit ? <HabitCheck habit={waterHabit} checked={isDailyHabitDone(waterHabit, board.completed)} /> : null}
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
        <View style={styles.personalize}>
          <PrimaryButton label="Personalizar hábitos" onPress={() => router.push('/personalizar-habitos' as Href)} />
        </View>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  blank: {
    flex: 1,
    backgroundColor: ui.background,
  },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },
  header: {
    marginTop: 8,
    gap: 8,
  },
  percent: {
    marginTop: 28,
    color: ui.text,
    fontFamily: fonts.textLight,
    fontSize: 64,
    lineHeight: 72,
  },
  count: {
    marginTop: 4,
    marginBottom: 16,
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 14,
    lineHeight: 20,
  },
  track: {
    marginBottom: 12,
  },
  group: {
    marginTop: 28,
  },
  groupTitle: {
    marginBottom: 6,
    color: ui.champagne,
    fontFamily: fonts.text,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  task: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: ui.lineSoft,
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  taskLabel: {
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 16,
    lineHeight: 21,
  },
  taskDone: {
    color: ui.champagne,
  },
  state: {
    color: ui.faint,
    fontFamily: fonts.text,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  mark: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: ui.line,
  },
  markOn: {
    backgroundColor: ui.champagne,
    borderColor: ui.champagne,
  },
  empty: {
    marginTop: 28,
    gap: 16,
  },
  hydration: {
    marginTop: 32,
  },
  personalize: {
    marginTop: 28,
  },
  note: {
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
