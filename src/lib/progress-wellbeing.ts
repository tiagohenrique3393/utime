import {
  cumulativeDayHabitsSeries,
  dayAxisLabels,
  type HabitCompletionEvent,
  type TimedChartPoint,
} from '@/lib/habit-day-series';
import { dailyMoodAverage, type MoodPeriod } from '@/lib/mood-score';
import {
  averagePercent,
  monthDateKeys,
  shiftDateKey,
  weekDateKeys,
  weekdayIndex,
  type PercentPoint,
  type ProgressPeriod,
} from '@/lib/progress-view';

export type { TimedChartPoint } from '@/lib/habit-day-series';

export type SleepPoint = {
  localDate: string;
  score: number;
  hours?: number;
  quality?: number;
  goalHours?: number;
};

export type MoodPoint = {
  localDate: string;
  period: MoodPeriod;
  score: number;
  level?: number;
};

const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const weekDayLabels = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

/** Frações do dia para posicionar check-ins sem inventar histórico artificial. */
const moodHourFraction: Record<MoodPeriod, number> = {
  manha: 6 / 24,
  tarde: 15 / 24,
  noite: 21 / 24,
};
const sleepHourFraction = 7 / 24;

function dateParts(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return { year, month, day };
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Doze meses do ano civil; meses futuros ficam com datas vazias (sem pontuação fictícia). */
function yearMonthKeys(today: string) {
  const { year } = dateParts(today);
  const keys: { key: string; label: string; dates: string[] }[] = [];
  for (let month = 1; month <= 12; month += 1) {
    const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const dates: string[] = [];
    for (let day = 1; day <= last; day += 1) {
      const key = dateKey(year, month, day);
      if (key <= today) {
        dates.push(key);
      }
    }
    keys.push({ key: dateKey(year, month, 1), label: monthLabels[month - 1], dates });
  }
  return keys;
}

/**
 * Quatro intervalos fixos do mês civil (não semanas de calendário):
 * 1ª SEM: dias 1–7 | 2ª SEM: 8–14 | 3ª SEM: 15–21 | 4ª SEM: 22–último dia.
 * Todos os dias do mês entram em algum intervalo; meses com 28–31 dias são cobertos.
 */
export function monthCalendarWeeks(today: string) {
  const monthDates = monthDateKeys(today);
  const first = monthDates[0];
  if (!first) {
    return [];
  }
  const year = Number(first.slice(0, 4));
  const month = Number(first.slice(5, 7));
  const lastDay = Number(monthDates[monthDates.length - 1]?.slice(8, 10) ?? 28);
  const ranges: { start: number; end: number; label: string }[] = [
    { start: 1, end: 7, label: '1ª SEM' },
    { start: 8, end: 14, label: '2ª SEM' },
    { start: 15, end: 21, label: '3ª SEM' },
    { start: 22, end: lastDay, label: '4ª SEM' },
  ];
  return ranges.map((range) => {
    const dates: string[] = [];
    for (let day = range.start; day <= range.end; day += 1) {
      const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (monthDates.includes(key) && key <= today) {
        dates.push(key);
      }
    }
    return {
      key: `${year}-${String(month).padStart(2, '0')}-w${range.start}`,
      label: range.label,
      dates,
    };
  });
}

function sleepOn(rows: readonly SleepPoint[], key: string) {
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    if (rows[i]?.localDate === key) {
      return rows[i]?.score ?? null;
    }
  }
  return null;
}

function sleepRowOn(rows: readonly SleepPoint[], key: string) {
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    if (rows[i]?.localDate === key) {
      return rows[i] ?? null;
    }
  }
  return null;
}

function moodOnDay(rows: readonly MoodPoint[], key: string) {
  const scores = rows.filter((row) => row.localDate === key).map((row) => row.score);
  return dailyMoodAverage(scores);
}

export function sleepAverage(dates: readonly string[], rows: readonly SleepPoint[]) {
  return averagePercent(dates.map((key) => sleepOn(rows, key)));
}

export function moodAverage(dates: readonly string[], rows: readonly MoodPoint[]) {
  return averagePercent(dates.map((key) => moodOnDay(rows, key)));
}

export function averageSleepHours(dates: readonly string[], rows: readonly SleepPoint[]) {
  const values = dates
    .map((key) => sleepRowOn(rows, key)?.hours)
    .filter((value): value is number => value != null && Number.isFinite(value));
  if (values.length === 0) {
    return null;
  }
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

export function averageSleepQuality(dates: readonly string[], rows: readonly SleepPoint[]) {
  const values = dates
    .map((key) => sleepRowOn(rows, key)?.quality)
    .filter((value): value is number => value != null && Number.isFinite(value));
  if (values.length === 0) {
    return null;
  }
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

export function moodPeriodBreakdown(today: string, rows: readonly MoodPoint[]) {
  const periods: MoodPeriod[] = ['manha', 'tarde', 'noite'];
  return periods.map((period) => {
    const row = rows.find((item) => item.localDate === today && item.period === period);
    return {
      period,
      score: row?.score ?? null,
      level: row?.level ?? null,
    };
  });
}

export function wellbeingSeries(options: {
  today: string;
  period: ProgressPeriod;
  sleep: readonly SleepPoint[];
  mood: readonly MoodPoint[];
  habits: readonly PercentPoint[];
  /** Eventos intradía (só DIA). Sem timestamps inventados. */
  dayEvents?: readonly HabitCompletionEvent[];
  dayPlanned?: number;
  dayCompletedIds?: readonly string[];
  now?: Date;
}): {
  labels: string[];
  habit: (number | null)[];
  sleep: (number | null)[];
  mood: (number | null)[];
  sleepScore: number | null;
  moodScore: number | null;
  lineStyle: 'step' | 'curve';
  timed?: {
    habits: TimedChartPoint[];
    sleep: TimedChartPoint[];
    mood: TimedChartPoint[];
  };
} {
  const { today, period, sleep, mood, habits } = options;

  if (period === 'dia') {
    const habit = habits[0]?.value ?? null;
    const sleepScore = sleepOn(sleep, today);
    const moodScore = moodOnDay(mood, today);
    const moodRows = mood.filter((row) => row.localDate === today);
    const planned = Math.max(0, options.dayPlanned ?? 0);
    const timedHabits =
      planned > 0
        ? cumulativeDayHabitsSeries({
            dayKey: today,
            planned,
            events: options.dayEvents ?? [],
            currentCompletedIds: options.dayCompletedIds ?? [],
            now: options.now,
            ringPercent: habit,
          })
        : [{ fraction: 0, value: 0 }];
    return {
      labels: [...dayAxisLabels],
      // Séries indexadas só para fallback; o gráfico DIA usa `timed` + curva suave (como SEMANA).
      habit: [0, null, null, null, habit],
      sleep: [null, sleepScore, null, null, null],
      mood: [
        null,
        moodRows.find((row) => row.period === 'manha')?.score ?? null,
        moodRows.find((row) => row.period === 'tarde')?.score ?? null,
        moodRows.find((row) => row.period === 'noite')?.score ?? null,
        null,
      ],
      sleepScore,
      moodScore,
      lineStyle: 'curve',
      timed: {
        habits: timedHabits,
        sleep: sleepScore == null ? [] : [{ fraction: sleepHourFraction, value: sleepScore }],
        mood: moodRows.map((row) => ({ fraction: moodHourFraction[row.period], value: row.score })),
      },
    };
  }

  if (period === 'semana') {
    const dates = weekDateKeys(today);
    const labels = dates.map((key) => weekDayLabels[(weekdayIndex(key) + 6) % 7]);
    const habitMap = new Map(habits.map((point) => [point.key, point.value]));
    return {
      labels,
      habit: dates.map((key) => (key > today ? null : (habitMap.get(key) ?? null))),
      sleep: dates.map((key) => (key > today ? null : sleepOn(sleep, key))),
      mood: dates.map((key) => (key > today ? null : moodOnDay(mood, key))),
      sleepScore: sleepAverage(
        dates.filter((key) => key <= today),
        sleep,
      ),
      moodScore: moodAverage(
        dates.filter((key) => key <= today),
        mood,
      ),
      lineStyle: 'curve',
    };
  }

  if (period === 'mes') {
    const buckets = monthCalendarWeeks(today);
    const habitMap = new Map(habits.map((point) => [point.key, point.value]));
    return {
      labels: buckets.map((bucket) => bucket.label),
      habit: buckets.map((bucket) => {
        if (bucket.dates.length === 0) {
          return null;
        }
        const values = bucket.dates.map((key) => habitMap.get(key) ?? null);
        return averagePercent(values);
      }),
      sleep: buckets.map((bucket) => (bucket.dates.length === 0 ? null : sleepAverage(bucket.dates, sleep))),
      mood: buckets.map((bucket) => (bucket.dates.length === 0 ? null : moodAverage(bucket.dates, mood))),
      sleepScore: sleepAverage(
        monthDateKeys(today).filter((key) => key <= today),
        sleep,
      ),
      moodScore: moodAverage(
        monthDateKeys(today).filter((key) => key <= today),
        mood,
      ),
      lineStyle: 'curve',
    };
  }

  const months = yearMonthKeys(today);
  return {
    labels: months.map((month) => month.label),
    habit: months.map((month) => {
      if (month.dates.length === 0) {
        return null;
      }
      const monthly = habits.find((item) => item.label === month.label);
      if (monthly) {
        return monthly.value;
      }
      const values = month.dates.map((key) => {
        const point = habits.find((item) => item.key === key || item.key.startsWith(key.slice(0, 7)));
        return point?.value ?? null;
      });
      return averagePercent(values);
    }),
    sleep: months.map((month) => (month.dates.length === 0 ? null : sleepAverage(month.dates, sleep))),
    mood: months.map((month) => (month.dates.length === 0 ? null : moodAverage(month.dates, mood))),
    sleepScore: sleepAverage(
      months.flatMap((month) => month.dates),
      sleep,
    ),
    moodScore: moodAverage(
      months.flatMap((month) => month.dates),
      mood,
    ),
    lineStyle: 'curve',
  };
}

export function previousPeriodDates(today: string, period: ProgressPeriod): string[] {
  if (period === 'dia') {
    return [shiftDateKey(today, -1)];
  }
  if (period === 'semana') {
    return weekDateKeys(shiftDateKey(today, -7));
  }
  if (period === 'mes') {
    const { year, month } = dateParts(today);
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const last = new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate();
    return Array.from({ length: last }, (_, index) => dateKey(prevYear, prevMonth, index + 1));
  }
  const { year } = dateParts(today);
  const keys: string[] = [];
  for (let month = 1; month <= 12; month += 1) {
    const last = new Date(Date.UTC(year - 1, month, 0)).getUTCDate();
    for (let day = 1; day <= last; day += 1) {
      keys.push(dateKey(year - 1, month, day));
    }
  }
  return keys;
}

export function currentPeriodDates(today: string, period: ProgressPeriod): string[] {
  if (period === 'dia') {
    return [today];
  }
  if (period === 'semana') {
    return weekDateKeys(today).filter((key) => key <= today);
  }
  if (period === 'mes') {
    return monthDateKeys(today).filter((key) => key <= today);
  }
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
