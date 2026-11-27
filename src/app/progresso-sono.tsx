import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { PercentRing } from '@/components/progress-charts';
import { ProgressPlanet } from '@/components/progress-planet';
import { WellbeingChart } from '@/components/wellbeing-chart';
import { fonts, ui } from '@/constants/theme';
import { useAccountPlan } from '@/lib/account-plan';
import { sleepDetailInsight } from '@/lib/checkin-insights';
import { getSessionUserId } from '@/lib/accounts';
import { loadHabitLogsUntil, todayKey } from '@/lib/habit-day';
import { compareVsLabel, relativePercentDelta } from '@/lib/progress-compare';
import { visibleProgressPeriod } from '@/lib/progress-access';
import {
  getDailyBoard,
  isDailyHabitDone,
  refreshDailyBoard,
  scoreDailyHabits,
} from '@/lib/daily-board';
import { isOfficialHydration } from '@/lib/daily-score';
import {
  progressReport,
  type HabitLog,
  type ProgressPeriod,
  type TodayRoutine,
} from '@/lib/progress-view';
import {
  currentPeriodDates,
  previousPeriodDates,
  sleepAverage,
  wellbeingSeries,
  type SleepPoint,
} from '@/lib/progress-wellbeing';
import { useRequireSession } from '@/lib/require-session';
import { loadSleepUntil } from '@/lib/sleep-store';

function asPeriod(value: string | string[] | undefined): ProgressPeriod {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'semana' || raw === 'mes' || raw === 'ano') {
    return raw;
  }
  return 'dia';
}

export default function ProgressoSonoScreen() {
  const signedIn = useRequireSession();
  const access = useAccountPlan();
  const params = useLocalSearchParams<{ period?: string }>();
  const requested = asPeriod(params.period);
  const period = visibleProgressPeriod(access.plan, requested);
  const [sleep, setSleep] = useState<SleepPoint[]>([]);
  const [habitScore, setHabitScore] = useState<number | null>(null);
  const [series, setSeries] = useState<ReturnType<typeof wellbeingSeries> | null>(null);
  const [notice, setNotice] = useState('');

  useFocusEffect(
    useCallback(() => {
      const userId = getSessionUserId();
      if (!userId) {
        return;
      }
      let active = true;
      const today = todayKey();
      void (async () => {
        await refreshDailyBoard(userId, today);
        const [sleepLoad, logs] = await Promise.all([loadSleepUntil(userId, today), loadHabitLogsUntil(userId, today)]);
        if (!active) {
          return;
        }
        if (!sleepLoad.ok) {
          setNotice(sleepLoad.message);
        }
        const board = getDailyBoard();
        let routine: TodayRoutine | null = null;
        if (board.ready && board.dateKey === today) {
          const score = scoreDailyHabits(board.habits, board.completed);
          routine = { total: score.total, completed: score.done };
        }
        const habitLogs: HabitLog[] = logs.ok ? logs.rows : [];
        const todayHabits =
          board.ready && board.dateKey === today
            ? board.habits
                .filter((habit) => !isOfficialHydration(habit.catalogHabitId))
                .map((habit) => ({
                  id: habit.userHabitId ?? habit.id,
                  label: habit.label,
                  pillar: habit.pillar,
                  catalogHabitId: habit.catalogHabitId,
                  done: isDailyHabitDone(habit, board.completed),
                }))
            : null;
        const report = progressReport({
          today,
          period,
          logs: habitLogs,
          hydration: [],
          todayRoutine: routine,
          habits: (todayHabits ?? []).map((habit) => ({
            id: habit.id,
            label: habit.label,
            pillar: habit.pillar,
            catalogHabitId: habit.catalogHabitId,
          })),
          todayHabits,
          activatedOn: null,
        });
        const sleepRows = sleepLoad.ok ? sleepLoad.rows.map((row) => ({ localDate: row.localDate, score: row.score })) : [];
        const wellbeing = wellbeingSeries({
          today,
          period,
          sleep: sleepRows,
          mood: [],
          habits: report.habitPoints,
        });
        setSleep(sleepRows);
        setHabitScore(report[period]);
        setSeries(wellbeing);
      })();
      return () => {
        active = false;
      };
    }, [period]),
  );

  if (!signedIn) {
    return <View style={styles.blank} />;
  }

  const prev = previousPeriodDates(todayKey(), period);
  const compare = relativePercentDelta(
    series?.sleepScore ?? null,
    sleepAverage(
      prev,
      sleep,
    ),
  );
  const insight = sleepDetailInsight(series?.sleepScore ?? null, habitScore);

  return (
    <AppScreen tight backgroundColor="#050505" backdrop={<ProgressPlanet />}>
      <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backLabel}>‹ Voltar</Text>
      </Pressable>
      <Text accessibilityRole="header" style={styles.title}>
        Sono
      </Text>
      <Text style={styles.period}>{period.toUpperCase()}</Text>

      <View style={styles.hero}>
        <PercentRing percent={series?.sleepScore ?? null} size={132} caption="Score de sono" />
        <View style={styles.meta}>
          <Text style={styles.metaLabel}>Meta de sono: 8h</Text>
          <Text style={styles.metaCompare}>{compareVsLabel(period, compare)}</Text>
        </View>
      </View>

      {notice ? <Text style={styles.note}>{notice}</Text> : null}

      <View style={styles.chart}>
        <WellbeingChart
          labels={series?.labels ?? []}
          habits={[]}
          sleep={series?.sleep ?? []}
          mood={[]}
        />
      </View>

      <View style={styles.insight}>
        <Text style={styles.insightText}>{insight}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(`/progresso?period=${period}` as Href)}
        style={styles.link}>
        <Text style={styles.linkLabel}>Voltar ao progresso</Text>
      </Pressable>
      {currentPeriodDates(todayKey(), period).length ? null : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: '#050505' },
  back: { alignSelf: 'flex-start', paddingVertical: 4 },
  backLabel: { color: ui.champagne, fontFamily: fonts.display, fontSize: 14, letterSpacing: 0.6, textTransform: 'uppercase' },
  title: {
    marginTop: 8,
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 26,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  period: {
    marginTop: 4,
    color: '#6EB6F2',
    fontFamily: fonts.display,
    fontSize: 11,
    letterSpacing: 1.4,
  },
  hero: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  meta: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(110,182,242,0.35)',
    backgroundColor: '#071018',
    padding: 12,
    gap: 8,
  },
  metaLabel: { color: '#8FB4D4', fontFamily: fonts.display, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase' },
  metaCompare: { color: ui.text, fontFamily: fonts.textMedium, fontSize: 15 },
  chart: {
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(110,182,242,0.2)',
    backgroundColor: 'rgba(8,8,8,0.72)',
    padding: 12,
  },
  insight: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(230,193,74,0.4)',
    padding: 12,
  },
  insightText: { color: ui.text, fontFamily: fonts.text, fontSize: 12, lineHeight: 17, textTransform: 'uppercase' },
  note: { marginTop: 10, color: ui.muted, fontFamily: fonts.text, fontSize: 13 },
  link: { marginTop: 16, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  linkLabel: { color: ui.champagne, fontFamily: fonts.display, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' },
});
