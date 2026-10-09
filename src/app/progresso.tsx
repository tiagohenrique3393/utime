import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen, Meta, PageTitle, Track } from '@/components/app-screen';
import { PercentBars, PercentRing, WaterBars } from '@/components/progress-charts';
import { fonts, ui } from '@/constants/theme';
import { getSessionUserId } from '@/lib/accounts';
import { dailyCounts, getDailyBoard, refreshDailyBoard } from '@/lib/daily-board';
import { formatDailyPercent, loadHabitLogsUntil, todayKey } from '@/lib/habit-day';
import { formatWater, hydrationProgress, loadHydrationUntil } from '@/lib/hydration';
import {
  progressReport,
  type HabitLog,
  type HydrationLog,
  type ProgressPeriod,
  type ProgressReport,
  type TodayRoutine,
} from '@/lib/progress-view';
import { useRequireSession } from '@/lib/require-session';

const periods: { id: ProgressPeriod; label: string }[] = [
  { id: 'dia', label: 'Dia' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mês' },
  { id: 'ano', label: 'Ano' },
];

const periodCaption: Record<ProgressPeriod, string> = {
  dia: 'Conclusão do dia',
  semana: 'Média da semana',
  mes: 'Média do mês',
  ano: 'Média do ano',
};

type Snapshot = {
  today: string;
  logs: HabitLog[];
  hydration: HydrationLog[];
  routine: TodayRoutine | null;
};

function routineFromBoard(today: string): TodayRoutine | null {
  const board = getDailyBoard();
  if (!board.ready || board.dateKey !== today) {
    return null;
  }
  const counts = dailyCounts(board.habits, board.completed);
  return { total: counts.total, completed: counts.done };
}

export default function ProgressScreen() {
  const signedIn = useRequireSession();
  const [period, setPeriod] = useState<ProgressPeriod>('dia');
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [notice, setNotice] = useState('');
  const [waterNotice, setWaterNotice] = useState('');
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

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
      setNotice(logs.ok ? '' : logs.message);
      setWaterNotice(water.ok ? '' : water.message);
      setSnapshot({
        today,
        logs: logs.ok ? logs.rows : [],
        hydration: water.ok ? water.rows : [],
        routine: routineFromBoard(today),
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
      })
    : null;

  if (!signedIn) {
    return <View style={styles.blank} />;
  }

  return (
    <AppScreen>
      <PageTitle compact>Meu progresso</PageTitle>
      <View style={styles.periods}>
        {periods.map((item) => {
          const selected = item.id === period;
          const value = report ? report[item.id] : null;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setPeriod(item.id)}
              style={styles.period}>
              <Text style={[styles.periodLabel, selected && styles.periodSelected]}>{item.label}</Text>
              <Text style={[styles.periodValue, selected && styles.periodValueOn]}>
                {report && value == null ? '—' : report ? formatDailyPercent(value as number) : ''}
              </Text>
              <View style={[styles.periodMark, selected && styles.periodMarkOn]} />
            </Pressable>
          );
        })}
      </View>

      {phase === 'loading' ? <Text style={styles.note}>Carregando o seu progresso.</Text> : null}
      {notice ? <Text style={styles.note}>{notice}</Text> : null}
      {report ? <ProgressBody period={period} report={report} waterNotice={waterNotice} /> : null}
    </AppScreen>
  );
}

function ProgressBody({
  period,
  report,
  waterNotice,
}: {
  period: ProgressPeriod;
  report: ProgressReport;
  waterNotice: string;
}) {
  const headline = report[period];
  return (
    <>
      <Text style={styles.percent}>{headline == null ? '—' : formatDailyPercent(headline)}</Text>
      <Text style={styles.caption}>{periodCaption[period]}</Text>
      <View style={styles.chart}>
        {period === 'dia' ? <PercentRing percent={headline} /> : <PercentBars points={report.habitPoints} />}
      </View>

      <Text style={styles.section}>Hidratação</Text>
      <HydrationCopy period={period} water={report.water} notice={waterNotice} />
      {period === 'dia' ? (
        <WaterDay water={report.water} />
      ) : (
        <View style={styles.chart}>
          <WaterBars points={report.waterPoints} />
        </View>
      )}
    </>
  );
}

function HydrationCopy({
  period,
  water,
  notice,
}: {
  period: ProgressPeriod;
  water: ProgressReport['water'];
  notice: string;
}) {
  if (notice) {
    return <Text style={styles.note}>{notice}</Text>;
  }
  return (
    <View style={styles.waterCopy}>
      {water.consumedMl == null ? (
        <Text style={styles.note}>Sem registro de água neste período.</Text>
      ) : (
        <Text style={styles.waterAmount}>{formatWater(water.consumedMl)}</Text>
      )}
      {period === 'dia' && water.goalMl != null ? <Meta>{`Meta ${formatWater(water.goalMl)}`}</Meta> : null}
      {period === 'dia' && water.consumedMl != null && water.goalMl == null ? <Meta>Meta diária ainda não definida.</Meta> : null}
      {period !== 'dia' && water.goalDays > 0 ? (
        <Meta>{`Meta cumprida em ${water.goalMet} de ${water.goalDays} ${water.goalDays === 1 ? 'dia' : 'dias'} com meta.`}</Meta>
      ) : null}
    </View>
  );
}

function WaterDay({ water }: { water: ProgressReport['water'] }) {
  if (water.consumedMl == null) {
    return null;
  }
  const goal = water.goalMl != null && water.goalMl > 0;
  return (
    <View style={styles.waterDay}>
      {goal ? <Track percent={hydrationProgress(water.consumedMl, water.goalMl)} /> : null}
      <Text style={styles.waterNote}>
        {water.goalMl == null
          ? 'O consumo fica separado da conclusão dos hábitos.'
          : water.goalMet > 0
            ? 'A meta deste dia foi cumprida.'
            : 'A meta deste dia ainda não foi cumprida.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  blank: {
    flex: 1,
    backgroundColor: ui.background,
  },
  periods: {
    marginTop: 22,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  period: {
    flexGrow: 1,
    flexBasis: 72,
    minHeight: 64,
    justifyContent: 'flex-end',
  },
  periodLabel: {
    color: ui.faint,
    fontFamily: fonts.text,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  periodSelected: {
    color: ui.text,
  },
  periodValue: {
    marginTop: 4,
    color: ui.muted,
    fontFamily: fonts.textLight,
    fontSize: 18,
    lineHeight: 22,
  },
  periodValueOn: {
    color: ui.champagne,
  },
  periodMark: {
    marginTop: 8,
    height: 1,
    backgroundColor: 'transparent',
  },
  periodMarkOn: {
    backgroundColor: ui.champagne,
  },
  percent: {
    marginTop: 28,
    color: ui.text,
    fontFamily: fonts.textLight,
    fontSize: 64,
    lineHeight: 72,
  },
  caption: {
    marginTop: 4,
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 14,
    lineHeight: 20,
  },
  chart: {
    marginTop: 22,
  },
  section: {
    marginTop: 40,
    color: ui.champagne,
    fontFamily: fonts.text,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  waterCopy: {
    marginTop: 14,
    gap: 6,
  },
  waterAmount: {
    color: ui.text,
    fontFamily: fonts.textLight,
    fontSize: 28,
    lineHeight: 34,
  },
  waterDay: {
    marginTop: 16,
    gap: 10,
  },
  waterNote: {
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 14,
    lineHeight: 20,
  },
  note: {
    marginTop: 16,
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 14,
    lineHeight: 20,
  },
});
