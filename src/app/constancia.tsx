import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen, Eyebrow } from '@/components/app-screen';
import { ConsistencyCalendar } from '@/components/consistency-calendar';
import { fonts, ui } from '@/constants/theme';
import { getSessionUserId } from '@/lib/accounts';
import { dailyCounts, getDailyBoard, refreshDailyBoard } from '@/lib/daily-board';
import { loadHabitLogsUntil, saoPauloCalendarDate, todayKey } from '@/lib/habit-day';
import { completionRate, consistentHabits, streakStats } from '@/lib/journey-view';
import { recordedPercents, type TodayRoutine } from '@/lib/progress-view';
import { useRequireSession } from '@/lib/require-session';
import { useJourneyBoard } from '@/lib/tasks';

export default function ConstancyScreen() {
  const signedIn = useRequireSession();
  const journey = useJourneyBoard();
  const [today, setToday] = useState<Date | null>(null);
  const [percents, setPercents] = useState<Record<string, number> | null>(null);
  const streaks = streakStats(journey);
  const rate = completionRate(journey);
  const habits = consistentHabits(journey, 3);

  useEffect(() => {
    setToday(saoPauloCalendarDate());
  }, []);

  useEffect(() => {
    const userId = getSessionUserId();
    if (!userId) {
      return;
    }
    let active = true;
    const day = todayKey();
    void (async () => {
      const [, logs] = await Promise.all([refreshDailyBoard(userId, day), loadHabitLogsUntil(userId, day)]);
      if (!active || !logs.ok) {
        return;
      }
      const board = getDailyBoard();
      let routine: TodayRoutine | null = null;
      if (board.ready && board.dateKey === day) {
        const counts = dailyCounts(board.habits, board.completed);
        routine = { total: counts.total, completed: counts.done };
      }
      setPercents(recordedPercents(logs.rows, day, routine));
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!signedIn) {
    return <View style={styles.blocked} />;
  }

  return (
    <AppScreen width="narrow">
      <View style={styles.header}>
        <Eyebrow>Constância</Eyebrow>
        <Text accessibilityRole="header" style={styles.figure}>
          {streaks.current}
        </Text>
        <Text style={styles.figureLabel}>Sequência atual</Text>
        <Text style={styles.record}>Recorde {streaks.best} {streaks.best === 1 ? 'dia' : 'dias'}</Text>
      </View>

      <View style={styles.calendar}>
        {today ? (
          <ConsistencyCalendar
            source={journey}
            today={today}
            onOpenDay={(dateKey) => router.push(`/meu-dia?data=${dateKey}` as Href)}
            percents={percents}
          />
        ) : null}
      </View>

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Taxa de conclusão</Text>
          <Text style={styles.metricValue}>{rate.percent}%</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Hábitos mais consistentes</Text>
          {habits.length === 0 ? (
            <Text style={styles.habit}>Ainda sem hábitos concluídos.</Text>
          ) : (
            habits.map((habit) => (
              <Text key={habit.label} style={styles.habit}>
                {habit.label}
              </Text>
            ))
          )}
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  blocked: {
    flex: 1,
    backgroundColor: ui.background,
  },
  header: {
    marginTop: 18,
  },
  figure: {
    marginTop: 8,
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 72,
    lineHeight: 76,
  },
  figureLabel: {
    color: ui.champagne,
    fontFamily: fonts.text,
    fontSize: 12,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  record: {
    marginTop: 10,
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 14,
  },
  calendar: {
    marginTop: 32,
    minHeight: 280,
  },
  metrics: {
    marginTop: 36,
    gap: 22,
  },
  metric: {
    gap: 6,
  },
  metricLabel: {
    color: ui.champagne,
    fontFamily: fonts.text,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  metricValue: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 32,
    lineHeight: 36,
  },
  habit: {
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 16,
    lineHeight: 24,
  },
});
