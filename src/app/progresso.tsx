import { createElement, useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { ProgressPlanet } from '@/components/progress-planet';
import { PercentRing } from '@/components/progress-charts';
import { fonts, ui } from '@/constants/theme';
import { getSessionUserId } from '@/lib/accounts';
import { dailyCounts, getDailyBoard, isDailyHabitDone, refreshDailyBoard } from '@/lib/daily-board';
import { getCatalogHabits, getUserHabits, habitTitle } from '@/lib/habit-catalog';
import { formatDailyPercent, loadHabitLogsUntil, todayKey } from '@/lib/habit-day';
import { hydrationProgress, loadHydrationUntil } from '@/lib/hydration';
import {
  progressReport,
  type HabitLog,
  type HydrationLog,
  type PillarProgress,
  type PracticedHabit,
  type ProgressHabit,
  type ProgressPeriod,
  type ProgressReport,
  type TodayProgressHabit,
  type TodayRoutine,
} from '@/lib/progress-view';
import { useRequireSession } from '@/lib/require-session';

const page = '#050505';
const waterBlue = '#6EB6F2';

const periods: { id: ProgressPeriod; label: string; premium: boolean }[] = [
  { id: 'dia', label: 'Dia', premium: false },
  { id: 'semana', label: 'Semana', premium: true },
  { id: 'mes', label: 'Mês', premium: true },
  { id: 'ano', label: 'Ano', premium: true },
];

const story: Record<ProgressPeriod, { title: string; detail: string; quote: string; ring: string; water: string; habits: string }> = {
  dia: {
    title: 'O dia está em movimento.',
    detail: 'Cada conclusão fica registrada.',
    quote: 'O que você faz hoje permanece.',
    ring: 'Conclusão do dia',
    water: 'Hidratação (dia)',
    habits: '3 hábitos mais praticados (dia)',
  },
  semana: {
    title: 'Você evoluiu nesta semana.',
    detail: 'Constância faz a diferença.',
    quote: 'Constância na semana, força no resultado.',
    ring: 'Conclusão da semana',
    water: 'Hidratação (semana)',
    habits: '3 hábitos mais praticados (semana)',
  },
  mes: {
    title: 'Seu melhor ritmo aqui.',
    detail: 'Constância é performance.',
    quote: 'Pequenas ações repetidas criam grandes mudanças.',
    ring: 'Conclusão do mês',
    water: 'Hidratação (mês)',
    habits: '3 hábitos mais praticados (mês)',
  },
  ano: {
    title: 'Evolução consistente este ano.',
    detail: 'Grandes resultados vêm do tempo.',
    quote: 'O que se repete constrói quem se torna.',
    ring: 'Desempenho no ano',
    water: 'Hidratação (ano)',
    habits: '3 hábitos mais praticados (ano)',
  },
};

const pillarName: Record<PillarProgress['pillar'], string> = {
  corpo: 'Corpo',
  mente: 'Mente',
  espirito: 'Espírito',
};

type Snapshot = {
  today: string;
  logs: HabitLog[];
  hydration: HydrationLog[];
  routine: TodayRoutine | null;
  habits: ProgressHabit[];
  todayHabits: TodayProgressHabit[] | null;
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
  const counts = dailyCounts(board.habits, board.completed);
  const todayHabits = board.habits.map((habit) => ({
    id: habit.userHabitId ?? habit.id,
    label: habit.label,
    pillar: habit.pillar,
    catalogHabitId: habit.catalogHabitId,
    done: isDailyHabitDone(habit, board.completed),
  }));
  return { habits, routine: { total: counts.total, completed: counts.done }, todayHabits };
}

function glyph(type: string, props: Record<string, unknown> | null, ...children: ReactNode[]) {
  return createElement(type, props, ...children);
}

function Trophy() {
  if (Platform.OS !== 'web') {
    return <View style={styles.iconFallback} />;
  }
  const stroke = { stroke: ui.champagne, strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };
  return glyph(
    'svg',
    { width: 22, height: 22, viewBox: '0 0 24 24', 'aria-hidden': true },
    glyph('path', { d: 'M8 4.2h8v3.4a4 4 0 0 1-8 0V4.2z', ...stroke }),
    glyph('path', { d: 'M8 6.2H5.4c.4 2.3 1.6 3.5 3.2 3.8M16 6.2h2.6c-.4 2.3-1.6 3.5-3.2 3.8', ...stroke }),
    glyph('path', { d: 'M12 11.6V14.2M9.2 17.6h5.6', ...stroke }),
  );
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

function PillarMark({ pillar }: { pillar: PillarProgress['pillar'] }) {
  if (Platform.OS !== 'web') {
    return <Text style={styles.pillarLetter}>{pillarName[pillar].slice(0, 1)}</Text>;
  }
  const stroke = { stroke: ui.champagne, strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };
  let body: ReactNode = null;
  if (pillar === 'corpo') {
    body = glyph(
      'g',
      null,
      glyph('circle', { cx: 12, cy: 8, r: 2.1, ...stroke }),
      glyph('path', { d: 'M7.2 18.2c.6-2.5 2.3-3.7 4.8-3.7s4.2 1.2 4.8 3.7', ...stroke }),
    );
  } else if (pillar === 'mente') {
    body = glyph(
      'g',
      null,
      glyph('circle', { cx: 12, cy: 12, r: 6.2, ...stroke }),
      glyph('path', { d: 'M12 8.2v7.6M9.2 12h5.6', ...stroke }),
    );
  } else {
    body = glyph('path', {
      d: 'M12 4.2c.4 2.4-1.2 3.6-1.2 5.4a1.2 1.2 0 0 0 2.4 0c0-1 .6-1.6 1.4-2.4 1.6 1.5 2.6 3.2 2.6 5.2A5.2 5.2 0 0 1 6.8 17c0-2.6 1.6-4.2 2.6-5.8.6.6 1.2 1.1 1.2 2',
      ...stroke,
    });
  }
  return glyph('svg', { width: 22, height: 22, viewBox: '0 0 24 24', 'aria-hidden': true }, body);
}

export default function ProgressScreen() {
  const signedIn = useRequireSession();
  const { width } = useWindowDimensions();
  const [period, setPeriod] = useState<ProgressPeriod>('semana');
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [notice, setNotice] = useState('');
  const [waterNotice, setWaterNotice] = useState('');
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const ringSize = Math.max(188, Math.min(236, width - 132));
  const compact = width < 380;

  useEffect(() => {
    const userId = getSessionUserId();
    if (!userId) {
      return;
    }
    let active = true;
    const today = todayKey();
    void (async () => {
      const [, logs, water] = await Promise.all([
        refreshDailyBoard(userId, today),
        loadHabitLogsUntil(userId, today),
        loadHydrationUntil(userId, today),
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
        routine: captured.routine,
        habits: captured.habits,
        todayHabits: captured.todayHabits,
      });
      setPhase(logs.ok || water.ok ? 'ready' : 'error');
    })();
    return () => {
      active = false;
    };
  }, []);

  const report = snapshot
    ? progressReport({
        today: snapshot.today,
        period,
        logs: snapshot.logs,
        hydration: snapshot.hydration,
        todayRoutine: snapshot.routine,
        habits: snapshot.habits,
        todayHabits: snapshot.todayHabits,
      })
    : null;

  if (!signedIn) {
    return <View style={styles.blank} />;
  }

  return (
    <AppScreen backgroundColor={page} backdrop={<ProgressPlanet />}>
      <Text accessibilityRole="header" style={styles.title}>
        Meu progresso
      </Text>
      <Text style={styles.subtitle}>Disciplina hoje. Liberdade sempre.</Text>
      <View style={styles.periods}>
        {periods.map((item) => {
          const selected = item.id === period;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setPeriod(item.id)}
              style={styles.period}>
              <Text style={[styles.premium, !item.premium && styles.premiumSpacer]}>{item.premium ? 'Premium' : ' '}</Text>
              <Text numberOfLines={1} style={[styles.periodLabel, compact && styles.periodLabelCompact, selected && styles.periodSelected]}>
                {item.label}
              </Text>
              <View style={[styles.periodMark, selected && styles.periodMarkOn]} />
            </Pressable>
          );
        })}
      </View>

      {phase === 'loading' ? <Text style={styles.note}>Carregando o seu progresso.</Text> : null}
      {notice ? <Text style={styles.note}>{notice}</Text> : null}
      {report ? <ProgressBody period={period} report={report} waterNotice={waterNotice} ringSize={ringSize} /> : null}
    </AppScreen>
  );
}

function ProgressBody({
  period,
  report,
  waterNotice,
  ringSize,
}: {
  period: ProgressPeriod;
  report: ProgressReport;
  waterNotice: string;
  ringSize: number;
}) {
  const copy = story[period];
  const headline = report[period];
  const quiet = headline == null;
  return (
    <>
      <View style={styles.ringBlock}>
        <PercentRing percent={headline} size={ringSize} />
        <Text style={styles.ringCaption}>{copy.ring}</Text>
      </View>

      <View style={styles.card}>
        <Trophy />
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>{quiet ? 'Este período ainda não tem conclusões.' : copy.title}</Text>
          <Text style={styles.cardDetail}>{quiet ? 'Os dias registrados aparecem aqui.' : copy.detail}</Text>
        </View>
      </View>

      <HydrationCard report={report} notice={waterNotice} title={copy.water} />

      <View style={styles.pillars}>
        {report.pillars.map((pillar) => (
          <View key={pillar.pillar} style={styles.pillar} accessibilityLabel={`${pillarName[pillar.pillar]}: ${pillar.percent == null ? 'sem registro' : formatDailyPercent(pillar.percent)}`}>
            <View style={styles.pillarOrb}>
              <PillarMark pillar={pillar.pillar} />
            </View>
            <Text style={styles.pillarPercent}>{pillar.percent == null ? '—' : formatDailyPercent(pillar.percent)}</Text>
            <Text style={styles.pillarLabel}>{pillarName[pillar.pillar]}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.section}>{copy.habits}</Text>
      <PracticedList habits={report.practiced} />

      <View style={styles.quote}>
        <Text style={styles.quoteMark}>“</Text>
        <Text style={styles.quoteText}>{copy.quote}</Text>
      </View>
    </>
  );
}

function HydrationCard({
  report,
  notice,
  title,
}: {
  report: ProgressReport;
  notice: string;
  title: string;
}) {
  const consumed = report.water.consumedMl;
  const goal = report.periodGoalMl;
  const percent = consumed != null && goal != null && goal > 0 ? hydrationProgress(consumed, goal) : null;
  return (
    <View style={styles.waterCard}>
      <View style={styles.waterHead}>
        <Drop />
        <Text style={styles.waterTitle}>{title}</Text>
        {goal != null ? <Text style={styles.waterMeta}>{`Meta ${formatLiters(goal)}`}</Text> : null}
      </View>
      {notice ? <Text style={styles.waterNote}>{notice}</Text> : null}
      {!notice && consumed == null ? <Text style={styles.waterNote}>Sem registro de água neste período.</Text> : null}
      {!notice && consumed != null ? (
        <>
          <View style={styles.waterAmountRow}>
            <Text style={styles.waterAmount}>
              {goal != null ? `${formatLiters(consumed)} de ${formatLiters(goal)}` : formatLiters(consumed)}
            </Text>
            {percent != null ? <Text style={styles.waterPercent}>{percent}%</Text> : null}
          </View>
          {percent != null ? (
            <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: percent }} style={styles.waterRail}>
              {percent > 0 ? <View style={[styles.waterFill, { width: `${percent}%` }]} /> : null}
            </View>
          ) : (
            <Text style={styles.waterNote}>Meta diária ainda não definida neste período.</Text>
          )}
        </>
      ) : null}
    </View>
  );
}

function PracticedList({ habits }: { habits: readonly PracticedHabit[] }) {
  if (habits.length === 0) {
    return <Text style={styles.note}>Nenhum hábito concluído neste período.</Text>;
  }
  return (
    <View style={styles.habitList}>
      {habits.map((habit) => (
        <View key={habit.id} style={styles.habit}>
          <View style={styles.habitRow}>
            <Text numberOfLines={1} style={styles.habitName}>
              {habit.label}
            </Text>
            <Text style={styles.habitPercent}>{formatDailyPercent(habit.percent)}</Text>
          </View>
          <View style={styles.habitTrack}>
            <View style={[styles.habitFill, { width: `${Math.max(0, Math.min(100, habit.percent))}%` }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  blank: {
    flex: 1,
    backgroundColor: page,
  },
  title: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 6,
    color: '#8E8A84',
    fontFamily: fonts.text,
    fontSize: 13,
    lineHeight: 18,
  },
  periods: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 6,
  },
  period: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  premium: {
    color: ui.champagne,
    fontFamily: fonts.display,
    fontSize: 8,
    lineHeight: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  premiumSpacer: {
    opacity: 0,
  },
  periodLabel: {
    marginTop: 2,
    color: '#6E6A64',
    fontFamily: fonts.display,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  periodLabelCompact: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
  periodSelected: {
    color: ui.text,
  },
  periodMark: {
    marginTop: 8,
    height: 2,
    width: '70%',
    backgroundColor: 'transparent',
  },
  periodMarkOn: {
    backgroundColor: ui.champagne,
  },
  ringBlock: {
    marginTop: 18,
    alignItems: 'center',
  },
  ringCaption: {
    marginTop: 12,
    color: '#C9C4BC',
    fontFamily: fonts.display,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  card: {
    marginTop: 22,
    borderRadius: 16,
    backgroundColor: 'rgba(10,10,10,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(232,201,155,0.16)',
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardCopy: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    color: ui.text,
    fontFamily: fonts.textMedium,
    fontSize: 15,
    lineHeight: 20,
  },
  cardDetail: {
    color: '#8E8A84',
    fontFamily: fonts.text,
    fontSize: 13,
    lineHeight: 18,
  },
  waterCard: {
    marginTop: 12,
    borderRadius: 16,
    backgroundColor: '#071018',
    borderWidth: 1,
    borderColor: 'rgba(110,182,242,0.28)',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  waterHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  waterTitle: {
    flex: 1,
    color: waterBlue,
    fontFamily: fonts.display,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  waterMeta: {
    color: '#8FB4D4',
    fontFamily: fonts.text,
    fontSize: 11,
    lineHeight: 14,
  },
  waterAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  waterAmount: {
    flex: 1,
    color: ui.text,
    fontFamily: fonts.textLight,
    fontSize: 22,
    lineHeight: 28,
  },
  waterPercent: {
    color: waterBlue,
    fontFamily: fonts.textLight,
    fontSize: 22,
    lineHeight: 28,
  },
  waterRail: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(110,182,242,0.18)',
    overflow: 'hidden',
  },
  waterFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: waterBlue,
  },
  waterNote: {
    color: '#8FB4D4',
    fontFamily: fonts.text,
    fontSize: 13,
    lineHeight: 18,
  },
  pillars: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 8,
  },
  pillar: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 6,
  },
  pillarOrb: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: 'rgba(232,201,155,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,8,8,0.55)',
  },
  pillarLetter: {
    color: ui.champagne,
    fontFamily: fonts.display,
    fontSize: 16,
  },
  pillarPercent: {
    color: ui.text,
    fontFamily: fonts.textLight,
    fontSize: 18,
    lineHeight: 22,
  },
  pillarLabel: {
    color: ui.champagne,
    fontFamily: fonts.display,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  section: {
    marginTop: 26,
    color: ui.champagne,
    fontFamily: fonts.display,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  habitList: {
    marginTop: 12,
    gap: 14,
  },
  habit: {
    gap: 6,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  habitName: {
    flex: 1,
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 15,
    lineHeight: 20,
  },
  habitPercent: {
    color: ui.champagne,
    fontFamily: fonts.text,
    fontSize: 14,
    lineHeight: 18,
  },
  habitTrack: {
    height: 2,
    borderRadius: 1,
    backgroundColor: '#2A2926',
    overflow: 'hidden',
  },
  habitFill: {
    height: '100%',
    backgroundColor: ui.champagne,
  },
  quote: {
    marginTop: 22,
    borderRadius: 16,
    backgroundColor: 'rgba(10,10,10,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(232,201,155,0.16)',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  quoteMark: {
    color: ui.champagne,
    fontFamily: fonts.display,
    fontSize: 42,
    lineHeight: 46,
  },
  quoteText: {
    marginTop: -6,
    color: ui.text,
    fontFamily: fonts.displayLight,
    fontSize: 18,
    lineHeight: 24,
  },
  note: {
    marginTop: 16,
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 14,
    lineHeight: 20,
  },
  iconFallback: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: ui.champagne,
  },
  iconFallbackBlue: {
    borderColor: waterBlue,
  },
});
