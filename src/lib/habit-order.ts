import type { HabitPeriod } from '@/lib/habit-catalog';

export function habitOrderAfterMove(ids: readonly string[], habitId: string, index: number) {
  const rest = ids.filter((id) => id !== habitId);
  const at = Math.max(0, Math.min(Math.trunc(index), rest.length));
  return [...rest.slice(0, at), habitId, ...rest.slice(at)];
}

export function nextPeriod(period: HabitPeriod): HabitPeriod {
  if (period === 'manha') {
    return 'tarde';
  }
  if (period === 'tarde') {
    return 'noite';
  }
  return 'manha';
}

export type MovableHabit = {
  id: string;
  period: HabitPeriod;
  sortOrder: number;
  active: boolean;
};

export type HabitPlacement = {
  id: string;
  period: HabitPeriod;
  sortOrder: number;
};

export function periodSortBase(period: HabitPeriod) {
  if (period === 'manha') {
    return 1000;
  }
  if (period === 'tarde') {
    return 2000;
  }
  return 3000;
}

export function planHabitMove(habits: readonly MovableHabit[], habitId: string, period: HabitPeriod, index: number): HabitPlacement[] | null {
  const current = habits.find((habit) => habit.id === habitId && habit.active);
  if (!current) {
    return null;
  }
  const destination = habits
    .filter((habit) => habit.active && (habit.period === period || habit.id === habitId))
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id));
  const ordered = habitOrderAfterMove(
    destination.map((habit) => habit.id),
    habitId,
    index,
  );
  const base = periodSortBase(period);
  return ordered.map((id, position) => ({ id, period, sortOrder: base + position }));
}
