import {
  DAY_COUNT,
  completedIdsForDay,
  dayProgress,
  isDayUnlocked,
  periods,
  pillarStats,
  pillars,
  type JourneyBoard,
  type PillarId,
} from '@/lib/tasks';

export type PillarReading = {
  id: PillarId;
  label: string;
  percent: number;
};

export type ChartPeriod = '10' | '30' | 'mes';

export type ChartPoint = {
  label: string;
  value: number;
};

/**
 * Journey rows are stored as day numbers, not calendar dates.
 * The constancy calendar anchors day "today" of the journey on the device's current date
 * and walks backward for earlier days. It does not invent completions.
 */
export function currentJourneyDay(source: JourneyBoard) {
  for (let day = 1; day <= DAY_COUNT; day += 1) {
    if (!isDayUnlocked(day, source.testMode, source)) {
      return Math.max(1, day - 1);
    }
    if (dayProgress(source, day) < 100) {
      return day;
    }
  }
  return DAY_COUNT;
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function sameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function dateForJourneyDay(day: number, currentDay: number, today: Date) {
  const date = startOfDay(today);
  date.setDate(date.getDate() - (currentDay - day));
  return date;
}

export function journeyDayOnDate(source: JourneyBoard, date: Date, today: Date) {
  const current = currentJourneyDay(source);
  for (let day = 1; day <= DAY_COUNT; day += 1) {
    if (sameDay(dateForJourneyDay(day, current, today), date)) {
      return day;
    }
  }
  return null;
}

export function dayPillars(source: JourneyBoard, day: number): PillarReading[] {
  const ids = completedIdsForDay(source, day);
  return pillars.map((pillar) => ({
    id: pillar.id,
    label: pillar.label,
    percent: pillarStats(ids, pillar.id).percent,
  }));
}

export function upcomingHabits(source: JourneyBoard, day: number, limit = 3) {
  const done = new Set(completedIdsForDay(source, day));
  const next: { id: string; label: string; period: string }[] = [];
  for (const period of periods) {
    for (const task of period.tasks) {
      if (done.has(task.id)) {
        continue;
      }
      next.push({ id: task.id, label: task.label, period: period.title });
      if (next.length === limit) {
        return next;
      }
    }
  }
  return next;
}

export function streakStats(source: JourneyBoard) {
  let best = 0;
  let run = 0;
  for (let day = 1; day <= DAY_COUNT; day += 1) {
    if (dayProgress(source, day) === 100) {
      run += 1;
      if (run > best) {
        best = run;
      }
    } else {
      run = 0;
    }
  }

  const today = currentJourneyDay(source);
  const start = dayProgress(source, today) === 100 ? today : today - 1;
  let current = 0;
  for (let day = start; day >= 1; day -= 1) {
    if (dayProgress(source, day) !== 100) {
      break;
    }
    current += 1;
  }
  return { current, best };
}

export function completionRate(source: JourneyBoard) {
  const span = currentJourneyDay(source);
  let done = 0;
  for (let day = 1; day <= span; day += 1) {
    if (dayProgress(source, day) === 100) {
      done += 1;
    }
  }
  return {
    done,
    span,
    percent: Math.round((done / span) * 100),
  };
}

export function consistentHabits(source: JourneyBoard, limit = 3) {
  const counts = new Map<string, { label: string; count: number }>();
  for (const period of periods) {
    for (const task of period.tasks) {
      counts.set(task.id, { label: task.label, count: 0 });
    }
  }
  for (let day = 1; day <= DAY_COUNT; day += 1) {
    const ids = new Set(completedIdsForDay(source, day));
    for (const [id, row] of counts) {
      if (ids.has(id)) {
        row.count += 1;
      }
    }
  }
  return [...counts.values()]
    .filter((row) => row.count > 0)
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, 'pt-BR'))
    .slice(0, limit);
}

export function evolutionSeries(source: JourneyBoard, period: ChartPeriod, today: Date): ChartPoint[] {
  if (period === '10' || period === '30') {
    const length = period === '10' ? 10 : DAY_COUNT;
    return Array.from({ length }, (_, index) => ({
      label: String(index + 1),
      value: dayProgress(source, index + 1),
    }));
  }

  const current = currentJourneyDay(source);
  const points: ChartPoint[] = [];
  for (let day = 1; day <= DAY_COUNT; day += 1) {
    const date = dateForJourneyDay(day, current, today);
    if (date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()) {
      points.push({ label: String(date.getDate()), value: dayProgress(source, day) });
    }
  }
  return points;
}

export function balanceInsight(readings: readonly PillarReading[]) {
  if (readings.length === 0) {
    return 'Os pilares aparecem quando o dia começa a ser registrado.';
  }
  const lowest = Math.min(...readings.map((item) => item.percent));
  const highest = Math.max(...readings.map((item) => item.percent));
  if (highest === 0) {
    return 'Os três pilares ainda estão no ponto de partida.';
  }
  if (lowest === highest) {
    return 'Os três pilares estão no mesmo nível.';
  }
  const names = readings.filter((item) => item.percent === lowest).map((item) => item.label);
  if (names.length === 1) {
    return `${names[0]} está abaixo dos outros pilares.`;
  }
  return `${names[0]} e ${names[1]} estão abaixo do outro pilar.`;
}
