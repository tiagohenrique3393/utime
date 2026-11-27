/** Score de sono: 50% duração + 50% qualidade (0–10). Não é clínico. */

export const DEFAULT_SLEEP_GOAL_HOURS = 8;
export const SLEEP_HOURS_MIN = 0;
export const SLEEP_HOURS_MAX = 12;
export const SLEEP_HOURS_STEP = 0.5;
export const SLEEP_QUALITY_MIN = 0;
export const SLEEP_QUALITY_MAX = 10;

export function clampSleepHours(hours: number) {
  if (!Number.isFinite(hours)) {
    return SLEEP_HOURS_MIN;
  }
  const stepped = Math.round(hours / SLEEP_HOURS_STEP) * SLEEP_HOURS_STEP;
  return Math.max(SLEEP_HOURS_MIN, Math.min(SLEEP_HOURS_MAX, stepped));
}

export function clampSleepQuality(quality: number) {
  if (!Number.isFinite(quality)) {
    return null;
  }
  const level = Math.round(quality);
  if (level < SLEEP_QUALITY_MIN || level > SLEEP_QUALITY_MAX) {
    return null;
  }
  return level;
}

/** Converte qualidade legado 1–5 → 0–10 (1→2 … 5→10). Valores 0–10 permanecem. */
export function migrateLegacySleepQuality(quality: number) {
  const level = Math.round(quality);
  if (level >= 1 && level <= 5) {
    return level * 2;
  }
  return clampSleepQuality(level);
}

export function sleepQuantityPercent(hours: number, goalHours = DEFAULT_SLEEP_GOAL_HOURS) {
  const goal = Number.isFinite(goalHours) && goalHours > 0 ? goalHours : DEFAULT_SLEEP_GOAL_HOURS;
  const safe = clampSleepHours(hours);
  return Math.max(0, Math.min(100, (safe / goal) * 100));
}

/** Qualidade 0–10 → 0%–100%. */
export function sleepQualityPercent(quality: number) {
  const clamped = clampSleepQuality(quality);
  if (clamped == null) {
    return null;
  }
  return clamped * 10;
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
