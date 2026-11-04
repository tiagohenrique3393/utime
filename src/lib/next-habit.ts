import type { HabitPeriod } from '@/lib/habit-catalog';

const periodOrder: readonly HabitPeriod[] = ['manha', 'tarde', 'noite'];

export type ScheduledHabit = {
  id: string;
  label: string;
  period: HabitPeriod;
  minutes: number | null;
  done: boolean;
};

export function nextScheduledHabit(habits: readonly ScheduledHabit[]) {
  const pending = habits
    .map((habit, index) => ({ habit, index }))
    .filter(({ habit }) => !habit.done)
    .sort((left, right) => {
      const periodDelta = periodOrder.indexOf(left.habit.period) - periodOrder.indexOf(right.habit.period);
      return periodDelta !== 0 ? periodDelta : left.index - right.index;
    });
  return pending[0]?.habit ?? null;
}

export function nextPendingHabit(habits: readonly ScheduledHabit[], current: HabitPeriod) {
  const pendingNow = habits.find((habit) => !habit.done && habit.period === current);
  return pendingNow ?? nextScheduledHabit(habits);
}
