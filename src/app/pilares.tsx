import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { circlePalette as ink } from '@/components/circle-palette';
import { PillarMap } from '@/components/pillar-map';
import { AdjustCard, EquilibriumCard, InsightFocusCard } from '@/components/pillar-panels';
import { PillarPlanet } from '@/components/pillar-planet';
import { fonts } from '@/constants/theme';
import { getSessionUserId } from '@/lib/accounts';
import { getDailyBoard, isDailyHabitDone } from '@/lib/daily-board';
import { getCatalogHabits, getUserHabits, habitTitle } from '@/lib/habit-catalog';
import { loadHabitLogsUntil, todayKey } from '@/lib/habit-day';
import {
  bodyAssetKey,
  habitCounts,
  periodAnchor,
  readPillarPeriod,
  type PillarId,
  type PillarScope,
} from '@/lib/pillar-balance';
import { loadInsightMemory, readInsightMemorySync, writeInsightMemory, type InsightMemory } from '@/lib/pillar-insight-memory';
import { adjustAdvice, insightHeading, selectInsight, type HabitCue, type InsightFacts } from '@/lib/pillar-insights';
import { getProfileSnapshot, subscribeProfile } from '@/lib/profile';
import type { HabitLog, TodayProgressHabit } from '@/lib/progress-view';
import { useRequireSession } from '@/lib/require-session';
import { useDailyBoard } from '@/lib/use-daily-board';

const filters: { id: PillarScope; label: string }[] = [
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mês' },
  { id: 'ano', label: 'Ano' },
];

type Snapshot = {
  today: string;
  logs: HabitLog[];
  failed: boolean;
};

function captureToday(today: string) {
  const catalog = getCatalogHabits();
  const habits = getUserHabits().map((habit) => ({
    id: habit.id,
    label: habitTitle(habit, catalog),
    pillar: habit.pillar,
    catalogHabitId: habit.catalogHabitId,
  }));
  const board = getDailyBoard();
  if (!board.ready || board.dateKey !== today) {
    return { habits, todayHabits: null as TodayProgressHabit[] | null };
  }
  const todayHabits = board.habits.map((habit) => ({
    id: habit.userHabitId ?? habit.id,
    label: habit.label,
    pillar: habit.pillar,
    catalogHabitId: habit.catalogHabitId,
    done: isDailyHabitDone(habit, board.completed),
  }));
  return { habits, todayHabits };
}

function cuesFor(habits: { pillar: PillarId; label: string; catalogHabitId: string | null }[], todayHabits: TodayProgressHabit[] | null): HabitCue[] {
  if (todayHabits && todayHabits.length > 0) {
    return todayHabits.map((habit) => ({
      pillar: habit.pillar,
      label: habit.label,
      catalogHabitId: habit.catalogHabitId,
      doneToday: habit.done,
    }));
  }
  return habits.map((habit) => ({
    pillar: habit.pillar,
    label: habit.label,
    catalogHabitId: habit.catalogHabitId,
    doneToday: null,
  }));
}

export default function PillarsScreen() {
  const signedIn = useRequireSession();
  const profile = useSyncExternalStore(subscribeProfile, getProfileSnapshot, getProfileSnapshot);
  useDailyBoard();
  const { width } = useWindowDimensions();
  const [period, setPeriod] = useState<PillarScope>('semana');
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const userId = getSessionUserId();
  const [memory, setMemory] = useState<InsightMemory>(() => readInsightMemorySync(userId));
  const [memoryReady, setMemoryReady] = useState(() => userId != null && typeof localStorage !== 'undefined');

  const reload = useCallback(() => {
    const id = getSessionUserId();
    if (!id) {
      return () => undefined;
    }
    let active = true;
    const today = todayKey();
    void loadHabitLogsUntil(id, today).then((logs) => {
      if (!active) {
        return;
      }
      setSnapshot({ today, logs: logs.ok ? logs.rows : [], failed: !logs.ok });
    });
    return () => {
      active = false;
    };
  }, []);

  useFocusEffect(reload);

  useEffect(() => {
    let active = true;
    void loadInsightMemory(userId).then((loaded) => {
      if (!active) {
        return;
      }
      setMemory(loaded);
      setMemoryReady(true);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const today = snapshot?.today ?? todayKey();
  const captured = captureToday(today);
  const habitKey = captured.habits.map((habit) => habit.id).join('|');
  const todayKeySignature = captured.todayHabits?.map((habit) => `${habit.id}:${habit.done ? 1 : 0}`).join('|') ?? '';
  const reading = useMemo(
    () =>
      snapshot
        ? readPillarPeriod({
            today: snapshot.today,
            period,
            logs: snapshot.logs,
            habits: captured.habits,
            todayHabits: captured.todayHabits,
          })
        : null,
    [snapshot, period, habitKey, todayKeySignature],
  );
  const facts: InsightFacts | null = reading
    ? {
        period,
        current: reading.current,
        previous: reading.previous,
        partial: reading.partial,
        recordedDays: reading.recordedDays,
        habits: habitCounts(captured.habits),
      }
    : null;
  const slotKey = `${period}:${periodAnchor(period, today)}`;
  const selection = useMemo(() => (facts ? selectInsight(facts, memory.slots[slotKey] ?? null) : null), [facts, memory, slotKey]);

  useEffect(() => {
    if (!memoryReady || !userId || !selection?.changed) {
      return;
    }
    setMemory((current) => {
      const next = { slots: { ...current.slots, [slotKey]: selection.slot } };
      void writeInsightMemory(userId, next);
      return next;
    });
  }, [memoryReady, userId, selection, slotKey]);

  if (!signedIn) {
    return <View style={styles.blocked} />;
  }

  const column = Math.min(460, width) - (width >= 840 ? 64 : 44);
  const stacked = column < 320;
  const heading = insightHeading(period);
  const feminine = bodyAssetKey(profile.journey) === 'womantime';
  const lines = {
    corpo: adjustAdvice('corpo', cuesFor(captured.habits, captured.todayHabits)),
    mente: adjustAdvice('mente', cuesFor(captured.habits, captured.todayHabits)),
    espirito: adjustAdvice('espirito', cuesFor(captured.habits, captured.todayHabits)),
  };
  const insight = snapshot?.failed
    ? 'Não foi possível ler seus registros agora.'
    : snapshot
      ? selection?.message.insight ?? 'Os registros deste período ainda estão sendo lidos.'
      : 'Lendo seus registros.';
  const focus = snapshot?.failed
    ? 'Abra a tela de novo em instantes.'
    : snapshot
      ? selection?.message.action ?? 'Aguarde a leitura dos três pilares.'
      : 'O mapa usa só o que já foi registrado.';

  return (
    <AppScreen width="narrow" backgroundColor={ink.page} backdrop={<PillarPlanet />}>
      <View style={styles.header}>
        <View style={styles.brand}>
          <Text style={styles.eyebrow}>Mapa</Text>
          <Text accessibilityRole="header" style={styles.title}>
            3 Pilares
          </Text>
        </View>
        <View style={styles.filters}>
          {filters.map((item) => {
            const selected = item.id === period;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setPeriod(item.id)}
                style={[styles.filter, selected && styles.filterOn]}>
                <Text style={[styles.filterLabel, selected && styles.filterLabelOn]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Text style={styles.subtitle}>Equilíbrio para uma vida extraordinária</Text>
      <View style={styles.map}>
        <PillarMap
          width={Math.max(280, column)}
          corpo={reading?.current.corpo ?? null}
          mente={reading?.current.mente ?? null}
          espirito={reading?.current.espirito ?? null}
          feminine={feminine}
        />
      </View>
      <InsightFocusCard insightTitle={heading.insight} focusTitle={heading.focus} insight={insight} focus={focus} stacked={stacked} />
      <EquilibriumCard percent={reading?.display ?? null} stacked={stacked} />
      <AdjustCard lines={lines} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  blocked: {
    flex: 1,
    backgroundColor: ink.page,
  },
  header: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  brand: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: ink.textChampagne,
    fontFamily: fonts.display,
    fontSize: 12,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 2,
    color: ink.text,
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 36,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  subtitle: {
    marginTop: 6,
    color: 'rgba(245,242,237,0.72)',
    fontFamily: fonts.displayLight,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  filters: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(232,200,142,0.45)',
    borderRadius: 22,
    padding: 3,
    marginTop: 6,
  },
  filter: {
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterOn: {
    borderColor: ink.champagne,
    backgroundColor: 'rgba(232,200,142,0.08)',
  },
  filterLabel: {
    color: ink.muted,
    fontFamily: fonts.display,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  filterLabelOn: {
    color: ink.textChampagne,
  },
  map: {
    marginTop: 8,
  },
});
