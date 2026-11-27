import { zonedHour } from '@/lib/habit-day';

export type MoodPeriod = 'manha' | 'tarde' | 'noite';
export type MoodLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export const MOOD_PERIODS: readonly MoodPeriod[] = ['manha', 'tarde', 'noite'];
export const MOOD_LEVEL_MIN = 0;
export const MOOD_LEVEL_MAX = 10;

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
  const title = period === 'manha' ? 'MANHÃ' : period === 'tarde' ? 'TARDE' : 'NOITE';
  return `${title} • ${moodPeriodIndex(period)} DE 3`;
}

export function clampMoodLevel(level: number): MoodLevel | null {
  if (!Number.isFinite(level)) {
    return null;
  }
  const value = Math.round(level);
  if (value < MOOD_LEVEL_MIN || value > MOOD_LEVEL_MAX) {
    return null;
  }
  return value as MoodLevel;
}

/** Converte nível legado 1–5 → 0–10 (1→2 … 5→10). */
export function migrateLegacyMoodLevel(level: number) {
  const value = Math.round(level);
  if (value >= 1 && value <= 5) {
    return (value * 2) as MoodLevel;
  }
  return clampMoodLevel(value);
}

/** Níveis 0–10 → 0%–100%. */
export function moodLevelScore(level: number): number | null {
  const value = clampMoodLevel(level);
  if (value == null) {
    return null;
  }
  return value * 10;
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
  if (localDate > today) {
    return false;
  }
  if (localDate < today) {
    // Períodos de dias anteriores elegíveis (registro esquecido).
    return true;
  }
  return isMoodPeriodPastOrCurrent(period, now);
}
