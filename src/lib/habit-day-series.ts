import { exactDailyPercent, todayKey, zonedHour } from '@/lib/habit-day';

export type TimedChartPoint = {
  fraction: number;
  value: number | null;
};

export type HabitCompletionEvent = {
  habitId: string;
  completed: boolean;
  /** Instant ISO (timestamptz). Fração do dia usa America/Sao_Paulo. */
  recordedAt: string;
};

function zonedClockParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const read = (name: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === name)?.value ?? '0');
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour') === 24 ? 0 : read('hour'),
    minute: read('minute'),
    second: read('second'),
  };
}

export function dayKeyFromInstant(date: Date) {
  const { year, month, day } = zonedClockParts(date);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Fração 0–1 do dia civil em America/Sao_Paulo. */
export function dayFractionFromInstant(date: Date) {
  const { hour, minute, second } = zonedClockParts(date);
  return Math.max(0, Math.min(1, (hour * 3600 + minute * 60 + second) / 86400));
}

function roundPercent(value: number) {
  return Math.round(value * 100) / 100;
}

/** ~90s no dia civil — funde conclusões quase simultâneas sem inventar horários. */
const SAME_MOMENT_FRACTION = 90 / 86400;

function pushStep(points: TimedChartPoint[], fraction: number, value: number) {
  const safeFraction = Math.max(0, Math.min(1, fraction));
  const safeValue = roundPercent(Math.max(0, Math.min(100, value)));
  const last = points[points.length - 1];
  if (last && safeFraction + 1e-12 < last.fraction) {
    return;
  }
  // Mesmo instante (ou quase): atualiza o valor acumulado no ponto existente.
  if (last && Math.abs(last.fraction - safeFraction) <= SAME_MOMENT_FRACTION) {
    last.fraction = Math.max(last.fraction, safeFraction);
    last.value = safeValue;
    return;
  }
  // Platô no mesmo %: não cria ponto extra (evita cúbicas deformadas no gráfico).
  if (last && last.value === safeValue) {
    return;
  }
  points.push({ fraction: safeFraction, value: safeValue });
}

/**
 * Série cumulativa do dia: 0% à meia-noite, sobe/desce em degraus nos timestamps reais.
 * Não inventa horários passados. Sem histórico intradía, só reconcilia o anel em "agora".
 * O último ponto conhecido (até agora) equivale ao % do anel do dia.
 */
export function cumulativeDayHabitsSeries(options: {
  dayKey: string;
  planned: number;
  events: readonly HabitCompletionEvent[];
  currentCompletedIds: readonly string[];
  now?: Date;
  /** % autoritativo do anel; se omitido, deriva de currentCompletedIds/planned. */
  ringPercent?: number | null;
}): TimedChartPoint[] {
  const now = options.now ?? new Date();
  const today = todayKey(now);
  const planned = Number.isFinite(options.planned) ? Math.max(0, options.planned) : 0;
  const ringFromState = exactDailyPercent(options.currentCompletedIds.length, planned);
  const ringPercent =
    options.ringPercent != null && Number.isFinite(options.ringPercent)
      ? roundPercent(Math.max(0, Math.min(100, options.ringPercent)))
      : ringFromState;

  const points: TimedChartPoint[] = [{ fraction: 0, value: 0 }];

  if (planned <= 0) {
    return points;
  }

  const isToday = options.dayKey === today;
  const nowFraction = isToday ? dayFractionFromInstant(now) : 1;

  const sorted = [...options.events]
    .map((event) => {
      const instant = new Date(event.recordedAt);
      if (Number.isNaN(instant.getTime())) {
        return null;
      }
      if (dayKeyFromInstant(instant) !== options.dayKey) {
        return null;
      }
      return {
        habitId: event.habitId,
        completed: event.completed,
        fraction: dayFractionFromInstant(instant),
        at: instant.getTime(),
      };
    })
    .filter((row): row is { habitId: string; completed: boolean; fraction: number; at: number } => row != null)
    .sort((a, b) => a.at - b.at || a.fraction - b.fraction);

  const completed = new Set<string>();
  for (const event of sorted) {
    if (event.fraction > nowFraction + 1e-12) {
      continue;
    }
    if (event.completed) {
      completed.add(event.habitId);
    } else {
      completed.delete(event.habitId);
    }
    const value = exactDailyPercent(completed.size, planned) ?? 0;
    pushStep(points, event.fraction, value);
  }

  const authoritative = ringPercent ?? 0;
  const last = points[points.length - 1]!;

  // Estende até "agora" com o % autoritativo (sem inventar horários no passado).
  if (Math.abs(last.fraction - nowFraction) <= SAME_MOMENT_FRACTION) {
    last.fraction = Math.max(last.fraction, nowFraction);
    last.value = authoritative;
  } else if (last.fraction < nowFraction - 1e-9) {
    points.push({ fraction: nowFraction, value: authoritative });
  } else if (last.value !== authoritative) {
    last.value = authoritative;
  }

  return points;
}

/** Rótulos fixos do eixo diário (referência oficial). */
export const dayAxisLabels = ['00h', '06h', '12h', '18h', '23:59'] as const;

export function currentDayFraction(now = new Date()) {
  if (zonedHour(now) === 0 && dayFractionFromInstant(now) < 1e-9) {
    return 0;
  }
  return dayFractionFromInstant(now);
}
