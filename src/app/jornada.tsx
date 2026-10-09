import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AppScreen, Eyebrow, TextButton, Track } from '@/components/app-screen';
import { fonts, ui } from '@/constants/theme';
import { dailyCounts, toggleDailyHabit, type DailyHabit } from '@/lib/daily-board';
import { useDailyBoard } from '@/lib/use-daily-board';
import { formatCalendarDate, formatDailyPercent } from '@/lib/habit-day';
import { useRequireSession } from '@/lib/require-session';

const periodTitles: { id: DailyHabit['period']; title: string }[] = [
  { id: 'manha', title: 'Manhã' },
  { id: 'tarde', title: 'Tarde' },
  { id: 'noite', title: 'Noite' },
];

export default function RoutineScreen() {
  const signedIn = useRequireSession();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const board = useDailyBoard();
  const counts = dailyCounts(board.habits, board.completed);

  if (!signedIn) {
    return <View style={styles.blank} />;
  }

  return (
    <AppScreen>
      <TextButton label="Hoje" onPress={() => router.navigate('/inicio')} />
      <View style={styles.header}>
        <Eyebrow>Hoje</Eyebrow>
        <Text style={styles.count}>
          {counts.done} de {counts.total} concluídos
        </Text>
        <Text style={styles.day}>{board.dateKey ? `${formatCalendarDate(board.dateKey)} · ${formatDailyPercent(counts.percent)}` : ''}</Text>
      </View>
      <Track percent={counts.percent} />

      <View style={[styles.periods, wide && styles.periodsWide]}>
        {periodTitles.map((period) => {
          const tasks = board.habits.filter((habit) => habit.period === period.id);
          if (tasks.length === 0) {
            return null;
          }
          return (
            <View key={period.id} style={[styles.period, wide && styles.periodWide]}>
              <Text style={styles.periodTitle}>{period.title}</Text>
              {tasks.map((habit) => {
                const checked = habit.userHabitId !== null && board.completed.has(habit.userHabitId);
                return (
                  <Pressable
                    key={habit.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    accessibilityLabel={habit.label}
                    onPress={() => void toggleDailyHabit(habit)}
                    style={({ pressed }) => [styles.task, pressed && styles.pressed]}>
                    <View style={styles.copy}>
                      <Text style={[styles.taskLabel, checked && styles.taskDone]}>{habit.label}</Text>
                      <Text style={styles.state}>{checked ? 'Concluído' : period.title}</Text>
                    </View>
                    <View style={[styles.mark, checked && styles.markOn]} />
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  blank: {
    flex: 1,
    backgroundColor: ui.background,
  },
  header: {
    marginTop: 18,
    marginBottom: 18,
    gap: 8,
  },
  count: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  day: {
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 13,
    letterSpacing: 0.4,
  },
  periods: {
    marginTop: 28,
    gap: 28,
  },
  periodsWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 22,
  },
  period: {
    gap: 0,
  },
  periodWide: {
    flex: 1,
  },
  periodTitle: {
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
  pressed: {
    opacity: 0.72,
  },
});
