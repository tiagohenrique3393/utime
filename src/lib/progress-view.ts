import { dailyPercent } from '@/lib/habit-day';
import { hydrationReached } from '@/lib/hydration';

export type ProgressPeriod = 'dia' | 'semana' | 'mes' | 'ano';

export type HabitLog = {
  dateKey: string;
  habitId: string;
  completed: boolean;
};

export type HydrationLog = {
  dateKey: string;
  consumedMl: number;
  goalMl: number | null;
};

export type TodayRoutine = {
  total: number;
  completed: number;
};

export type PercentPoint = {
  key: string;
  label: string;
  value: number | null;
};

export type WaterPoint = {
  key: string;
  label: string;
  consumedMl: number | null;
  goalMl: number | null;
};

export type WaterSummary = {
  consumedMl: number | null;
  goalMl: number | null;
  goalDays: number;
  goalMet: number;
};

export type ProgressPillar = 'corpo' | 'mente' | 'espirito';

export type ProgressHabit = {
  id: string;
  label: string;
  pillar: ProgressPillar;
  catalogHabitId: string | null;
};

export type TodayProgressHabit = ProgressHabit & {
  done: boolean;
};

export type PillarProgress = {
  pillar: ProgressPillar;
  percent: number | null;
};

export type PracticedHabit = {
  id: string;
  label: string;
  percent: number;
  pillar: ProgressPillar;
  catalogHabitId: string | null;
};

export type WaterCoverage = {
  recordedDays: number;
  elapsedDays: number;
};

export type ProgressReport = {
  dia: number | null;
  semana: number | null;
  mes: number | null;
  ano: number | null;
  habitPoints: readonly PercentPoint[];
  waterPoints: readonly WaterPoint[];
  water: WaterSummary;
  pillars: readonly PillarProgress[];
  practiced: readonly PracticedHabit[];
  periodGoalMl: number | null;
  waterCoverage: WaterCoverage;
};

const weekdayLabels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const pillarOrder: readonly ProgressPillar[] = ['corpo', 'mente', 'espirito'];
const hydrationCatalogId = 'corpo-hidratacao';

export function shiftDateKey(key: string, days: number) {
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  const nextYear = date.getUTCFullYear();
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
  const nextDay = String(date.getUTCDate()).padStart(2, '0');
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

export function weekdayIndex(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function dateParts(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return { year, month, day };
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function weekDateKeys(today: string) {
  const start = shiftDateKey(today, -weekdayIndex(today));
  return Array.from({ length: 7 }, (_, index) => shiftDateKey(start, index));
}

export function monthDateKeys(today: string) {
  const { year, month } = dateParts(today);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: last }, (_, index) => dateKey(year, month, index + 1));
}

function yearDateKeys(today: string) {
  const { year } = dateParts(today);
  const keys: string[] = [];
  for (let month = 1; month <= 12; month += 1) {
    const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
    for (let day = 1; day <= last; day += 1) {
      const key = dateKey(year, month, day);
      if (key > today) {
        return keys;
      }
      keys.push(key);
    }
  }
  return keys;
}

export function averagePercent(values: readonly (number | null)[]) {
  const present = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (present.length === 0) {
    return null;
  }
  return Math.round((present.reduce((sum, value) => sum + value, 0) / present.length) * 100) / 100;
}

function logsOn(logs: readonly HabitLog[], dateKeyValue: string) {
  return logs.filter((log) => log.dateKey === dateKeyValue);
}

export function habitPercentOn(
  dateKeyValue: string,
  today: string,
  logs: readonly HabitLog[],
  todayRoutine: TodayRoutine | null,
) {
  if (dateKeyValue > today) {
    return null;
  }
  if (dateKeyValue === today && todayRoutine) {
    if (todayRoutine.total <= 0) {
      return null;
    }
    const done = Math.max(0, Math.min(todayRoutine.total, todayRoutine.completed));
    return dailyPercent(todayRoutine.total, done);
  }
  const rows = logsOn(logs, dateKeyValue);
  if (rows.length === 0) {
    return null;
  }
  return dailyPercent(rows.length, rows.filter((row) => row.completed).length);
}

export function recordedPercents(
  logs: readonly HabitLog[],
  today: string,
  todayRoutine: TodayRoutine | null,
) {
  const dates = new Set(logs.map((log) => log.dateKey).filter((key) => key <= today));
  if (todayRoutine && todayRoutine.total > 0) {
    dates.add(today);
  }
  const percents: Record<string, number> = {};
  for (const key of dates) {
    const value = habitPercentOn(key, today, logs, todayRoutine);
    if (value !== null) {
      percents[key] = value;
    }
  }
  return percents;
}

function waterOn(rows: readonly HydrationLog[], dateKeyValue: string) {
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    if (rows[index]?.dateKey === dateKeyValue) {
      return rows[index] ?? null;
    }
  }
  return null;
}

function goalSteps(rows: readonly HydrationLog[]) {
  const byDate = new Map<string, number>();
  for (const row of rows) {
    if (row.goalMl != null && row.goalMl > 0) {
      byDate.set(row.dateKey, row.goalMl);
    }
  }
  return [...byDate.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([dateKey, goalMl]) => ({ dateKey, goalMl }));
}

function goalForDate(dateKeyValue: string, steps: readonly { dateKey: string; goalMl: number }[]) {
  let carried: number | null = null;
  for (const step of steps) {
    if (step.dateKey > dateKeyValue) {
      break;
    }
    carried = step.goalMl;
  }
  if (carried != null) {
    return carried;
  }
  return steps[0]?.goalMl ?? null;
}

function summarizeWater(dates: readonly string[], rows: readonly HydrationLog[], today: string): WaterSummary {
  let consumed = 0;
  let seen = false;
  let goalDays = 0;
  let goalMet = 0;
  let singleGoal: number | null = null;
  for (const key of dates) {
    if (key > today) {
      continue;
    }
    const row = waterOn(rows, key);
    if (!row) {
      continue;
    }
    seen = true;
    consumed += row.consumedMl;
    singleGoal = row.goalMl;
    if (row.goalMl != null && row.goalMl > 0) {
      goalDays += 1;
      if (hydrationReached(row.consumedMl, row.goalMl)) {
        goalMet += 1;
      }
    }
  }
  return {
    consumedMl: seen ? consumed : null,
    goalMl: dates.length === 1 ? singleGoal : null,
    goalDays,
    goalMet,
  };
}

function habitPointsFor(dates: readonly string[], labelFor: (key: string) => string, today: string, logs: readonly HabitLog[], routine: TodayRoutine | null) {
  return dates.map((key) => ({
    key,
    label: labelFor(key),
    value: habitPercentOn(key, today, logs, routine),
  }));
}

function waterPointsFor(dates: readonly string[], labelFor: (key: string) => string, today: string, rows: readonly HydrationLog[]) {
  return dates.map((key) => {
    if (key > today) {
      return { key, label: labelFor(key), consumedMl: null, goalMl: null };
    }
    const row = waterOn(rows, key);
    return {
      key,
      label: labelFor(key),
      consumedMl: row ? row.consumedMl : null,
      goalMl: row ? row.goalMl : null,
    };
  });
}

function dayLabel(key: string) {
  return String(dateParts(key).day);
}

function monthSeries(today: string, logs: readonly HabitLog[], rows: readonly HydrationLog[], routine: TodayRoutine | null) {
  const { year, month } = dateParts(today);
  const habitPoints: PercentPoint[] = [];
  const waterPoints: WaterPoint[] = [];
  for (let index = 1; index <= month; index += 1) {
    const keys: string[] = [];
    const last = new Date(Date.UTC(year, index, 0)).getUTCDate();
    for (let day = 1; day <= last; day += 1) {
      const key = dateKey(year, index, day);
      if (key > today) {
        break;
      }
      keys.push(key);
    }
    const label = monthLabels[index - 1];
    const monthKey = dateKey(year, index, 1);
    habitPoints.push({
      key: monthKey,
      label,
      value: averagePercent(keys.map((key) => habitPercentOn(key, today, logs, routine))),
    });
    const water = summarizeWater(keys, rows, today);
    waterPoints.push({
      key: monthKey,
      label,
      consumedMl: water.consumedMl,
      goalMl: null,
    });
  }
  return { habitPoints, waterPoints };
}

function habitIndex(habits: readonly ProgressHabit[]) {
  return new Map(habits.map((habit) => [habit.id, habit]));
}

function isHydrationHabit(habit: ProgressHabit) {
  return habit.catalogHabitId === hydrationCatalogId;
}

function pillarOnDay(
  dateKeyValue: string,
  today: string,
  logs: readonly HabitLog[],
  habits: ReadonlyMap<string, ProgressHabit>,
  todayHabits: readonly TodayProgressHabit[] | null,
) {
  const empty: Record<ProgressPillar, number | null> = { corpo: null, mente: null, espirito: null };
  if (dateKeyValue > today) {
    return empty;
  }
  if (dateKeyValue === today && todayHabits && todayHabits.length > 0) {
    const next = { ...empty };
    for (const pillar of pillarOrder) {
      const group = todayHabits.filter((habit) => habit.pillar === pillar);
      next[pillar] = group.length === 0 ? null : dailyPercent(group.length, group.filter((habit) => habit.done).length);
    }
    return next;
  }
  const rows = logsOn(logs, dateKeyValue);
  if (rows.length === 0) {
    return empty;
  }
  const next = { ...empty };
  for (const pillar of pillarOrder) {
    const group = rows.filter((row) => habits.get(row.habitId)?.pillar === pillar);
    next[pillar] = group.length === 0 ? null : dailyPercent(group.length, group.filter((row) => row.completed).length);
  }
  return next;
}

export function pillarProgress(
  dates: readonly string[],
  today: string,
  logs: readonly HabitLog[],
  habits: readonly ProgressHabit[],
  todayHabits: readonly TodayProgressHabit[] | null,
): PillarProgress[] {
  const known = habitIndex(habits);
  const days = dates.map((key) => pillarOnDay(key, today, logs, known, todayHabits));
  return pillarOrder.map((pillar) => ({
    pillar,
    percent: averagePercent(days.map((day) => day[pillar])),
  }));
}

export function practicedHabits(
  dates: readonly string[],
  today: string,
  logs: readonly HabitLog[],
  habits: readonly ProgressHabit[],
  todayHabits: readonly TodayProgressHabit[] | null,
): PracticedHabit[] {
  const known = habitIndex(habits);
  const stats = new Map<string, { label: string; pillar: ProgressPillar; catalogHabitId: string | null; completed: number; seen: number }>();
  const bump = (id: string, label: string, pillar: ProgressPillar, catalogHabitId: string | null, done: boolean) => {
    const current = stats.get(id) ?? { label, pillar, catalogHabitId, completed: 0, seen: 0 };
    current.seen += 1;
    current.pillar = pillar;
    current.catalogHabitId = catalogHabitId;
    if (done) {
      current.completed += 1;
    }
    if (label) {
      current.label = label;
    }
    stats.set(id, current);
  };
  for (const key of dates) {
    if (key > today) {
      continue;
    }
    if (key === today && todayHabits && todayHabits.length > 0) {
      for (const habit of todayHabits) {
        if (isHydrationHabit(habit)) {
          continue;
        }
        bump(habit.id, habit.label, habit.pillar, habit.catalogHabitId, habit.done);
      }
      continue;
    }
    const seen = new Set<string>();
    for (const row of logsOn(logs, key)) {
      const meta = known.get(row.habitId);
      if (!meta || isHydrationHabit(meta) || seen.has(row.habitId)) {
        continue;
      }
      seen.add(row.habitId);
      bump(meta.id, meta.label, meta.pillar, meta.catalogHabitId, row.completed);
    }
  }
  return [...stats.entries()]
    .filter(([, item]) => item.completed > 0 && item.seen > 0)
    .map(([id, item]) => ({
      id,
      label: item.label,
      pillar: item.pillar,
      catalogHabitId: item.catalogHabitId,
      completed: item.completed,
      percent: dailyPercent(item.seen, item.completed),
    }))
    .sort((a, b) => b.completed - a.completed || b.percent - a.percent || a.label.localeCompare(b.label, 'pt'))
    .slice(0, 3)
    .map(({ id, label, pillar, catalogHabitId, percent }) => ({ id, label, pillar, catalogHabitId, percent }));
}

export function waterCoverage(dates: readonly string[], rows: readonly HydrationLog[], today: string): WaterCoverage {
  let recordedDays = 0;
  let elapsedDays = 0;
  for (const key of dates) {
    if (key > today) {
      continue;
    }
    elapsedDays += 1;
    if (waterOn(rows, key)) {
      recordedDays += 1;
    }
  }
  return { recordedDays, elapsedDays };
}

export function periodGoalMl(dates: readonly string[], rows: readonly HydrationLog[], today: string) {
  const steps = goalSteps(rows);
  if (steps.length === 0) {
    return null;
  }
  let sum = 0;
  let seen = false;
  for (const key of dates) {
    if (key > today) {
      continue;
    }
    const goal = goalForDate(key, steps);
    if (goal == null || goal <= 0) {
      continue;
    }
    seen = true;
    sum += goal;
  }
  return seen ? sum : null;
}

function datesForPeriod(period: ProgressPeriod, today: string, week: readonly string[], month: readonly string[], year: readonly string[]) {
  if (period === 'dia') {
    return [today];
  }
  if (period === 'semana') {
    return week;
  }
  if (period === 'mes') {
    return month;
  }
  return year;
}

export function progressReport(input: {
  today: string;
  period: ProgressPeriod;
  logs: readonly HabitLog[];
  hydration: readonly HydrationLog[];
  todayRoutine: TodayRoutine | null;
  habits?: readonly ProgressHabit[];
  todayHabits?: readonly TodayProgressHabit[] | null;
}): ProgressReport {
  const week = weekDateKeys(input.today);
  const month = monthDateKeys(input.today);
  const year = yearDateKeys(input.today);
  const percent = (key: string) => habitPercentOn(key, input.today, input.logs, input.todayRoutine);
  let habitPoints: PercentPoint[] = [];
  let waterPoints: WaterPoint[] = [];
  let waterDates: string[] = [input.today];
  if (input.period === 'dia') {
    habitPoints = habitPointsFor([input.today], dayLabel, input.today, input.logs, input.todayRoutine);
    waterPoints = waterPointsFor([input.today], dayLabel, input.today, input.hydration);
    waterDates = [input.today];
  } else if (input.period === 'semana') {
    habitPoints = habitPointsFor(week, (key) => weekdayLabels[weekdayIndex(key)], input.today, input.logs, input.todayRoutine);
    waterPoints = waterPointsFor(week, (key) => weekdayLabels[weekdayIndex(key)], input.today, input.hydration);
    waterDates = week;
  } else if (input.period === 'mes') {
    habitPoints = habitPointsFor(month, dayLabel, input.today, input.logs, input.todayRoutine);
    waterPoints = waterPointsFor(month, dayLabel, input.today, input.hydration);
    waterDates = month;
  } else {
    const series = monthSeries(input.today, input.logs, input.hydration, input.todayRoutine);
    habitPoints = series.habitPoints;
    waterPoints = series.waterPoints;
    waterDates = year;
  }
  const scope = datesForPeriod(input.period, input.today, week, month, year);
  const habits = input.habits ?? [];
  const todayHabits = input.todayHabits ?? null;
  return {
    dia: percent(input.today),
    semana: averagePercent(week.map(percent)),
    mes: averagePercent(month.map(percent)),
    ano: averagePercent(year.map(percent)),
    habitPoints,
    waterPoints,
    water: summarizeWater(waterDates, input.hydration, input.today),
    pillars: pillarProgress(scope, input.today, input.logs, habits, todayHabits),
    practiced: practicedHabits(scope, input.today, input.logs, habits, todayHabits),
    periodGoalMl: periodGoalMl(waterDates, input.hydration, input.today),
    waterCoverage: waterCoverage(waterDates, input.hydration, input.today),
  };
}
