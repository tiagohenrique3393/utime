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
