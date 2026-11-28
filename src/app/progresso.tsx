import { Image } from 'expo-image';
import { router, useFocusEffect, type Href } from 'expo-router';
import { createElement, useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { InsightCard } from '@/components/insight-card';
import { ProgressPlanet } from '@/components/progress-planet';
import { PercentRing } from '@/components/progress-charts';
import { WellbeingChart } from '@/components/wellbeing-chart';
import { fonts, ui } from '@/constants/theme';
import { useAccountPlan } from '@/lib/account-plan';
import { progressInsight } from '@/lib/checkin-insights';
import { openPremiumScreen } from '@/lib/premium-nav';
import { compareVsLabel, relativePercentDelta } from '@/lib/progress-compare';
import { progressPeriodOnPress, visibleProgressPeriod } from '@/lib/progress-access';
import { getProgressColor, type ProgressBand } from '@/lib/progress-color';
import { getProfileSnapshot, subscribeProfile } from '@/lib/profile';
import { getSessionCreatedAt, getSessionUserId } from '@/lib/accounts';
import { getDailyBoard, isDailyHabitDone, refreshDailyBoard, scoreDailyHabits, subscribeDailyBoard } from '@/lib/daily-board';
import { isOfficialHydration } from '@/lib/daily-score';
import { getCatalogHabits, getUserHabits, habitTitle } from '@/lib/habit-catalog';
import {
  formatDailyPercent,
  loadHabitCompletionEvents,
  loadHabitLogsUntil,
  todayKey,
  type HabitCompletionEventRow,
} from '@/lib/habit-day';
import { formatHydrationPercent, hydrationFill, hydrationPercent, loadHydrationUntil } from '@/lib/hydration';
import { loadMoodUntil } from '@/lib/mood-store';
import {
  activationDateKey,
  averagePercent,
  habitPercentOn,
  hydrationLoadThrough,
  progressReport,
  type HabitLog,
  type HydrationLog,
  type PillarProgress,
  type ProgressHabit,
  type ProgressPeriod,
  type ProgressReport,
  type TodayProgressHabit,
  type TodayRoutine,
} from '@/lib/progress-view';
import {
  previousPeriodDates,
  wellbeingSeries,
  type MoodPoint,
  type SleepPoint,
} from '@/lib/progress-wellbeing';
import { useRequireSession } from '@/lib/require-session';
import { loadSleepUntil } from '@/lib/sleep-store';

const page = '#050505';
const waterBlue = '#6EB6F2';
const sleepBlue = '#6EB6F2';
const moodGold = '#E6C14A';
const habitGreen = '#39FF73';
const corpoMale = require('@/assets/pillars/corpo-mantime.png');
const corpoFemale = require('@/assets/pillars/corpo-womantime.png');
const menteFigure = require('@/assets/pillars/mente.png');
const espiritoFigure = require('@/assets/pillars/espirito.png');

const pillarBands: Record<ProgressBand, { line: string; glow: string }> = {
  red: { line: '#FF3B4D', glow: 'rgba(255, 59, 77, 0.9)' },
  green: { line: '#39FF73', glow: 'rgba(57, 255, 115, 0.9)' },
  gold: { line: '#FFC94A', glow: 'rgba(255, 201, 74, 0.95)' },
};

const periods: { id: ProgressPeriod; label: string; premium: boolean }[] = [
  { id: 'dia', label: 'Dia', premium: false },
  { id: 'semana', label: 'Semana', premium: true },
  { id: 'mes', label: 'Mês', premium: true },
  { id: 'ano', label: 'Ano', premium: true },
];

const pillarName: Record<PillarProgress['pillar'], string> = {
  corpo: 'Corpo',
  mente: 'Mente',
  espirito: 'Espírito',
};

type Snapshot = {
  today: string;
  logs: HabitLog[];
  hydration: HydrationLog[];
  sleep: SleepPoint[];
  mood: MoodPoint[];
  dayEvents: HabitCompletionEventRow[];
  routine: TodayRoutine | null;
  habits: ProgressHabit[];
  todayHabits: TodayProgressHabit[] | null;
  activatedOn: string | null;
};

function formatLiters(ml: number) {
  const liters = Math.max(0, ml) / 1000;
  const text = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(liters);
  return `${text} L`;
}

function captureHabits(today: string) {
  const catalog = getCatalogHabits();
  const habits = getUserHabits().map((habit) => ({
    id: habit.id,
    label: habitTitle(habit, catalog),
    pillar: habit.pillar,
    catalogHabitId: habit.catalogHabitId,
  }));
  const board = getDailyBoard();
  if (!board.ready || board.dateKey !== today) {
    return { habits, routine: null as TodayRoutine | null, todayHabits: null as TodayProgressHabit[] | null };
  }
  const score = scoreDailyHabits(board.habits, board.completed);
  const todayHabits = board.habits
    .filter((habit) => !isOfficialHydration(habit.catalogHabitId))
    .map((habit) => ({
      id: habit.userHabitId ?? habit.id,
      label: habit.label,
      pillar: habit.pillar,
      catalogHabitId: habit.catalogHabitId,
      done: isDailyHabitDone(habit, board.completed),
    }));
  return { habits, routine: { total: score.total, completed: score.done }, todayHabits };
}

function glyph(type: string, props: Record<string, unknown> | null, ...children: ReactNode[]) {
  return createElement(type, props, ...children);
}

function Drop() {
  if (Platform.OS !== 'web') {
    return <View style={[styles.iconFallback, styles.iconFallbackBlue]} />;
  }
  return glyph(
    'svg',
    { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
    glyph('path', {
      d: 'M8 1.4C8 1.4 3.1 7 3.1 10.1a4.9 4.9 0 0 0 9.8 0C12.9 7 8 1.4 8 1.4z',
      stroke: waterBlue,
      strokeWidth: 1.2,
      strokeLinejoin: 'round',
    }),
  );
}

function figureFor(id: PillarProgress['pillar'], feminine: boolean) {
  if (id === 'corpo') {
    return feminine ? corpoFemale : corpoMale;
  }
  if (id === 'mente') {
    return menteFigure;
  }
  return espiritoFigure;
}

function DialRing({ percent, size }: { percent: number | null; size: number }) {
  const tone = percent == null ? null : pillarBands[getProgressColor(percent)];
  const safe = percent == null ? 0 : Math.max(0, Math.min(100, percent));
  if (Platform.OS !== 'web') {
    return <View style={[styles.dialFallback, { borderColor: tone?.line ?? 'rgba(255,255,255,0.16)', borderRadius: size / 2 }]} />;
  }
  const stroke = Math.max(2, size * 0.055);
  const radius = size / 2 - stroke - 1;
  const turn = 2 * Math.PI * radius;
  const dash = (safe / 100) * turn;
  return glyph(
    'svg',
    { width: size, height: size, viewBox: `0 0 ${size} ${size}`, 'aria-hidden': true, style: { position: 'absolute', top: 0, left: 0 } },
    glyph('circle', { cx: size / 2, cy: size / 2, r: radius, fill: 'none', stroke: 'rgba(255,255,255,0.16)', strokeWidth: Math.max(1, stroke * 0.45) }),
    tone && safe > 0
      ? glyph('circle', {
          cx: size / 2,
          cy: size / 2,
          r: radius,
          fill: 'none',
          stroke: tone.line,
          strokeWidth: stroke,
          strokeLinecap: 'round',
          strokeDasharray: `${dash} ${turn}`,
          transform: `rotate(-90 ${size / 2} ${size / 2})`,
          style: { filter: `drop-shadow(0 0 4px ${tone.glow})` },
        })
      : null,
  );
}

function HoloDial({
  id,
  percent,
  feminine,
  size,
}: {
  id: PillarProgress['pillar'];
  percent: number | null;
  feminine: boolean;
  size: number;
}) {
  const inset = Math.round(size * 0.14);
  return (
    <View style={{ width: size, height: size }}>
      <View style={[styles.portrait, { top: inset, right: inset, bottom: inset, left: inset, borderRadius: size }]}>
        <Image source={figureFor(id, feminine)} contentFit="cover" style={styles.portraitImage} />
      </View>
      <DialRing percent={percent} size={size} />
    </View>
  );
}

export default function ProgressScreen() {
  const signedIn = useRequireSession();
  const access = useAccountPlan();
  const { width, height } = useWindowDimensions();
  const profile = useSyncExternalStore(subscribeProfile, getProfileSnapshot, getProfileSnapshot);
  const [period, setPeriod] = useState<ProgressPeriod>('dia');
  const visiblePeriod = visibleProgressPeriod(access.plan, period);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [notice, setNotice] = useState('');
  const [waterNotice, setWaterNotice] = useState('');
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const dense = height < 780;
  const ringSize = Math.round(Math.min(dense ? 118 : 136, Math.max(108, width * 0.32)));
  const compact = width < 380;
  const feminine = profile.journey === 'womantime';
  const board = useSyncExternalStore(subscribeDailyBoard, getDailyBoard, getDailyBoard);

  useFocusEffect(
    useCallback(() => {
      const userId = getSessionUserId();
      if (!userId) {
        return;
      }
      let active = true;
      const today = todayKey();
      const horizon = hydrationLoadThrough(today);
      void (async () => {
        const [, logs, water, sleep, mood, dayEvents, createdAt] = await Promise.all([
          refreshDailyBoard(userId, today),
          loadHabitLogsUntil(userId, today),
          loadHydrationUntil(userId, horizon),
          loadSleepUntil(userId, today),
          loadMoodUntil(userId, today),
          loadHabitCompletionEvents(userId, today),
          getSessionCreatedAt(),
        ]);
        if (!active) {
          return;
        }
        const captured = captureHabits(today);
        setNotice(logs.ok ? '' : logs.message);
        setWaterNotice(water.ok ? '' : water.message);
        setSnapshot({
          today,
          logs: logs.ok ? logs.rows : [],
          hydration: water.ok ? water.rows : [],
          sleep: sleep.ok
            ? sleep.rows.map((row) => ({
                localDate: row.localDate,
                score: row.score,
                hours: row.hours,
                quality: row.quality,
                goalHours: row.goalHours,
              }))
            : [],
          mood: mood.ok
            ? mood.rows.map((row) => ({
                localDate: row.localDate,
                period: row.period,
                score: row.score,
                level: row.level,
              }))
            : [],
          dayEvents: dayEvents.ok ? dayEvents.rows : [],
          routine: captured.routine,
          habits: captured.habits,
          todayHabits: captured.todayHabits,
          activatedOn: activationDateKey(createdAt),
        });
        setPhase(logs.ok || water.ok ? 'ready' : 'error');
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  const liveToday = board.ready && board.dateKey === todayKey() ? captureHabits(board.dateKey) : null;
  const completedSignature = board.ready
    ? [...board.completed].sort().join('|')
    : '';

  const eventsDay = snapshot?.today ?? null;
  useEffect(() => {
    const userId = getSessionUserId();
    if (!userId || !eventsDay) {
      return;
    }
    let active = true;
    void loadHabitCompletionEvents(userId, eventsDay).then((events) => {
      if (!active || !events.ok) {
        return;
      }
      setSnapshot((current) => (current ? { ...current, dayEvents: events.rows } : current));
    });
    return () => {
      active = false;
    };
  }, [completedSignature, eventsDay]);

  const report = snapshot
    ? progressReport({
        today: liveToday ? board.dateKey : snapshot.today,
        period: visiblePeriod,
        logs: snapshot.logs,
        hydration: snapshot.hydration,
        todayRoutine: liveToday?.routine ?? snapshot.routine,
        habits: liveToday?.habits ?? snapshot.habits,
        todayHabits: liveToday?.todayHabits ?? snapshot.todayHabits,
        activatedOn: snapshot.activatedOn,
      })
    : null;

  if (!signedIn) {
    return <View style={styles.blank} />;
  }

  return (
    <AppScreen tight backgroundColor={page} backdrop={<ProgressPlanet bright={visiblePeriod !== 'dia'} />}>
      <Text style={styles.brand}>UTime</Text>
      <Text accessibilityRole="header" style={[styles.title, dense && styles.titleDense]}>
        Meu progresso
      </Text>
      <Text style={styles.subtitle}>Disciplina hoje. Liberdade sempre.</Text>
      <View style={[styles.segmentTrack, dense && styles.segmentTrackDense]}>
        {periods.map((item) => {
          const selected = item.id === visiblePeriod;
          const locked = item.premium && access.plan === 'free';
          const checking = item.premium && access.plan === 'unknown';
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: checking }}
              disabled={checking}
              onPress={() => {
                if (locked) {
                  openPremiumScreen('/progresso');
                  return;
                }
                const next = progressPeriodOnPress(access.plan, item.id);
                if (next) {
                  setPeriod(next);
                }
              }}
              style={[styles.segment, selected && styles.segmentOn]}>
              <Text numberOfLines={1} style={[styles.segmentLabel, compact && styles.segmentLabelCompact, selected && styles.segmentLabelOn]}>
                {item.label}
              </Text>
              {item.premium ? (
                <View style={[styles.premiumBadge, selected && styles.premiumBadgeOn]}>
                  <Text style={styles.premiumBadgeText}>Premium</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      {access.plan === 'unknown' && access.notice ? <Text style={styles.note}>{access.notice}</Text> : null}
      {phase === 'loading' ? <Text style={styles.note}>Carregando o seu progresso.</Text> : null}
      {notice ? <Text style={styles.note}>{notice}</Text> : null}
      {report && snapshot ? (
        <ProgressBody
          period={visiblePeriod}
          report={report}
          logs={snapshot.logs}
          routine={liveToday?.routine ?? snapshot.routine}
          todayHabits={liveToday?.todayHabits ?? snapshot.todayHabits}
          dayEvents={snapshot.dayEvents}
          sleep={snapshot.sleep}
          mood={snapshot.mood}
          waterNotice={waterNotice}
          ringSize={ringSize}
          feminine={feminine}
          dense={dense}
          today={liveToday ? board.dateKey : snapshot.today}
        />
      ) : null}
    </AppScreen>
  );
}

function MetricCard({
  title,
  color,
  percent,
  compare,
  onPress,
}: {
  title: string;
  color: string;
  percent: number | null;
  compare: string;
  onPress: () => void;
}) {
  const up = compare.includes('↗');
  const down = compare.includes('↘');
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.metricCard}>
      <Text style={[styles.metricTitle, { color }]}>{title}</Text>
      <Text style={styles.metricValue}>{percent == null ? '—' : formatDailyPercent(percent)}</Text>
      <Text style={[styles.metricCompare, up && styles.up, down && styles.down]}>{compare}</Text>
    </Pressable>
  );
}

function ProgressBody({
  period,
  report,
  logs,
  routine,
  todayHabits,
  dayEvents,
  sleep,
  mood,
  waterNotice,
  ringSize,
  feminine,
  dense,
  today,
}: {
  period: ProgressPeriod;
  report: ProgressReport;
  logs: readonly HabitLog[];
  routine: TodayRoutine | null;
  todayHabits: readonly TodayProgressHabit[] | null;
  dayEvents: readonly HabitCompletionEventRow[];
  sleep: readonly SleepPoint[];
  mood: readonly MoodPoint[];
  waterNotice: string;
  ringSize: number;
  feminine: boolean;
  dense: boolean;
  today: string;
}) {
  const habitScore = report[period];
  const dayCompletedIds = (todayHabits ?? []).filter((habit) => habit.done).map((habit) => habit.id);
  const series = wellbeingSeries({
    today,
    period,
    sleep,
    mood,
    habits: report.habitPoints,
    dayEvents: dayEvents.map((event) => ({
      habitId: event.habitId,
      completed: event.completed,
      recordedAt: event.recordedAt,
    })),
    dayPlanned: routine?.total ?? todayHabits?.length ?? 0,
    dayCompletedIds,
  });
  const prevDates = previousPeriodDates(today, period);
  const previousHabit = averagePercent(prevDates.map((key) => habitPercentOn(key, today, logs, routine)));
  const habitCompare = relativePercentDelta(habitScore, previousHabit);
  const sleepCompare = relativePercentDelta(
    series.sleepScore,
    averageOf(prevDates.map((key) => sleep.find((row) => row.localDate === key)?.score ?? null)),
  );
  const moodCompare = relativePercentDelta(
    series.moodScore,
    averageOf(
      prevDates.map((key) => {
        const scores = mood.filter((row) => row.localDate === key).map((row) => row.score);
        if (scores.length === 0) {
          return null;
        }
        return scores.reduce((sum, value) => sum + value, 0) / scores.length;
      }),
    ),
  );
  const insight = progressInsight(
    {
      habitPercent: habitScore,
      sleepPercent: series.sleepScore,
      moodPercent: series.moodScore,
      habitDelta: habitCompare.kind === 'delta' ? habitCompare.delta : null,
      sleepDelta: sleepCompare.kind === 'delta' ? sleepCompare.delta : null,
      moodDelta: moodCompare.kind === 'delta' ? moodCompare.delta : null,
    },
    period,
  );
  const dial = dense ? 48 : 54;
  const consumed = report.water.consumedMl;
  const goal = report.periodGoalMl;
  const waterPct = consumed != null && goal != null && goal > 0 ? hydrationPercent(consumed, goal) : null;
  const fill = waterPct == null ? 0 : hydrationFill(consumed ?? 0, goal);

  return (
    <>
      <View style={styles.heroRow}>
        <PercentRing percent={habitScore} size={ringSize} caption="Conclusão de hábitos" />
        <View style={styles.compareBox}>
          <Text style={styles.compareLabel}>Comparação</Text>
          <Text
            style={[
              styles.compareValue,
              habitCompare.kind === 'delta' && habitCompare.delta > 0 && styles.up,
              habitCompare.kind === 'delta' && habitCompare.delta < 0 && styles.down,
            ]}>
            {compareVsLabel(period, habitCompare)}
          </Text>
        </View>
      </View>

      <View style={styles.chartCard}>
        {period === 'dia' ? (
          <WellbeingChart
            labels={series.labels}
            habits={series.habit}
            sleep={[]}
            mood={[]}
            highlight="habits"
            lineStyle={series.lineStyle}
            timed={series.timed ? { habits: series.timed.habits } : undefined}
          />
        ) : (
          <WellbeingChart
            labels={series.labels}
            habits={series.habit}
            sleep={series.sleep}
            mood={series.mood}
            lineStyle={series.lineStyle}
            timed={series.timed}
          />
        )}
      </View>

      <View style={styles.metricsRow}>
        <MetricCard
          title="Sono"
          color={sleepBlue}
          percent={series.sleepScore}
          compare={compareVsLabel(period, sleepCompare)}
          onPress={() => router.push(`/progresso-sono?period=${period}` as Href)}
        />
        <MetricCard
          title="Humor"
          color={moodGold}
          percent={series.moodScore}
          compare={compareVsLabel(period, moodCompare)}
          onPress={() => router.push(`/progresso-humor?period=${period}` as Href)}
        />
        <View style={styles.metricCard} accessibilityRole="summary">
          <Text style={[styles.metricTitle, { color: habitGreen }]}>Hábitos</Text>
          <Text style={styles.metricValue}>{habitScore == null ? '—' : formatDailyPercent(habitScore)}</Text>
          <Text
            style={[
              styles.metricCompare,
              habitCompare.kind === 'delta' && habitCompare.delta > 0 && styles.up,
              habitCompare.kind === 'delta' && habitCompare.delta < 0 && styles.down,
            ]}>
            {compareVsLabel(period, habitCompare)}
          </Text>
        </View>
      </View>

      <Text style={styles.section}>Desempenho por pilar</Text>
      <View style={styles.pillarsTight}>
        {report.pillars.map((pillar) => (
          <View
            key={pillar.pillar}
            style={styles.pillarStack}
            accessibilityLabel={`${pillarName[pillar.pillar]}: ${pillar.percent == null ? 'sem registro' : formatDailyPercent(pillar.percent)}`}>
            <HoloDial id={pillar.pillar} percent={pillar.percent} feminine={feminine} size={dial} />
            <Text style={styles.pillarPercentTight}>{pillar.percent == null ? '—' : formatDailyPercent(pillar.percent)}</Text>
            <Text style={styles.pillarNameTight}>{pillarName[pillar.pillar]}</Text>
          </View>
        ))}
      </View>

      <View style={styles.waterCard}>
        <View style={styles.waterHead}>
          <Drop />
          <Text style={styles.waterTitle}>Hidratação</Text>
        </View>
        {waterNotice ? <Text style={styles.waterNote}>{waterNotice}</Text> : null}
        {!waterNotice && consumed == null ? <Text style={styles.waterNote}>Sem registro de água neste período.</Text> : null}
        {!waterNotice && consumed != null ? (
          <>
            {waterPct != null ? (
              <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(fill) }} style={styles.waterRail}>
                {fill > 0 ? <View style={[styles.waterFill, { width: `${fill}%` }]} /> : null}
              </View>
            ) : (
              <Text style={styles.waterNote}>Meta diária ainda não definida neste período.</Text>
            )}
            <View style={styles.waterAmountRow}>
              <Text style={styles.waterAmount}>
                {goal != null ? `${formatLiters(consumed)} / ${formatLiters(goal)}` : formatLiters(consumed)}
              </Text>
              {waterPct != null ? <Text style={styles.waterPercent}>{formatHydrationPercent(waterPct)}</Text> : null}
            </View>
          </>
        ) : null}
      </View>

      <InsightCard message={insight} />
    </>
  );
}

function averageOf(values: readonly (number | null)[]) {
  const present = values.filter((value): value is number => value != null && Number.isFinite(value));
  if (present.length === 0) {
    return null;
  }
  return Math.round((present.reduce((sum, value) => sum + value, 0) / present.length) * 100) / 100;
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: page },
  brand: {
    color: ui.textChampagne,
    fontFamily: fonts.display,
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 2,
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  titleDense: { fontSize: 22, lineHeight: 26, letterSpacing: 1.6 },
  subtitle: {
    marginTop: 2,
    color: '#B7B2AA',
    fontFamily: fonts.display,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1.15,
    textTransform: 'uppercase',
  },
  segmentTrack: {
    marginTop: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 18,
    padding: 3,
  },
  segmentTrackDense: { marginTop: 8, marginBottom: 4 },
  segment: {
    flex: 1,
    minWidth: 0,
    minHeight: 34,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  segmentOn: { backgroundColor: '#E6C14A' },
  segmentLabel: {
    color: '#A39E96',
    fontFamily: fonts.display,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  segmentLabelCompact: { fontSize: 11, letterSpacing: 0.2 },
  segmentLabelOn: { color: '#1A1408' },
  premiumBadge: {
    position: 'absolute',
    top: -10,
    borderWidth: 1,
    borderColor: '#E6C14A',
    backgroundColor: '#0A0A0A',
    borderRadius: 7,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  premiumBadgeOn: { borderColor: '#1A1408' },
  premiumBadgeText: {
    color: ui.textChampagne,
    fontFamily: fonts.display,
    fontSize: 7,
    lineHeight: 9,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heroRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  compareBox: {
    flex: 1,
    minWidth: 0,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(230,193,74,0.35)',
    backgroundColor: 'rgba(10,10,10,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 6,
  },
  compareLabel: {
    color: ui.muted,
    fontFamily: fonts.display,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  compareValue: {
    color: ui.text,
    fontFamily: fonts.textMedium,
    fontSize: 15,
    lineHeight: 20,
  },
  chartCard: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(243,239,232,0.1)',
    backgroundColor: 'rgba(8,8,8,0.72)',
    padding: 12,
  },
  metricsRow: { marginTop: 12, flexDirection: 'row', gap: 8 },
  metricCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(243,239,232,0.12)',
    backgroundColor: '#0A0A0A',
    paddingHorizontal: 8,
    paddingVertical: 10,
    gap: 4,
  },
  metricTitle: {
    fontFamily: fonts.display,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  metricValue: {
    color: ui.text,
    fontFamily: fonts.textMedium,
    fontSize: 18,
    lineHeight: 22,
  },
  metricCompare: {
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 10,
    lineHeight: 13,
  },
  up: { color: '#39FF73' },
  down: { color: '#FF3B4D' },
  section: {
    marginTop: 14,
    color: ui.textChampagne,
    fontFamily: fonts.display,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  pillarsTight: { marginTop: 8, flexDirection: 'row', gap: 6 },
  pillarStack: { flex: 1, minWidth: 0, alignItems: 'center', gap: 1 },
  portrait: { position: 'absolute', overflow: 'hidden', backgroundColor: '#05070b' },
  portraitImage: { width: '100%', height: '100%' },
  dialFallback: { ...StyleSheet.absoluteFill, borderWidth: 2 },
  pillarNameTight: {
    color: ui.textChampagne,
    fontFamily: fonts.display,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  pillarPercentTight: {
    color: ui.textChampagne,
    fontFamily: fonts.textMedium,
    fontSize: 14,
    lineHeight: 17,
  },
  waterCard: {
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: '#071018',
    borderWidth: 1,
    borderColor: 'rgba(110,182,242,0.28)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  waterHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  waterTitle: {
    flex: 1,
    color: waterBlue,
    fontFamily: fonts.display,
    fontSize: 13,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  waterAmountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  waterAmount: { flex: 1, color: ui.text, fontFamily: fonts.textMedium, fontSize: 16, lineHeight: 20 },
  waterPercent: { color: waterBlue, fontFamily: fonts.textMedium, fontSize: 18 },
  waterRail: { height: 8, borderRadius: 4, backgroundColor: 'rgba(110,182,242,0.18)', overflow: 'hidden' },
  waterFill: { height: '100%', borderRadius: 4, backgroundColor: waterBlue },
  waterNote: { color: '#8FB4D4', fontFamily: fonts.text, fontSize: 12, lineHeight: 16, textTransform: 'uppercase' },
  note: {
    marginTop: 12,
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 13,
    lineHeight: 18,
    textTransform: 'uppercase',
  },
  iconFallback: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: ui.champagne },
  iconFallbackBlue: { borderColor: waterBlue },
});
