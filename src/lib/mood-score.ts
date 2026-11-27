import { zonedHour } from '@/lib/habit-day';

export type MoodPeriod = 'manha' | 'tarde' | 'noite';
export type MoodLevel = 1 | 2 | 3 | 4 | 5;

export const MOOD_PERIODS: readonly MoodPeriod[] = ['manha', 'tarde', 'noite'];

export const moodPeriodLabel: Record<MoodPeriod, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
};

/** Manhã 00–12, tarde 12–18, noite 18–24 (America/Sao_Paulo via zonedHour). */
export function moodPeriodAt(date = new Date()): MoodPeriod {
  const hour = zonedHour(date);
  if (hour < 12) {
    return 'manha';
  }
  if (hour < 18) {
    return 'tarde';
  }
  return 'noite';
}

export function moodPeriodIndex(period: MoodPeriod): 1 | 2 | 3 {
  if (period === 'manha') {
    return 1;
  }
  if (period === 'tarde') {
    return 2;
  }
  return 3;
}

export function moodPeriodOrdinal(period: MoodPeriod) {
  return `${moodPeriodIndex(period)} DE 3`;
}

/** Níveis 1–5 → 20/40/60/80/100. */
export function moodLevelScore(level: number): number | null {
  const value = Math.round(level);
  if (value < 1 || value > 5) {
    return null;
  }
  return value * 20;
}

/** Média só dos períodos respondidos; ausência nunca conta como 0. */
export function dailyMoodAverage(scores: readonly (number | null | undefined)[]) {
  const present = scores.filter((value): value is number => value != null && Number.isFinite(value));
  if (present.length === 0) {
    return null;
  }
  return Math.round((present.reduce((sum, value) => sum + value, 0) / present.length) * 100) / 100;
}

export function isMoodPeriodPastOrCurrent(period: MoodPeriod, now = new Date()) {
  const current = moodPeriodAt(now);
  return moodPeriodIndex(period) <= moodPeriodIndex(current);
}

export function canEditMoodPeriod(period: MoodPeriod, localDate: string, today: string, now = new Date()) {
  if (localDate !== today) {
    return false;
  }
  return isMoodPeriodPastOrCurrent(period, now);
}
