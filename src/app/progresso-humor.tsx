import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { InsightCard } from '@/components/insight-card';
import { MoodCheckinModal } from '@/components/mood-checkin-modal';
import { PercentRing } from '@/components/progress-charts';
import { ProgressPlanet } from '@/components/progress-planet';
import { WellbeingChart } from '@/components/wellbeing-chart';
import { fonts, ui } from '@/constants/theme';
import { useAccountPlan } from '@/lib/account-plan';
import { moodDetailInsight } from '@/lib/checkin-insights';
import { getSessionUserId } from '@/lib/accounts';
import { formatDailyPercent, loadHabitLogsUntil, todayKey } from '@/lib/habit-day';
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
  moodAverage,
  moodPeriodBreakdown,
  previousPeriodDates,
  wellbeingSeries,
  type MoodPoint,
} from '@/lib/progress-wellbeing';
import { useRequireSession } from '@/lib/require-session';
import { moodPeriodAt, type MoodPeriod } from '@/lib/mood-score';
import { loadMoodUntil, saveMoodCheckin } from '@/lib/mood-store';

function faceForLevel(level: number) {
  if (level <= 2) return '☹';
  if (level <= 4) return '😕';
  if (level <= 6) return '😐';
  if (level <= 8) return '🙂';
  return '☺';
}

const periodTitle = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
} as const;

function asPeriod(value: string | string[] | undefined): ProgressPeriod {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'semana' || raw === 'mes' || raw === 'ano') {
    return raw;
  }
  return 'dia';
}

export default function ProgressoHumorScreen() {
  const signedIn = useRequireSession();
  const access = useAccountPlan();
  const params = useLocalSearchParams<{ period?: string }>();
  const requested = asPeriod(params.period);
  const period = visibleProgressPeriod(access.plan, requested);
  const [mood, setMood] = useState<MoodPoint[]>([]);
  const [habitScore, setHabitScore] = useState<number | null>(null);
  const [series, setSeries] = useState<ReturnType<typeof wellbeingSeries> | null>(null);
  const [notice, setNotice] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [editPeriod, setEditPeriod] = useState<MoodPeriod>(moodPeriodAt());

  useFocusEffect(
    useCallback(() => {
      const userId = getSessionUserId();
      if (!userId) {
        return;
      }
      let active = true;
      const today = todayKey();
      void reloadKey;
      void (async () => {
        await refreshDailyBoard(userId, today);
        const [moodLoad, logs] = await Promise.all([loadMoodUntil(userId, today), loadHabitLogsUntil(userId, today)]);
        if (!active) {
          return;
        }
        if (!moodLoad.ok) {
          setNotice(moodLoad.message);
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
        const rows = moodLoad.ok
          ? moodLoad.rows.map((row) => ({
              localDate: row.localDate,
              period: row.period,
              score: row.score,
              level: row.level,
            }))
          : [];
        const wellbeing = wellbeingSeries({
          today,
          period,
          sleep: [],
          mood: rows,
          habits: report.habitPoints,
        });
        setMood(rows);
        setHabitScore(report[period]);
        setSeries(wellbeing);
      })();
      return () => {
        active = false;
      };
    }, [period, reloadKey]),
  );

  if (!signedIn) {
    return <View style={styles.blank} />;
  }

  const today = todayKey();
  const prev = previousPeriodDates(today, period);
  const compare = relativePercentDelta(series?.moodScore ?? null, moodAverage(prev, mood));
  const insight = moodDetailInsight(series?.moodScore ?? null);
  const breakdown = moodPeriodBreakdown(today, mood);
  const answered = breakdown.filter((item) => item.score != null).length;

  return (
    <AppScreen tight backgroundColor="#050505" backdrop={<ProgressPlanet />}>
      <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backLabel}>‹ Voltar</Text>
      </Pressable>
      <Text accessibilityRole="header" style={styles.title}>
        Humor
      </Text>
      <Text style={styles.period}>{period.toUpperCase()}</Text>

      <View style={styles.hero}>
        <PercentRing percent={series?.moodScore ?? null} size={132} caption="Score de humor" />
        <View style={styles.meta}>
          <Text style={styles.metaLabel}>
            {period === 'dia' ? `${answered} de 3 registros` : 'Média dos dias respondidos'}
          </Text>
          <Text style={styles.metaCompare}>{compareVsLabel(period, compare)}</Text>
          {habitScore != null ? <Text style={styles.metaLine}>Hábitos: {formatDailyPercent(habitScore)}</Text> : null}
        </View>
      </View>

      {period === 'dia' ? (
        <View style={styles.slots}>
          {breakdown.map((item) => (
            <Pressable
              key={item.period}
              accessibilityRole="button"
              onPress={() => {
                setEditPeriod(item.period);
                setModalOpen(true);
              }}
              style={styles.slot}>
              <Text style={styles.slotTitle}>{periodTitle[item.period]}</Text>
              {item.level != null ? (
                <>
                  <Text style={styles.slotFace}>{faceForLevel(item.level)}</Text>
                  <Text style={styles.slotScore}>{item.level}/10</Text>
                  <Text style={styles.slotScore}>{formatDailyPercent(item.score ?? 0)}</Text>
                </>
              ) : (
                <Text style={styles.slotEmpty}>Sem registro</Text>
              )}
            </Pressable>
          ))}
        </View>
      ) : null}

      {notice ? <Text style={styles.note}>{notice}</Text> : null}

      <View style={styles.chart}>
        <WellbeingChart
          labels={series?.labels ?? []}
          habits={series?.habit ?? []}
          sleep={series?.sleep ?? []}
          mood={series?.mood ?? []}
          highlight="mood"
          lineStyle={series?.lineStyle ?? 'curve'}
          timed={series?.timed}
        />
      </View>

      <InsightCard message={insight} />

      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setEditPeriod(moodPeriodAt());
          setModalOpen(true);
        }}
        style={styles.register}>
        <Text style={styles.registerLabel}>Registrar / atualizar humor</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(`/progresso?period=${period}` as Href)}
        style={styles.link}>
        <Text style={styles.linkLabel}>Voltar ao progresso</Text>
      </Pressable>
      {currentPeriodDates(today, period).length ? null : null}

      <MoodCheckinModal
        visible={modalOpen}
        period={editPeriod}
        busy={busy}
        notice={notice}
        allowPeriodPick
        onSave={(level, nextPeriod, note) => {
          const userId = getSessionUserId();
          if (!userId) {
            return;
          }
          setBusy(true);
          void saveMoodCheckin(userId, { period: nextPeriod, level, note }).then((result) => {
            setBusy(false);
            if (!result.ok) {
              setNotice(result.message);
              return;
            }
            setModalOpen(false);
            setNotice('');
            setReloadKey((key) => key + 1);
          });
        }}
        onDismiss={() => setModalOpen(false)}
      />
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
    color: '#E6C14A',
    fontFamily: fonts.display,
    fontSize: 11,
    letterSpacing: 1.4,
  },
  hero: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  meta: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(230,193,74,0.35)',
    backgroundColor: 'rgba(10,10,10,0.85)',
    padding: 12,
    gap: 8,
  },
  metaLabel: { color: ui.muted, fontFamily: fonts.display, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase' },
  metaCompare: { color: ui.text, fontFamily: fonts.textMedium, fontSize: 15 },
  metaLine: { color: ui.muted, fontFamily: fonts.text, fontSize: 12 },
  slots: { marginTop: 14, flexDirection: 'row', gap: 8 },
  slot: {
    flex: 1,
    minWidth: 0,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(230,193,74,0.28)',
    backgroundColor: '#0A0A0A',
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 4,
  },
  slotTitle: {
    color: ui.champagne,
    fontFamily: fonts.display,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  slotFace: { fontSize: 22, lineHeight: 26 },
  slotScore: { color: ui.text, fontFamily: fonts.textMedium, fontSize: 13 },
  slotEmpty: { color: ui.muted, fontFamily: fonts.text, fontSize: 11, textAlign: 'center' },
  chart: {
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(230,193,74,0.2)',
    backgroundColor: 'rgba(8,8,8,0.72)',
    padding: 12,
  },
  note: { marginTop: 10, color: ui.muted, fontFamily: fonts.text, fontSize: 13 },
  register: {
    marginTop: 14,
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: '#E8C99B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerLabel: {
    color: '#141210',
    fontFamily: fonts.display,
    fontSize: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  link: { marginTop: 16, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  linkLabel: { color: ui.champagne, fontFamily: fonts.display, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' },
});
