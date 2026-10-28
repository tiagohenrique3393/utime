import { router, useFocusEffect, type Href } from 'expo-router';
import { createElement, useCallback, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { ConsistencyCalendar } from '@/components/consistency-calendar';
import { ConstancyPlanet } from '@/components/constancy-planet';
import { GoldStar } from '@/components/gold-star';
import { fonts, ui } from '@/constants/theme';
import { getSessionUserId } from '@/lib/accounts';
import { applyTodayRoutine, bestStreak, currentStreak, marksFromLogs, monthScore, recentWeekScores, yearExcellence, type DayMark } from '@/lib/constancy';
import { dailyCounts, getDailyBoard, refreshDailyBoard } from '@/lib/daily-board';
import { loadHabitLogsUntil, todayKey } from '@/lib/habit-day';
import { useRequireSession } from '@/lib/require-session';

const page = '#050505';
const card = 'rgba(10, 10, 10, 0.78)';
const line = 'rgba(184, 160, 120, 0.32)';
const green = '#46C36A';

function glyph(type: string, props: Record<string, unknown> | null, ...children: ReactNode[]) {
  return Platform.OS === 'web' ? createWeb(type, props, ...children) : null;
}

function createWeb(type: string, props: Record<string, unknown> | null, ...children: ReactNode[]) {
  return createElement(type, props, ...children);
}

function Flame() {
  const icon = glyph(
    'svg',
    { width: 18, height: 18, viewBox: '0 0 24 24', 'aria-hidden': true },
    glyph('path', {
      d: 'M12 2.4c.4 3.2-1.6 4.8-1.6 7.2 0 1.5.8 2.4 1.6 2.4 2.8 0 5-2.6 5-6.2 2.2 1.8 3.4 4.2 3.4 6.8 0 4.6-3.6 8.2-8.4 8.2S3.6 17.2 3.6 12.6c0-3.4 2.2-6.2 4.2-8.2.8 2.2 1.8 3.2 2.2 4.2.2-2.4.8-4.2 2-6.2z',
      fill: ui.textChampagne,
    }),
  );
  return <View style={styles.iconBox}>{icon ?? <View style={styles.iconFallback} />}</View>;
}

function Trophy() {
  const icon = glyph(
    'svg',
    { width: 18, height: 18, viewBox: '0 0 24 24', 'aria-hidden': true },
    glyph('path', {
      d: 'M8 4h8v3.2a4 4 0 0 1-8 0V4z',
      fill: 'none',
      stroke: ui.textChampagne,
      strokeWidth: 1.4,
      strokeLinejoin: 'round',
    }),
    glyph('path', {
      d: 'M8 6.2H5.2A2.4 2.4 0 0 0 7.4 9.2M16 6.2h2.8A2.4 2.4 0 0 1 16.6 9.2M12 11.2V14.2M9 17.2h6M8.2 19.4h7.6',
      fill: 'none',
      stroke: ui.textChampagne,
      strokeWidth: 1.4,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    }),
  );
  return <View style={styles.iconBox}>{icon ?? <View style={styles.iconFallback} />}</View>;
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

function monthOf(day: string) {
  return { year: Number(day.slice(0, 4)), month: Number(day.slice(5, 7)) };
}

function MonthStrip({
  months,
  selectedIndex,
}: {
  months: { label: string; count: number | null }[];
  selectedIndex: number;
}) {
  const [width, setWidth] = useState(0);
  const fits = width === 0 || width >= months.length * 26;
  const cards = months.map((month, index) => {
    const selected = index === selectedIndex;
    return (
      <View key={month.label} style={[styles.monthCard, !fits && styles.monthCardScroll, selected && styles.monthCardOn]}>
        <Text style={[styles.monthLabel, selected && styles.monthLabelOn]}>{month.label}</Text>
        {month.count == null ? <Text style={styles.monthDash}>—</Text> : <Text style={styles.monthValue}>{month.count}</Text>}
      </View>
    );
  });
  if (!fits) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthsScroll} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {cards}
      </ScrollView>
    );
  }
  return (
    <View style={styles.months} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {cards}
    </View>
  );
}

export function ConstancyBoard({
  today,
  marks,
  cursor,
  phase,
  notice,
  onCursor,
  onOpenDay,
}: {
  today: string;
  marks: ReadonlyMap<string, DayMark>;
  cursor: { year: number; month: number } | null;
  phase: 'loading' | 'ready' | 'error';
  notice: string;
  onCursor: (next: { year: number; month: number }) => void;
  onOpenDay: (dateKey: string) => void;
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  const viewed = cursor ?? (today ? monthOf(today) : null);
  const streak = today ? currentStreak(marks, today) : 0;
  const record = today ? bestStreak(marks, today) : 0;
  const excellence = viewed && today ? yearExcellence(marks, viewed.year, today) : null;
  const summary = viewed && today ? monthScore(marks, viewed.year, viewed.month, today) : null;
  const weeks = today ? recentWeekScores(marks, today) : [];
  const weeksEmpty = weeks.every((week) => week.percent === null);
  const currentMonth = today ? monthOf(today) : null;

  return (
    <AppScreen width="narrow" backgroundColor={page} backdrop={<ConstancyPlanet />}>
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
          <Text accessibilityRole="header" style={styles.title}>
            Constância
          </Text>
          <Text style={styles.subtitle}>Disciplina hoje, resultados sempre</Text>
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
          A sequência conta os dias encerrados com pelo menos 70% dos hábitos. O dia com 100% marca excelência e também entra na meta.
        </Text>
      ) : null}

      {phase === 'loading' ? <Text style={styles.note}>Carregando sua constância.</Text> : null}
      {phase === 'error' ? <Text style={styles.note}>{notice}</Text> : null}

      {phase === 'ready' && today && viewed && excellence && summary ? (
        <>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Flame />
              <View style={styles.statCopy}>
                <View style={styles.figure}>
                  <Text style={styles.number}>{streak}</Text>
                  <Text style={styles.unit}>Dias</Text>
                </View>
                <Text style={styles.statLabel}>Consecutivos</Text>
                <Text style={styles.statNote}>Batendo a meta</Text>
              </View>
            </View>
            <View style={styles.stat}>
              <Trophy />
              <View style={styles.statCopy}>
                <View style={styles.figure}>
                  <Text style={styles.number}>{record}</Text>
                  <Text style={styles.unit}>Dias</Text>
                </View>
                <Text style={styles.statLabel}>Maior sequência</Text>
                <Text style={styles.statNote}>Alcançada</Text>
              </View>
            </View>
          </View>

          <View style={styles.block}>
            <ConsistencyCalendar
              today={today}
              cursor={viewed}
              marks={marks}
              onCursor={onCursor}
              onOpenDay={onOpenDay}
            />
          </View>

          <View style={styles.summary}>
            <View style={styles.summaryHead}>
              <Text style={styles.cardTitle}>Resumo do mês</Text>
              <Text style={styles.summaryCount}>{`${summary.meta} de ${summary.monthDays} dias`}</Text>
              <Text style={styles.summaryPercent}>{`${summary.monthPercent}%`}</Text>
            </View>
            <View style={styles.track}>
              {summary.monthPercent > 0 ? <View style={[styles.fill, { width: `${summary.monthPercent}%` }]} /> : null}
            </View>
            <View style={styles.metrics}>
              <View style={styles.metric}>
                <View style={styles.metricValue}>
                  <View style={styles.greenDot} />
                  <Text style={styles.metricNumber}>{summary.meta}</Text>
                </View>
                <Text style={styles.metricLabel}>Dias na meta</Text>
              </View>
              <View style={styles.metric}>
                <View style={styles.metricValue}>
                  <GoldStar size={12} />
                  <Text style={styles.metricNumber}>{summary.excellence}</Text>
                </View>
                <Text style={styles.metricLabel}>Dias de excelência</Text>
              </View>
              <View style={styles.metric}>
                <View style={styles.metricValue}>
                  <View style={styles.grayDot} />
                  <Text style={styles.metricNumber}>{summary.below}</Text>
                </View>
                <Text style={styles.metricLabel}>Abaixo da meta</Text>
              </View>
            </View>
          </View>

          <View style={styles.performance}>
            <View style={styles.performanceHead}>
              <Text style={styles.cardTitle}>Seu desempenho</Text>
              <Text style={styles.performanceRange}>‹  Últimas 4 semanas  ›</Text>
            </View>
            {weeksEmpty ? (
              <Text style={styles.empty}>Sem dias encerrados nestas semanas.</Text>
            ) : (
              <View style={styles.bars}>
                {weeks.map((week) => (
                  <View key={week.label} style={styles.barColumn}>
                    <Text style={styles.barPercent}>{week.percent == null ? '—' : `${week.percent}%`}</Text>
                    <View style={styles.plot}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: week.percent == null ? 4 : Math.max(4, Math.round((week.percent / 100) * 52)),
                            backgroundColor: week.percent != null && week.percent > 0 ? '#2A2418' : '#242220',
                            borderTopColor: week.percent != null && week.percent > 0 ? ui.textChampagne : '#3A3834',
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.barLabel}>{week.label}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.excellenceCard}>
            <View style={styles.excellence}>
              <Text style={styles.cardTitle}>{`Excelência ${excellence.year}`}</Text>
              <View style={styles.excellenceTotal}>
                <GoldStar size={13} />
                <Text style={styles.excellenceNumber}>{excellence.total}</Text>
                <Text style={styles.excellenceUnit}>Dias{'\n'}perfeitos</Text>
              </View>
            </View>
            <MonthStrip
              months={excellence.months}
              selectedIndex={currentMonth !== null && excellence.year === currentMonth.year ? currentMonth.month - 1 : -1}
            />
          </View>
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
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [notice, setNotice] = useState('');

  useFocusEffect(
    useCallback(() => {
      const userId = getSessionUserId();
      if (!userId) {
        return;
      }
      let active = true;
      void (async () => {
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
        const board = getDailyBoard();
        const routine = board.ready && board.dateKey === closed ? dailyCounts(board.habits, board.completed) : null;
        setToday(closed);
        setMarks(applyTodayRoutine(marksFromLogs(logs.rows), closed, routine));
        setCursor((current) => current ?? monthOf(closed));
        setNotice('');
        setPhase('ready');
      })();
      return () => {
        active = false;
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
      phase={phase}
      notice={notice}
      onCursor={setCursor}
      onOpenDay={(dateKey) => router.push(`/consulta-dia?data=${dateKey}` as Href)}
    />
  );
}

const styles = StyleSheet.create({
  blocked: {
    flex: 1,
    backgroundColor: page,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  headerButton: {
    width: 32,
    height: 32,
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
    alignItems: 'center',
  },
  title: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  subtitle: {
    marginTop: 2,
    color: '#B7B2AA',
    fontFamily: fonts.display,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1.1,
    textAlign: 'center',
    textTransform: 'uppercase',
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
  stats: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 8,
  },
  stat: {
    flex: 1,
    minHeight: 78,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: line,
    backgroundColor: card,
    paddingHorizontal: 8,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(184, 160, 120, 0.08)',
  },
  iconFallback: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: ui.textChampagne,
  },
  statCopy: {
    flex: 1,
    minWidth: 0,
  },
  figure: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  number: {
    color: ui.text,
    fontFamily: fonts.textMedium,
    fontSize: 26,
    lineHeight: 28,
  },
  unit: {
    marginBottom: 3,
    color: ui.textChampagne,
    fontFamily: fonts.display,
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  statLabel: {
    marginTop: 1,
    color: ui.textChampagne,
    fontFamily: fonts.display,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  statNote: {
    color: '#8E8A84',
    fontFamily: fonts.display,
    fontSize: 9,
    lineHeight: 11,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  block: {
    marginTop: 12,
  },
  summary: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: line,
    backgroundColor: card,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  summaryHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  summaryCount: {
    color: '#A39E96',
    fontFamily: fonts.text,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  summaryPercent: {
    color: ui.textChampagne,
    fontFamily: fonts.textMedium,
    fontSize: 18,
    lineHeight: 22,
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2A2926',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: ui.textChampagne,
  },
  metrics: {
    flexDirection: 'row',
    gap: 6,
  },
  metric: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 3,
  },
  metricValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metricNumber: {
    color: ui.text,
    fontFamily: fonts.textMedium,
    fontSize: 16,
    lineHeight: 20,
  },
  metricLabel: {
    color: '#8E8A84',
    fontFamily: fonts.display,
    fontSize: 9,
    lineHeight: 11,
    letterSpacing: 0.3,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: green,
  },
  grayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6E6A64',
  },
  performance: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: line,
    backgroundColor: card,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
  },
  performanceHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  performanceRange: {
    color: '#A39E96',
    fontFamily: fonts.display,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  empty: {
    marginTop: 14,
    marginBottom: 6,
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 13,
    lineHeight: 18,
  },
  bars: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  barColumn: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  barPercent: {
    color: ui.text,
    fontFamily: fonts.textMedium,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 6,
  },
  plot: {
    height: 52,
    justifyContent: 'flex-end',
  },
  bar: {
    width: 34,
    borderTopWidth: 4,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  barLabel: {
    marginTop: 6,
    color: '#8E8A84',
    fontFamily: fonts.display,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  excellenceCard: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: line,
    backgroundColor: card,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
  },
  excellence: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  excellenceTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  excellenceNumber: {
    color: ui.text,
    fontFamily: fonts.textMedium,
    fontSize: 22,
    lineHeight: 26,
  },
  excellenceUnit: {
    color: '#A39E96',
    fontFamily: fonts.display,
    fontSize: 9,
    lineHeight: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  months: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  monthsScroll: {
    marginTop: 10,
    gap: 4,
    paddingRight: 2,
  },
  monthCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  monthCardScroll: {
    flexGrow: 0,
    flexBasis: 'auto',
    width: 36,
    minWidth: 36,
  },
  monthCardOn: {
    borderColor: ui.textChampagne,
  },
  monthLabel: {
    color: '#8E8A84',
    fontFamily: fonts.display,
    fontSize: 10,
    letterSpacing: 0.4,
  },
  monthLabelOn: {
    color: ui.text,
  },
  monthValue: {
    color: ui.text,
    fontFamily: fonts.textMedium,
    fontSize: 13,
    lineHeight: 16,
  },
  monthDash: {
    color: ui.faint,
    fontFamily: fonts.text,
    fontSize: 13,
    lineHeight: 16,
  },
});
