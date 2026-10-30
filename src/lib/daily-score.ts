import { dailyPercent } from '@/lib/habit-day';
import { dailyPillarStats, type PillarDayStat } from '@/lib/pillar-daily';
import { HYDRATION_HABIT_ID } from '@/lib/suggested-habits';

export type ScorePillar = 'corpo' | 'mente' | 'espirito';

export type ScoreHabit = {
  id: string;
  pillar: ScorePillar;
  done: boolean;
  catalogHabitId: string | null;
};

export type DailyScore = {
  includedIds: string[];
  excludedIds: string[];
  total: number;
  done: number;
  percent: number;
  pillars: PillarDayStat[];
};

// O hábito oficial de hidratação não entra no dia. O registro em mililitros é outro módulo.
// Um hábito criado pela pessoa, mesmo sobre água, continua valendo se não tiver esse catálogo.
export function isOfficialHydration(catalogHabitId: string | null | undefined) {
  return catalogHabitId === HYDRATION_HABIT_ID;
}

export function officialHydrationIds(habits: readonly { id: string; catalogHabitId: string | null }[]) {
  const ids = new Set<string>();
  for (const habit of habits) {
    if (isOfficialHydration(habit.catalogHabitId)) {
      ids.add(habit.id);
    }
  }
  ids.add(HYDRATION_HABIT_ID);
  return ids;
}

export function logsWithoutOfficialHydration<T extends { habitId: string }>(
  logs: readonly T[],
  habits: readonly { id: string; catalogHabitId: string | null }[],
) {
  const excluded = officialHydrationIds(habits);
  return logs.filter((row) => !excluded.has(row.habitId));
}

export function scoreHabits(habits: readonly ScoreHabit[]): DailyScore {
  const included: ScoreHabit[] = [];
  const excludedIds: string[] = [];
  for (const habit of habits) {
    if (isOfficialHydration(habit.catalogHabitId)) {
      excludedIds.push(habit.id);
      continue;
    }
    included.push(habit);
  }
  const done = included.filter((habit) => habit.done).length;
  return {
    includedIds: included.map((habit) => habit.id),
    excludedIds,
    total: included.length,
    done,
    percent: dailyPercent(included.length, done),
    pillars: dailyPillarStats(included.map((habit) => ({ id: habit.id, pillar: habit.pillar, done: habit.done }))),
  };
}
