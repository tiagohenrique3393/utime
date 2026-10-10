import { pillarLabels, type HabitPillar } from '@/lib/habit-catalog';
import { dailyPercent } from '@/lib/habit-day';

export type PillarDayHabit = {
  id: string;
  pillar: HabitPillar;
  done: boolean;
};

export type PillarDayStat = {
  id: HabitPillar;
  label: string;
  planned: number;
  done: number;
  percent: number;
};

const pillarOrder: readonly HabitPillar[] = ['corpo', 'mente', 'espirito'];

// Percentual do dia: conclusões do pilar divididas pelos hábitos previstos desse pilar.
// Sem hábitos previstos o resultado é 0, sem divisão por zero. Cada hábito entra uma vez, só no seu pilar.
export function pillarDayStat(habits: readonly PillarDayHabit[], pillar: HabitPillar): PillarDayStat {
  let planned = 0;
  let done = 0;
  for (const habit of habits) {
    if (habit.pillar !== pillar) {
      continue;
    }
    planned += 1;
    if (habit.done) {
      done += 1;
    }
  }
  return {
    id: pillar,
    label: pillarLabels[pillar],
    planned,
    done,
    percent: dailyPercent(planned, done),
  };
}

export function dailyPillarStats(habits: readonly PillarDayHabit[]): PillarDayStat[] {
  return pillarOrder.map((pillar) => pillarDayStat(habits, pillar));
}
