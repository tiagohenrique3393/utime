import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen, TextButton } from '@/components/app-screen';
import { fonts, ui } from '@/constants/theme';
import { getSessionUserId } from '@/lib/accounts';
import { dayOutcome, dayStatusLabel, type DayMark } from '@/lib/constancy';
import { getCatalogHabits, getUserHabits, habitTitle, hydrateHabitRoutine } from '@/lib/habit-catalog';
import { dailyPercent, formatCalendarDate, formatDailyPercent, formatLongDate, loadHabitDayLogs, parseDateKey, todayKey } from '@/lib/habit-day';
import { useRequireSession } from '@/lib/require-session';

const page = '#050505';

type HabitLine = {
  id: string;
  title: string;
  completed: boolean;
};

export default function DayConsultationScreen() {
  const signedIn = useRequireSession();
  const params = useLocalSearchParams<{ data?: string | string[] }>();
  const date = parseDateKey(params.data);
  const today = todayKey();
  const allowed = date !== null && date <= today;
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [notice, setNotice] = useState('');
  const [lines, setLines] = useState<HabitLine[]>([]);
  const [mark, setMark] = useState<DayMark>({ planned: 0, done: 0 });

  useFocusEffect(
    useCallback(() => {
      if (!signedIn) {
        return;
      }
      const selected = parseDateKey(params.data);
      const current = todayKey();
      if (!selected || selected > current) {
        router.replace('/constancia' as Href);
        return;
      }
      const userId = getSessionUserId();
      if (!userId) {
        return;
      }
      let active = true;
      void (async () => {
        await hydrateHabitRoutine(userId);
        const logs = await loadHabitDayLogs(userId, selected);
        if (!active) {
          return;
        }
        if (selected > todayKey()) {
          router.replace('/constancia' as Href);
          return;
        }
        if (!logs.ok) {
          setPhase('error');
          setNotice(logs.message);
          return;
        }
        const titles = new Map(getUserHabits().map((habit) => [habit.id, habitTitle(habit, getCatalogHabits())]));
        const order = new Map(getUserHabits().map((habit) => [habit.id, habit.sortOrder]));
        const byHabit = new Map<string, boolean>();
        for (const row of logs.rows) {
          byHabit.set(row.habitId, row.completed);
        }
        let done = 0;
        const next = [...byHabit.entries()].map(([id, completed]) => {
          if (completed) {
            done += 1;
          }
          return { id, title: titles.get(id) ?? 'Hábito', completed };
        });
        next.sort(
          (left, right) =>
            (order.get(left.id) ?? 100000) - (order.get(right.id) ?? 100000) ||
            left.title.localeCompare(right.title, 'pt-BR'),
        );
        setLines(next);
        setMark({ planned: byHabit.size, done });
        setNotice('');
        setPhase('ready');
      })();
      return () => {
        active = false;
      };
    }, [params.data, signedIn]),
  );

  if (!signedIn || !allowed || !date) {
    return <View style={styles.blocked} />;
  }

  const outcome = dayOutcome(mark, date, today);
  const percent = dailyPercent(mark.planned, mark.done);

  return (
    <AppScreen width="narrow" backgroundColor={page}>
      <TextButton label="Constância" onPress={() => router.replace('/constancia' as Href)} />
      <Text accessibilityRole="header" style={styles.title}>
        {formatLongDate(date)}
      </Text>
      <Text style={styles.date}>{formatCalendarDate(date)}</Text>
      <Text style={styles.readOnly}>Somente leitura</Text>

      {phase === 'loading' ? <Text style={styles.note}>Carregando este dia.</Text> : null}
      {phase === 'error' ? <Text style={styles.note}>{notice}</Text> : null}

      {phase === 'ready' ? (
        <View style={styles.panel}>
          <Text style={styles.status}>{dayStatusLabel(outcome)}</Text>
          {mark.planned > 0 ? (
            <Text style={styles.percent}>{formatDailyPercent(percent)}</Text>
          ) : null}
          <Text style={styles.count}>
            {mark.done} de {mark.planned} {mark.planned === 1 ? 'hábito concluído' : 'hábitos concluídos'}
          </Text>
          {lines.map((line) => (
            <View key={line.id} style={styles.row}>
              <Text style={styles.habit}>{line.title}</Text>
              <Text style={[styles.state, line.completed && styles.stateOn]}>{line.completed ? 'Concluído' : 'Não concluído'}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  blocked: {
    flex: 1,
    backgroundColor: page,
  },
  title: {
    marginTop: 12,
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 32,
    lineHeight: 36,
    textTransform: 'capitalize',
  },
  date: {
    marginTop: 6,
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 13,
  },
  readOnly: {
    marginTop: 10,
    color: ui.champagne,
    fontFamily: fonts.text,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  note: {
    marginTop: 24,
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 14,
  },
  panel: {
    marginTop: 22,
    gap: 10,
  },
  status: {
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 16,
    lineHeight: 22,
  },
  percent: {
    color: ui.champagne,
    fontFamily: fonts.textMedium,
    fontSize: 32,
    lineHeight: 36,
  },
  count: {
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 13,
  },
  row: {
    marginTop: 8,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(243, 239, 232, 0.08)',
    gap: 4,
  },
  habit: {
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 16,
    lineHeight: 22,
  },
  state: {
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 12,
  },
  stateOn: {
    color: ui.champagne,
  },
});
