/** Score de sono: 50% quantidade + 50% qualidade. Não é clínico. */

export const DEFAULT_SLEEP_GOAL_HOURS = 8;
export const SLEEP_HOURS_MIN = 0;
export const SLEEP_HOURS_MAX = 12;
export const SLEEP_HOURS_STEP = 0.5;

export function clampSleepHours(hours: number) {
  if (!Number.isFinite(hours)) {
    return SLEEP_HOURS_MIN;
  }
  const stepped = Math.round(hours / SLEEP_HOURS_STEP) * SLEEP_HOURS_STEP;
  return Math.max(SLEEP_HOURS_MIN, Math.min(SLEEP_HOURS_MAX, stepped));
}

export function sleepQuantityPercent(hours: number, goalHours = DEFAULT_SLEEP_GOAL_HOURS) {
  const goal = Number.isFinite(goalHours) && goalHours > 0 ? goalHours : DEFAULT_SLEEP_GOAL_HOURS;
  const safe = clampSleepHours(hours);
  return Math.max(0, Math.min(100, (safe / goal) * 100));
}

/** Qualidade 1→20 … 5→100. */
export function sleepQualityPercent(quality: number) {
  const level = Math.round(quality);
  if (level < 1 || level > 5) {
    return null;
  }
  return level * 20;
}

export function sleepScore(hours: number, quality: number, goalHours = DEFAULT_SLEEP_GOAL_HOURS) {
  const qualityPct = sleepQualityPercent(quality);
  if (qualityPct == null) {
    return null;
  }
  const quantityPct = sleepQuantityPercent(hours, goalHours);
  return Math.round(((quantityPct + qualityPct) / 2) * 100) / 100;
}

export function formatSleepHours(hours: number) {
  const safe = clampSleepHours(hours);
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: Number.isInteger(safe) ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(safe);
}
