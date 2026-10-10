import { Image } from 'expo-image';
import { createElement, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { ProgressPlanet } from '@/components/progress-planet';
import { PercentRing } from '@/components/progress-charts';
import { fonts, ui } from '@/constants/theme';
import { getProgressColor, type ProgressBand } from '@/lib/progress-color';
import { getProfileSnapshot, subscribeProfile } from '@/lib/profile';
import { getSessionCreatedAt, getSessionUserId } from '@/lib/accounts';
import { dailyCounts, getDailyBoard, isDailyHabitDone, refreshDailyBoard } from '@/lib/daily-board';
import { getCatalogHabits, getUserHabits, habitTitle } from '@/lib/habit-catalog';
import { formatDailyPercent, loadHabitLogsUntil, todayKey } from '@/lib/habit-day';
import { hydrationProgress, loadHydrationUntil } from '@/lib/hydration';
import {
  activationDateKey,
  hydrationLoadThrough,
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
const corpoMale = require('@/assets/pillars/corpo-mantime.png');
const corpoFemale = require('@/assets/pillars/corpo-womantime.png');
const menteFigure = require('@/assets/pillars/mente.png');
const espiritoFigure = require('@/assets/pillars/espirito.png');

const pillarBands: Record<ProgressBand, { line: string; glow: string }> = {
  red: { line: '#F90F0F', glow: 'rgba(249, 15, 15, 0.9)' },
  yellow: { line: '#F5C518', glow: 'rgba(245, 197, 24, 0.9)' },
  green: { line: '#18F54B', glow: 'rgba(24, 245, 75, 0.9)' },
};

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
  return glyph(
    'svg',
    { width: 22, height: 22, viewBox: '0 0 24 24', 'aria-hidden': true },
    glyph('path', { d: 'M8 3.6h8v3.6a4 4 0 0 1-8 0V3.6z', fill: '#E6C14A' }),
    glyph('path', { d: 'M8 6.1H5.2c.5 2.4 1.8 3.6 3.4 3.8M16 6.1h2.8c-.5 2.4-1.8 3.6-3.4 3.8', fill: '#E6C14A' }),
    glyph('path', { d: 'M10.2 14.2h3.6l.6 1.4H9.6l.6-1.4zM8.6 17.2h6.8v1.6H8.6z', fill: '#E6C14A' }),
  );
}

function Chevron() {
  if (Platform.OS !== 'web') {
    return null;
  }
  return glyph(
    'svg',
    { width: 14, height: 14, viewBox: '0 0 14 14', 'aria-hidden': true },
    glyph('path', { d: 'M5 2.5 9.5 7 5 11.5', fill: 'none', stroke: '#E6C14A', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' }),
  );
}

function QuoteMark() {
  if (Platform.OS !== 'web') {
    return <Text style={styles.quoteMark}>“</Text>;
  }
  return glyph(
    'svg',
    { width: 28, height: 22, viewBox: '0 0 28 22', 'aria-hidden': true },
    glyph('path', { d: 'M8.2 2.2c2.4 0 3.8 1.8 3.8 4 0 3.6-2.8 7-6.6 8.8 1.8-1.2 2.8-2.8 2.8-4.6-1.6-.2-3-1.4-3-3.2 1.6-2.4 3-5 6-5z', fill: '#E6C14A' }),
    glyph('path', { d: 'M20.2 2.2c2.4 0 3.8 1.8 3.8 4 0 3.6-2.8 7-6.6 8.8 1.8-1.2 2.8-2.8 2.8-4.6-1.6-.2-3-1.4-3-3.2 1.6-2.4 3-5 6-5z', fill: '#E6C14A' }),
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

type GoldKind = 'plus' | 'brain' | 'lotus' | 'book' | 'dumbbell' | 'meal';

function GoldIcon({ kind, size = 18 }: { kind: GoldKind; size?: number }) {
  if (Platform.OS !== 'web') {
    return <Text style={styles.pillarLetter}>{kind.slice(0, 1).toUpperCase()}</Text>;
  }
  const ink = '#E6C14A';
  let body: ReactNode = null;
  if (kind === 'plus') {
    body = glyph('path', { d: 'M12 5.4v13.2M5.4 12h13.2', stroke: ink, strokeWidth: 2.6, strokeLinecap: 'round' });
  } else if (kind === 'brain') {
    body = glyph(
      'g',
      null,
      glyph('path', { d: 'M11.2 4.6c-3 .2-5 2.4-5 5 0 .9.2 1.7.7 2.3-.8.7-1.5 1.8-1.5 3.1 0 2.4 2 4.2 4.6 4.2.7 0 1.3-.1 1.8-.4V4.6h-.6z', fill: ink }),
      glyph('path', { d: 'M12.8 4.6c3 .2 5 2.4 5 5 0 .9-.2 1.7-.7 2.3.8.7 1.5 1.8 1.5 3.1 0 2.4-2 4.2-4.6 4.2-.7 0-1.3-.1-1.8-.4V4.6h.6z', fill: ink }),
    );
  } else if (kind === 'lotus') {
    body = glyph(
      'g',
      null,
      glyph('path', { d: 'M12 3.2 15.2 11.2 12 17.2 8.8 11.2 12 3.2z', fill: ink }),
      glyph('path', { d: 'M4.4 8.6 10.4 10.2 8.6 16.4 3.6 13.6 4.4 8.6z', fill: ink }),
      glyph('path', { d: 'M19.6 8.6 13.6 10.2 15.4 16.4 20.4 13.6 19.6 8.6z', fill: ink }),
    );
  } else if (kind === 'book') {
    body = glyph(
      'g',
      null,
      glyph('path', { d: 'M3.2 5.2 11 7.4 11 18.6 3.2 16.4 3.2 5.2z', fill: ink }),
      glyph('path', { d: 'M20.8 5.2 13 7.4 13 18.6 20.8 16.4 20.8 5.2z', fill: ink }),
    );
  } else if (kind === 'meal') {
    body = glyph(
      'g',
      null,
      glyph('path', { d: 'M8 3.4v6.2M6.2 3.4v4.2M9.8 3.4v4.2M8 9.2v11', stroke: ink, strokeWidth: 1.6, strokeLinecap: 'round' }),
      glyph('path', { d: 'M15.2 3.6c1.6 1.4 1.6 3.4 0 5.2v10.6', stroke: ink, strokeWidth: 1.6, strokeLinecap: 'round' }),
    );
  } else {
    body = glyph(
      'g',
      null,
      glyph('rect', { x: 2, y: 6.4, width: 5.4, height: 11.2, rx: 1.1, fill: ink }),
      glyph('rect', { x: 16.6, y: 6.4, width: 5.4, height: 11.2, rx: 1.1, fill: ink }),
      glyph('rect', { x: 6.6, y: 10.2, width: 10.8, height: 3.6, rx: 0.8, fill: ink }),
    );
  }
  return glyph('svg', { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true }, body);
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

function PeriodGlyph({ period }: { period: ProgressPeriod }) {
  if (Platform.OS !== 'web') {
    return <View style={styles.iconFallback} />;
  }
  const ink = '#E6C14A';
  const stroke = { fill: 'none', stroke: ink, strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  let body: ReactNode = null;
  if (period === 'dia') {
    body = glyph('path', { d: 'M13 2.5 6.5 13h5L10 21.5 17.5 10h-5L13 2.5z', fill: ink });
  } else if (period === 'semana') {
    body = glyph(
      'g',
      null,
      glyph('path', { d: 'M3.5 16.5 9 11l3 2.5 8-9', ...stroke }),
      glyph('path', { d: 'M14 4.5h6.5V11', ...stroke }),
    );
  } else if (period === 'mes') {
    body = glyph(
      'g',
      null,
      glyph('path', { d: 'M5 18V11M10 18V7M15 18V13M20 18V9', ...stroke }),
    );
  } else {
    return <Trophy />;
  }
  return glyph('svg', { width: 18, height: 18, viewBox: '0 0 24 24', 'aria-hidden': true }, body);
}

function habitKind(habit: PracticedHabit): GoldKind {
  const text = `${habit.catalogHabitId ?? ''} ${habit.label}`.toLowerCase();
  if (/almo|refei|lanche|jantar|caf[eé]|ceia|comida/.test(text)) {
    return 'meal';
  }
  if (/leitur|livro|estud|agradec|organiza/.test(text)) {
    return 'book';
  }
  if (/medita|ora[cç]|gratid|aten[cç]|respira|silenc/.test(text)) {
    return 'lotus';
  }
  if (/ativid|exerc|treino|f[ií]sic|muscul|corrid|caminh/.test(text)) {
    return 'dumbbell';
  }
  if (habit.pillar === 'espirito') {
    return 'lotus';
  }
  if (habit.pillar === 'mente') {
    return 'brain';
  }
  if (habit.pillar === 'corpo') {
    return 'dumbbell';
  }
  return 'plus';
}

export default function ProgressScreen() {
  const signedIn = useRequireSession();
  const { width, height } = useWindowDimensions();
  const profile = useSyncExternalStore(subscribeProfile, getProfileSnapshot, getProfileSnapshot);
  const [period, setPeriod] = useState<ProgressPeriod>('semana');
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [notice, setNotice] = useState('');
  const [waterNotice, setWaterNotice] = useState('');
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const dense = height < 780;
  const ringSize = Math.round(Math.min(dense ? 124 : 142, Math.max(112, width * 0.34)));
  const compact = width < 380;
  const feminine = profile.journey === 'womantime';

  useEffect(() => {
    const userId = getSessionUserId();
    if (!userId) {
      return;
    }
    let active = true;
    const today = todayKey();
    const horizon = hydrationLoadThrough(today);
    void (async () => {
      const [, logs, water, createdAt] = await Promise.all([
        refreshDailyBoard(userId, today),
        loadHabitLogsUntil(userId, today),
        loadHydrationUntil(userId, horizon),
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
        activatedOn: snapshot.activatedOn,
      })
    : null;

  if (!signedIn) {
    return <View style={styles.blank} />;
  }

  const focused = period !== 'dia';

  return (
      <AppScreen tight backgroundColor={page} backdrop={<ProgressPlanet bright={focused} />}>
      <Text style={styles.brand}>UTime</Text>
      <Text accessibilityRole="header" style={[styles.title, dense && styles.titleDense]}>
        Meu progresso
      </Text>
      <Text style={styles.subtitle}>Disciplina hoje. Liberdade sempre.</Text>
      <View style={[styles.segmentTrack, dense && styles.segmentTrackDense]}>
        {periods.map((item) => {
          const selected = item.id === period;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setPeriod(item.id)}
              style={[styles.segment, selected && styles.segmentOn]}>
              <Text numberOfLines={1} style={[styles.segmentLabel, compact && styles.segmentLabelCompact, selected && styles.segmentLabelOn]}>
                {item.label}
              </Text>
              {selected && item.premium ? (
                <View style={styles.premiumBadge}>
                  <Text style={styles.premiumBadgeText}>Premium</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {phase === 'loading' ? <Text style={styles.note}>Carregando o seu progresso.</Text> : null}
      {notice ? <Text style={styles.note}>{notice}</Text> : null}
      {report ? (
        <ProgressBody period={period} report={report} waterNotice={waterNotice} ringSize={ringSize} feminine={feminine} dense={dense} />
      ) : null}
    </AppScreen>
  );
}

function ProgressBody({
  period,
  report,
  waterNotice,
  ringSize,
  feminine,
  dense,
}: {
  period: ProgressPeriod;
  report: ProgressReport;
  waterNotice: string;
  ringSize: number;
  feminine: boolean;
  dense: boolean;
}) {
  const copy = story[period];
  const headline = report[period];
  const quiet = headline == null;
  const focused = period !== 'dia';
  const dial = dense ? 52 : 58;
  return (
    <>
      <View style={[styles.ringBlock, styles.ringBlockTight]}>
        <PercentRing percent={headline} size={ringSize} caption={copy.ring} />
      </View>

      <View style={[styles.card, styles.cardTight]}>
        <PeriodGlyph period={period} />
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>{quiet ? 'Este período ainda não tem conclusões.' : copy.title}</Text>
          <Text style={styles.cardDetail}>{quiet ? 'Os dias registrados aparecem aqui.' : copy.detail}</Text>
        </View>
        <Chevron />
      </View>

      <HydrationCard report={report} notice={waterNotice} title={copy.water} />

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

      <Text style={[styles.section, styles.sectionTight]}>{copy.habits}</Text>
      {focused ? <PracticedCards habits={report.practiced} /> : <PracticedList habits={report.practiced} />}

      <View style={[styles.quote, styles.quoteTight]}>
        <QuoteMark />
        <Text style={[styles.quoteText, styles.quoteTextTight]}>{copy.quote}</Text>
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
    <View style={[styles.waterCard, styles.waterCardTight]}>
      <View style={styles.waterHead}>
        <Drop />
        <Text style={styles.waterTitle}>{title}</Text>
        {goal != null ? (
          <View style={styles.waterMetaCol}>
            <Text style={styles.waterMeta}>Meta</Text>
            <Text style={styles.waterMetaValue}>{formatLiters(goal)}</Text>
          </View>
        ) : null}
      </View>
      {notice ? <Text style={styles.waterNote}>{notice}</Text> : null}
      {!notice && consumed == null ? <Text style={styles.waterNote}>Sem registro de água neste período.</Text> : null}
      {!notice && consumed != null ? (
        <>
          {percent != null ? (
            <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: percent }} style={[styles.waterRail, styles.waterRailTight]}>
              {percent > 0 ? <View style={[styles.waterFill, styles.waterFillGlow, { width: `${percent}%` }]} /> : null}
            </View>
          ) : (
            <Text style={styles.waterNote}>Meta diária ainda não definida neste período.</Text>
          )}
          <View style={styles.waterAmountRow}>
            <Text style={[styles.waterAmount, styles.waterAmountTight]}>
              {goal != null ? `${formatLiters(consumed)} de ${formatLiters(goal)}` : formatLiters(consumed)}
            </Text>
            {percent != null ? <Text style={[styles.waterPercent, styles.waterPercentTight]}>{percent}%</Text> : null}
          </View>
        </>
      ) : null}
    </View>
  );
}

function PracticedCards({ habits }: { habits: readonly PracticedHabit[] }) {
  if (habits.length === 0) {
    return <Text style={styles.note}>Nenhum hábito concluído neste período.</Text>;
  }
  return (
    <View style={styles.habitCards}>
      {habits.map((habit) => (
        <View key={habit.id} style={styles.habitCard} accessibilityLabel={`${habit.label}: ${formatDailyPercent(habit.percent)}`}>
          <GoldIcon kind={habitKind(habit)} size={18} />
          <View style={styles.habitCardCopy}>
            <Text numberOfLines={2} style={styles.habitCardName}>
              {habit.label}
            </Text>
            <Text style={styles.habitCardPercent}>{formatDailyPercent(habit.percent)}</Text>
          </View>
        </View>
      ))}
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
            <GoldIcon kind={habitKind(habit)} size={14} />
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
  brand: {
    color: '#E6C14A',
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
  titleDense: {
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: 1.6,
  },
  subtitle: {
    marginTop: 2,
    color: '#B7B2AA',
    fontFamily: fonts.display,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1.15,
    textTransform: 'uppercase',
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
  segmentTrack: {
    marginTop: 10,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 18,
    padding: 3,
  },
  segment: {
    flex: 1,
    minWidth: 0,
    minHeight: 34,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  segmentOn: {
    backgroundColor: '#E6C14A',
  },
  segmentLabel: {
    color: '#A39E96',
    fontFamily: fonts.display,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  segmentLabelCompact: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
  segmentLabelOn: {
    color: '#1A1408',
  },
  premiumBadge: {
    position: 'absolute',
    bottom: -9,
    borderWidth: 1,
    borderColor: '#E6C14A',
    backgroundColor: '#0A0A0A',
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  segmentTrackDense: {
    marginTop: 8,
    marginBottom: 2,
  },
  premiumBadgeText: {
    color: '#E6C14A',
    fontFamily: fonts.display,
    fontSize: 8,
    lineHeight: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  ringBlock: {
    marginTop: 18,
    alignItems: 'center',
  },
  ringBlockTight: {
    marginTop: 6,
  },
  cardTight: {
    marginTop: 8,
    paddingVertical: 8,
    borderRadius: 16,
    borderColor: 'rgba(230,193,74,0.42)',
  },
  waterCardTight: {
    marginTop: 6,
    paddingVertical: 8,
    gap: 8,
    borderRadius: 14,
  },
  waterFillGlow: {
    boxShadow: '0 0 8px rgba(110, 182, 242, 0.9)',
  },
  pillarsTight: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 6,
  },
  pillarStack: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 1,
  },
  portrait: {
    position: 'absolute',
    overflow: 'hidden',
    backgroundColor: '#05070b',
  },
  portraitImage: {
    width: '100%',
    height: '100%',
  },
  dialFallback: {
    ...StyleSheet.absoluteFill,
    borderWidth: 2,
  },
  pillarInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pillarCopy: {
    minWidth: 0,
    alignItems: 'flex-start',
  },
  pillarOrbTight: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderColor: '#E6C14A',
    borderWidth: 1.5,
    backgroundColor: 'rgba(8,8,8,0.72)',
    boxShadow: '0 0 10px rgba(230, 193, 74, 0.35)',
  },
  pillarOrbNarrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  pillarNameNarrow: {
    fontSize: 8,
    letterSpacing: 0.3,
  },
  pillarNameTight: {
    color: '#E6C14A',
    fontFamily: fonts.display,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  pillarPercentTight: {
    color: '#F3D56A',
    fontFamily: fonts.textLight,
    fontSize: 15,
    lineHeight: 18,
  },
  sectionTight: {
    marginTop: 8,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  habitCards: {
    marginTop: 6,
    flexDirection: 'row',
    gap: 8,
  },
  habitCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: 14,
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: 'rgba(230,193,74,0.45)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 5,
  },
  habitCardCopy: {
    flex: 1,
    minWidth: 0,
  },
  habitCardName: {
    color: '#E6C14A',
    fontFamily: fonts.text,
    fontSize: 11,
    lineHeight: 13,
  },
  habitCardPercent: {
    color: '#F3D56A',
    fontFamily: fonts.textLight,
    fontSize: 14,
    lineHeight: 18,
  },
  quoteTight: {
    marginTop: 8,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderColor: 'rgba(230,193,74,0.42)',
  },
  quoteMarkTight: {
    fontSize: 34,
    lineHeight: 34,
    textAlign: 'center',
  },
  quoteTextTight: {
    flex: 1,
    marginTop: 0,
    fontSize: 15,
    lineHeight: 20,
    textAlign: 'left',
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
  waterAmountTight: {
    fontSize: 16,
    lineHeight: 20,
  },
  waterPercentTight: {
    fontSize: 22,
    lineHeight: 26,
  },
  waterRailTight: {
    height: 8,
    borderRadius: 4,
  },
  waterMetaCol: {
    alignItems: 'flex-end',
  },
  waterMetaValue: {
    color: '#D5E6F5',
    fontFamily: fonts.text,
    fontSize: 13,
    lineHeight: 16,
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
    marginTop: 6,
    gap: 7,
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
