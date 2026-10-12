import { monthDateKeys, pillarProgress, progressReport, shiftDateKey, weekDateKeys, weekdayIndex, type HabitLog, type ProgressHabit, type TodayProgressHabit } from '@/lib/progress-view';

export type PillarId = 'corpo' | 'mente' | 'espirito';

export type PillarScope = 'semana' | 'mes' | 'ano';

export type PillarPercents = Record<PillarId, number | null>;

export const pillarIds: readonly PillarId[] = ['corpo', 'mente', 'espirito'];

const emptyPercents: PillarPercents = { corpo: null, mente: null, espirito: null };

export function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, value));
}

export function isPercent(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function bodyAssetKey(journey: string | null | undefined): 'mantime' | 'womantime' {
  return journey === 'womantime' ? 'womantime' : 'mantime';
}

// Média dos três percentuais precisos. Um pilar sem registro permanece nulo:
// não entra como zero e o denominador não muda para 2.
export function equilibriumMean(values: readonly (number | null | undefined)[]) {
  if (values.length !== 3 || values.some((value) => !isPercent(value))) {
    return null;
  }
  const precise = values.map((value) => clampPercent(value as number));
  return precise.reduce((sum, value) => sum + value, 0) / 3;
}

export function equilibriumDisplay(values: readonly (number | null | undefined)[]) {
  const mean = equilibriumMean(values);
  if (mean == null) {
    return null;
  }
  return Math.round(mean);
}

export function shownPercent(value: number | null | undefined) {
  if (!isPercent(value)) {
    return '—';
  }
  return `${Math.round(clampPercent(value))}%`;
}

export function pointOnAxis(
  center: { x: number; y: number },
  vertex: { x: number; y: number },
  percent: number | null,
) {
  const scale = isPercent(percent) ? clampPercent(percent) / 100 : 0;
  return {
    x: center.x + (vertex.x - center.x) * scale,
    y: center.y + (vertex.y - center.y) * scale,
  };
}

export function percentsFromPillars(pillars: readonly { pillar: PillarId; percent: number | null }[]): PillarPercents {
  const next: PillarPercents = { ...emptyPercents };
  for (const item of pillars) {
    next[item.pillar] = isPercent(item.percent) ? clampPercent(item.percent) : null;
  }
  return next;
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function parts(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return { year, month, day };
}

export function comparisonAnchor(period: PillarScope, today: string) {
  if (period === 'semana') {
    return shiftDateKey(today, -7);
  }
  const { year, month, day } = parts(today);
  if (period === 'mes') {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const last = new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate();
    return `${prevYear}-${pad(prevMonth)}-${pad(Math.min(day, last))}`;
  }
  const last = new Date(Date.UTC(year - 1, month, 0)).getUTCDate();
  return `${year - 1}-${pad(month)}-${pad(Math.min(day, last))}`;
}

export function periodAnchor(period: PillarScope, today: string) {
  if (period === 'semana') {
    return weekDateKeys(today)[0] ?? today;
  }
  if (period === 'mes') {
    return monthDateKeys(today)[0] ?? today;
  }
  return today.slice(0, 4);
}

export function periodIsPartial(period: PillarScope, today: string) {
  if (period === 'semana') {
    const keys = weekDateKeys(today);
    return (keys[keys.length - 1] ?? today) > today;
  }
  if (period === 'mes') {
    const keys = monthDateKeys(today);
    return (keys[keys.length - 1] ?? today) > today;
  }
  const { month, day } = parts(today);
  return !(month === 12 && day === 31);
}

function elapsedKeys(period: PillarScope, today: string) {
  if (period === 'semana') {
    return weekDateKeys(today).filter((key) => key <= today);
  }
  if (period === 'mes') {
    return monthDateKeys(today).filter((key) => key <= today);
  }
  const { year } = parts(today);
  const keys: string[] = [];
  for (let month = 1; month <= 12; month += 1) {
    const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
    for (let day = 1; day <= last; day += 1) {
      const key = `${year}-${pad(month)}-${pad(day)}`;
      if (key > today) {
        return keys;
      }
      keys.push(key);
    }
  }
  return keys;
}

function readAt(today: string, period: PillarScope, logs: readonly HabitLog[], habits: readonly ProgressHabit[], todayHabits: readonly TodayProgressHabit[] | null) {
  const report = progressReport({
    today,
    period,
    logs,
    hydration: [],
    todayRoutine: null,
    habits,
    todayHabits,
  });
  return percentsFromPillars(report.pillars);
}

export function readPillarPeriod(input: {
  today: string;
  period: PillarScope;
  logs: readonly HabitLog[];
  habits: readonly ProgressHabit[];
  todayHabits?: readonly TodayProgressHabit[] | null;
}) {
  const todayHabits = input.todayHabits ?? null;
  const current = readAt(input.today, input.period, input.logs, input.habits, todayHabits);
  const previousRaw = readAt(comparisonAnchor(input.period, input.today), input.period, input.logs, input.habits, null);
  const previous = pillarIds.some((id) => isPercent(previousRaw[id])) ? previousRaw : null;
  let recordedDays = 0;
  for (const key of elapsedKeys(input.period, input.today)) {
    const day = pillarProgress([key], input.today, input.logs, input.habits, key === input.today ? todayHabits : null);
    if (day.some((item) => item.percent != null)) {
      recordedDays += 1;
    }
  }
  return {
    current,
    previous,
    partial: periodIsPartial(input.period, input.today),
    recordedDays,
    equilibrium: equilibriumMean([current.corpo, current.mente, current.espirito]),
    display: equilibriumDisplay([current.corpo, current.mente, current.espirito]),
  };
}

export function habitCounts(habits: readonly { pillar: PillarId }[]) {
  const counts: Record<PillarId, number> = { corpo: 0, mente: 0, espirito: 0 };
  for (const habit of habits) {
    counts[habit.pillar] += 1;
  }
  return counts;
}

export function weekdayOf(key: string) {
  return weekdayIndex(key);
}
