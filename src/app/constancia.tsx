import { router, useFocusEffect, type Href } from 'expo-router';
import { createElement, useCallback, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { ConsistencyCalendar } from '@/components/consistency-calendar';
import { constancyColors } from '@/components/constancy-colors';
import { ConstancyPlanet } from '@/components/constancy-planet';
import { GoldStar } from '@/components/gold-star';
import { fonts, ui } from '@/constants/theme';
import { getSessionUserId } from '@/lib/accounts';
import {
  ACTIVITY_GOAL,
  applyTodayRoutine,
  describePercent,
  goalLineFromTop,
  marksFromLogs,
  monthActivity,
  performanceTone,
  recentWeekAverages,
  todayCursor,
  type DayMark,
  type MonthActivity,
  type PerformanceTone,
  type WeekAverage,
} from '@/lib/constancy';
import { getDailyBoard, refreshDailyBoard, scoreDailyHabits, subscribeDailyBoard } from '@/lib/daily-board';
import { officialHydrationIds } from '@/lib/daily-score';
import { getUserHabits } from '@/lib/habit-catalog';
import { loadHabitLogsUntil, todayKey } from '@/lib/habit-day';
import { useRequireSession } from '@/lib/require-session';

function glyph(type: string, props: Record<string, unknown> | null, ...children: ReactNode[]) {
  return Platform.OS === 'web' ? createElement(type, props, ...children) : null;
}

function HeaderIcon({ kind }: { kind: 'back' | 'info' }) {
  const icon =
    kind === 'back'
      ? glyph(
          'svg',
          { width: 18, height: 18, viewBox: '0 0 24 24', 'aria-hidden': true },
          glyph('path', { d: 'M14.5 5.5 8 12l6.5 6.5', fill: 'none', stroke: ui.text, strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }),
        )
      : glyph(
          'svg',
          { width: 16, height: 16, viewBox: '0 0 24 24', 'aria-hidden': true },
          glyph('circle', { cx: 12, cy: 12, r: 8, fill: 'none', stroke: ui.text, strokeWidth: 1.4 }),
          glyph('path', { d: 'M12 11v5', stroke: ui.text, strokeWidth: 1.6, strokeLinecap: 'round' }),
          glyph('circle', { cx: 12, cy: 8, r: 0.9, fill: ui.text }),
        );
  return icon ?? <Text style={styles.headerFallback}>{kind === 'back' ? '‹' : 'i'}</Text>;
}

const barFill: Record<PerformanceTone, string> = {
  below: constancyColors.below,
  meta: constancyColors.meta,
  excellence: constancyColors.excellence,
};

const barSheen: Record<PerformanceTone, string> = {
  below: constancyColors.belowSheen,
  meta: constancyColors.metaSheen,
  excellence: constancyColors.excellenceSheen,
};

function weekDescription(week: WeekAverage) {
  if (week.ratio == null || week.percent == null) {
    return `${week.label}, sem hábitos registrados`;
  }
  const tone = performanceTone(week.ratio);
  const band = tone === 'excellence' ? 'excelência' : tone === 'meta' ? 'na meta' : 'abaixo da meta';
  return `${week.label}, média ${describePercent(week.ratio)}, ${band}`;
}

function PerformanceChart({ weeks }: { weeks: WeekAverage[] }) {
  const empty = weeks.every((week) => week.ratio == null);
  const lineTop = Math.round((goalLineFromTop() / 100) * 112);
  return (
    <View style={styles.performance}>
      <View style={styles.cardHead}>
        <View style={styles.cardTitleRow}>
          <View style={styles.tick} />
          <Text style={styles.cardTitle}>SEU DESEMPENHO</Text>
        </View>
        <View style={styles.range}>
          <View style={styles.rangeRule} />
          <Text style={styles.rangeLabel}>ÚLTIMAS 4 SEMANAS</Text>
          <View style={styles.rangeRule} />
        </View>
      </View>
      <View style={styles.percentRow}>
        {weeks.map((week) => (
          <Text key={`${week.start}-percent`} style={styles.barPercent}>
            {week.percent == null ? '—' : `${week.percent}%`}
          </Text>
        ))}
      </View>
      <View style={styles.scale}>
        <View pointerEvents="none" style={[styles.goalLine, { top: lineTop }]} />
        <View pointerEvents="none" style={[styles.goalBadge, { top: lineTop }]}>
          <Text style={styles.goalMeta}>META</Text>
          <Text style={styles.goalValue}>{`${ACTIVITY_GOAL}%`}</Text>
        </View>
        <View style={styles.bars}>
          {weeks.map((week) => {
            const tone = week.ratio == null ? null : performanceTone(week.ratio);
            const height = week.ratio == null ? 0 : Math.max(0, Math.min(100, week.ratio));
            return (
              <View key={week.start} accessibilityLabel={weekDescription(week)} style={styles.barColumn}>
                {tone ? (
                  <View style={[styles.bar, { height: `${height}%`, backgroundColor: barFill[tone] }]}>
                    <View style={[styles.barSheen, { backgroundColor: barSheen[tone] }]} />
                    <View style={styles.barBase} />
                    {tone === 'excellence' ? <GoldStar size={13} style={styles.barStar} /> : null}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>
      <View style={styles.labelRow}>
        {weeks.map((week) => (
          <Text key={`${week.start}-label`} style={styles.barLabel}>
            {week.label}
          </Text>
        ))}
      </View>
      {empty ? <Text style={styles.empty}>Sem hábitos registrados nestas semanas.</Text> : null}
    </View>
  );
}

function MonthSummary({ activity }: { activity: MonthActivity }) {
  const segments = [
    { key: 'below', count: activity.below, color: constancyColors.below },
    { key: 'meta', count: activity.meta, color: constancyColors.meta },
    { key: 'excellence', count: activity.excellence, color: constancyColors.excellence },
    { key: 'idle', count: activity.idle, color: constancyColors.track },
  ];
  const indicators = [
    { key: 'below', value: String(activity.below), label: 'DIAS ABAIXO\nDA META', swatch: 'below' as const },
    { key: 'meta', value: String(activity.meta), label: 'DIAS NA META\n(≥70%)', swatch: 'meta' as const },
    { key: 'excellence', value: String(activity.excellence), label: 'DIAS DE\nEXCELÊNCIA (100%)', swatch: 'star' as const },
    { key: 'active', value: `${activity.activityPercent}%`, label: 'DO MÊS\nCOM ATIVIDADE', swatch: 'percent' as const },
  ];
  return (
    <View
      accessibilityLabel={`${activity.totalDays} dias, ${activity.active} em atividade. ${activity.below} abaixo da meta, ${activity.meta} na meta, ${activity.excellence} de excelência, ${activity.activityPercent}% do mês com atividade.`}
      style={styles.summary}>
      <View style={styles.cardHead}>
        <View style={styles.cardTitleRow}>
          <View style={styles.tick} />
          <Text style={styles.cardTitle}>RESUMO DO MÊS</Text>
        </View>
        <Text style={styles.summaryCount}>
          {`${activity.totalDays} DIAS / `}
          <Text style={styles.summaryActive}>{activity.active}</Text>
          {' DIAS EM ATIVIDADE'}
        </Text>
      </View>
      <View style={styles.track}>
        {segments.map((segment) =>
          segment.count > 0 ? (
            <View key={segment.key} style={{ flexGrow: segment.count, flexBasis: 0, backgroundColor: segment.color }} />
          ) : null,
        )}
      </View>
      <View style={styles.metrics}>
        {indicators.map((indicator, index) => (
          <View key={indicator.key} style={styles.metricSlot}>
            {index > 0 ? <View style={styles.metricRule} /> : null}
            <View style={styles.metric}>
              <View style={styles.metricValue}>
                {indicator.swatch === 'star' ? <GoldStar size={12} /> : null}
                {indicator.swatch === 'below' ? <View style={[styles.dot, { backgroundColor: constancyColors.below }]} /> : null}
                {indicator.swatch === 'meta' ? <View style={[styles.dot, { backgroundColor: constancyColors.meta }]} /> : null}
                <Text style={[styles.metricNumber, indicator.swatch === 'percent' && styles.metricPercent]}>{indicator.value}</Text>
              </View>
              <Text style={styles.metricLabel}>{indicator.label}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function ConstancyBoard({
  today,
  marks,
  cursor,
  selected,
  phase,
  notice,
  onCursor,
  onSelect,
  onOpenDay,
}: {
  today: string;
  marks: ReadonlyMap<string, DayMark>;
  cursor: { year: number; month: number } | null;
  selected: string;
  phase: 'loading' | 'ready' | 'error';
  notice: string;
  onCursor: (next: { year: number; month: number }) => void;
  onSelect: (dateKey: string) => void;
  onOpenDay: (dateKey: string) => void;
}) {
  const { width } = useWindowDimensions();
  const compact = width < 430;
  const [infoOpen, setInfoOpen] = useState(false);
  const viewed = cursor ?? (today ? todayCursor(today) : null);
  const summary = viewed && today ? monthActivity(marks, viewed.year, viewed.month, today) : null;
  const weeks = today ? recentWeekAverages(marks, today) : [];

  return (
    <AppScreen width="narrow" backgroundColor={constancyColors.page} backdrop={<ConstancyPlanet />}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/inicio' as Href);
            }
          }}
          style={styles.headerButton}>
          <HeaderIcon kind="back" />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text accessibilityRole="header" style={[styles.title, compact && styles.titleCompact]}>
            CONSTÂNCIA
          </Text>
          <View style={styles.headerRule} />
          <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>DISCIPLINA HOJE, RESULTADOS SEMPRE</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Como a constância é calculada"
          accessibilityState={{ expanded: infoOpen }}
          onPress={() => setInfoOpen((open) => !open)}
          style={styles.headerButton}>
          <HeaderIcon kind="info" />
        </Pressable>
      </View>
      {infoOpen ? (
        <Text style={styles.info}>
          O calendário usa o progresso real do dia. Sem hábitos concluídos, o dia fica neutro. Abaixo de 70% fica vermelho. De 70% até abaixo de 100% fica verde. Exatamente 100% marca excelência. A hidratação não entra nessa conta. Dias anteriores são só consulta.
        </Text>
      ) : null}

      {phase === 'loading' ? <Text style={styles.note}>Carregando sua constância.</Text> : null}
      {phase === 'error' ? <Text style={styles.note}>{notice}</Text> : null}

      {phase === 'ready' && today && viewed && summary ? (
        <>
          <View style={styles.block}>
            <ConsistencyCalendar
              today={today}
              cursor={viewed}
              marks={marks}
              selected={selected || today}
              onCursor={onCursor}
              onSelect={onSelect}
              onOpenDay={onOpenDay}
            />
          </View>
          <MonthSummary activity={summary} />
          <PerformanceChart weeks={weeks} />
        </>
      ) : null}
    </AppScreen>
  );
}

export default function ConstancyScreen() {
  const signedIn = useRequireSession();
  const [today, setToday] = useState('');
  const [marks, setMarks] = useState<Map<string, DayMark>>(() => new Map());
  const [cursor, setCursor] = useState<{ year: number; month: number } | null>(null);
  const [selected, setSelected] = useState('');
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [notice, setNotice] = useState('');

  useFocusEffect(
    useCallback(() => {
      const userId = getSessionUserId();
      if (!userId) {
        return;
      }
      let active = true;
      let loaded = false;
      let loading = false;
      let base = new Map<string, DayMark>();
      let loadedDay = '';
      const paint = (day: string) => {
        const board = getDailyBoard();
        const routine = board.ready && board.dateKey === day ? scoreDailyHabits(board.habits, board.completed) : null;
        setToday(day);
        setMarks(applyTodayRoutine(base, day, routine));
      };
      const load = async () => {
        if (loading) {
          return;
        }
        loading = true;
        try {
          const day = todayKey();
          try {
            await refreshDailyBoard(userId, day);
          } catch {
            // A leitura segue com as linhas já gravadas.
          }
          const closed = todayKey();
          const logs = await loadHabitLogsUntil(userId, closed);
          if (!active) {
            return;
          }
          if (!logs.ok) {
            setPhase('error');
            setNotice(logs.message);
            return;
          }
          const excluded = officialHydrationIds(getUserHabits().map((habit) => ({ id: habit.id, catalogHabitId: habit.catalogHabitId })));
          base = marksFromLogs(logs.rows, excluded);
          loadedDay = closed;
          loaded = true;
          paint(closed);
          setCursor((current) => current ?? todayCursor(closed));
          setSelected((current) => current || closed);
          setNotice('');
          setPhase('ready');
        } finally {
          loading = false;
        }
      };
      const unsubscribe = subscribeDailyBoard(() => {
        if (!active || !loaded) {
          return;
        }
        const day = todayKey();
        if (day !== loadedDay) {
          void load();
          return;
        }
        paint(day);
      });
      void load();
      return () => {
        active = false;
        unsubscribe();
      };
    }, []),
  );

  if (!signedIn) {
    return <View style={styles.blocked} />;
  }

  return (
    <ConstancyBoard
      today={today}
      marks={marks}
      cursor={cursor}
      selected={selected}
      phase={phase}
      notice={notice}
      onCursor={setCursor}
      onSelect={setSelected}
      onOpenDay={(dateKey) => router.push(`/consulta-dia?data=${dateKey}` as Href)}
    />
  );
}

const styles = StyleSheet.create({
  blocked: {
    flex: 1,
    backgroundColor: constancyColors.page,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerButton: {
    width: 32,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerFallback: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 18,
    lineHeight: 20,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 8,
    rowGap: 2,
  },
  title: {
    color: constancyColors.text,
    fontFamily: fonts.display,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: 1.5,
  },
  titleCompact: {
    fontSize: 16,
    letterSpacing: 0.8,
  },
  headerRule: {
    width: 1,
    height: 14,
    backgroundColor: constancyColors.excellence,
  },
  subtitle: {
    flexShrink: 1,
    color: '#C8C4BC',
    fontFamily: fonts.display,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.35,
  },
  subtitleCompact: {
    fontSize: 8,
    lineHeight: 11,
    letterSpacing: 0.15,
  },
  info: {
    marginTop: 8,
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 13,
    lineHeight: 18,
  },
  note: {
    marginTop: 28,
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 14,
    lineHeight: 20,
  },
  block: {
    marginTop: 14,
  },
  summary: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: constancyColors.line,
    backgroundColor: constancyColors.card,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 12,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  tick: {
    width: 3,
    height: 14,
    borderRadius: 1,
    backgroundColor: constancyColors.excellence,
  },
  cardTitle: {
    color: constancyColors.text,
    fontFamily: fonts.display,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 0.7,
  },
  summaryCount: {
    flexShrink: 1,
    color: constancyColors.muted,
    fontFamily: fonts.text,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.2,
    textAlign: 'right',
  },
  summaryActive: {
    color: constancyColors.excellence,
    fontFamily: fonts.display,
    fontSize: 12,
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: constancyColors.track,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  metrics: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  metricSlot: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  metricRule: {
    width: 1,
    marginVertical: 4,
    backgroundColor: constancyColors.rule,
  },
  metric: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 4,
    paddingHorizontal: 2,
  },
  metricValue: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  metricNumber: {
    color: constancyColors.text,
    fontFamily: fonts.display,
    fontSize: 16,
    lineHeight: 20,
  },
  metricPercent: {
    color: constancyColors.excellence,
    fontSize: 18,
    lineHeight: 22,
  },
  metricLabel: {
    color: constancyColors.muted,
    fontFamily: fonts.text,
    fontSize: 8,
    lineHeight: 10,
    letterSpacing: 0.15,
    textAlign: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  performance: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: constancyColors.line,
    backgroundColor: constancyColors.card,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
  },
  range: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rangeRule: {
    width: 1,
    height: 12,
    backgroundColor: constancyColors.excellence,
  },
  rangeLabel: {
    color: constancyColors.muted,
    fontFamily: fonts.display,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.5,
  },
  percentRow: {
    marginTop: 10,
    flexDirection: 'row',
    paddingLeft: 50,
    gap: 6,
  },
  scale: {
    height: 112,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(224, 177, 90, 0.85)',
  },
  goalBadge: {
    position: 'absolute',
    left: 0,
    zIndex: 2,
    marginTop: -15,
    minWidth: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(224, 177, 90, 0.8)',
    backgroundColor: '#100E0B',
    paddingHorizontal: 4,
    paddingVertical: 2,
    alignItems: 'center',
  },
  goalMeta: {
    color: constancyColors.excellence,
    fontFamily: fonts.display,
    fontSize: 8,
    lineHeight: 10,
    letterSpacing: 0.4,
  },
  goalValue: {
    color: constancyColors.excellence,
    fontFamily: fonts.display,
    fontSize: 9,
    lineHeight: 11,
  },
  bars: {
    height: 112,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingLeft: 50,
    gap: 6,
  },
  barColumn: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barPercent: {
    flex: 1,
    minWidth: 0,
    color: constancyColors.text,
    fontFamily: fonts.display,
    fontSize: 13,
    lineHeight: 16,
    textAlign: 'center',
  },
  bar: {
    width: '78%',
    maxWidth: 48,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  barSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '42%',
    opacity: 0.55,
  },
  barBase: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '30%',
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  barStar: {
    zIndex: 1,
  },
  labelRow: {
    marginTop: 6,
    flexDirection: 'row',
    paddingLeft: 50,
    gap: 6,
  },
  barLabel: {
    flex: 1,
    minWidth: 0,
    color: constancyColors.muted,
    fontFamily: fonts.text,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  empty: {
    marginTop: 8,
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 13,
    lineHeight: 18,
  },
});
