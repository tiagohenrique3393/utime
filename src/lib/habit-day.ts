import { supabase } from '../../utils/supabase';

export const CALENDAR_TIME_ZONE = 'America/Sao_Paulo';

function zonedPart(date: Date, name: 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second') {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CALENDAR_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return parts.find((part) => part.type === name)?.value ?? '0';
}

export function dailyPercent(total: number, completed: number) {
  if (total <= 0) {
    return 0;
  }
  const done = Math.max(0, Math.min(total, completed));
  return Math.round((done / total) * 10000) / 100;
}

export function personalCompletionPercent(total: number, completed: number) {
  return dailyPercent(total, completed);
}

export function formatDailyPercent(percent: number) {
  if (Number.isInteger(percent)) {
    return `${percent}%`;
  }
  return `${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(percent)}%`;
}

export function todayKey(date = new Date()) {
  const year = zonedPart(date, 'year');
  const month = zonedPart(date, 'month');
  const day = zonedPart(date, 'day');
  return `${year}-${month}-${day}`;
}

export function calendarDateKey(date: Date) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function saoPauloCalendarDate(now = new Date()) {
  const [year, month, day] = todayKey(now).split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function parseDateKey(value: string | readonly string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return null;
  }
  const [year, month, day] = raw.split('-').map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
    return null;
  }
  return raw;
}

export function zonedHour(date = new Date()) {
  const hour = Number(zonedPart(date, 'hour'));
  return hour === 24 ? 0 : hour;
}

export function millisecondsUntilNextDate(date = new Date()) {
  const hour = Number(zonedPart(date, 'hour'));
  const minute = Number(zonedPart(date, 'minute'));
  const second = Number(zonedPart(date, 'second'));
  const elapsed = ((hour * 60 + minute) * 60 + second) * 1000;
  const remaining = 24 * 60 * 60 * 1000 - elapsed;
  return remaining <= 0 ? 1000 : remaining;
}

export function formatCalendarDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-');
  if (!year || !month || !day) {
    return dateKey;
  }
  return `${day}/${month}/${year}`;
}

export function formatLongDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  if (!year || !month || !day) {
    return dateKey;
  }
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(date);
}

function completionErrorMessage(error: { message?: string; code?: string } | null, action: 'load' | 'save') {
  const text = `${error?.code ?? ''} ${error?.message ?? ''}`.toLowerCase();
  const missing =
    text.includes('habit_day_logs') ||
    text.includes('pgrst205') ||
    text.includes('42p01') ||
    text.includes('does not exist') ||
    text.includes('schema cache');
  if (missing) {
    return action === 'load'
      ? 'As conclusões de hoje ainda não estão disponíveis. Sua rotina continua visível.'
      : 'Ainda não foi possível salvar esta conclusão. Sua rotina permanece igual.';
  }
  return action === 'load'
    ? 'Não foi possível carregar as conclusões de hoje.'
    : 'Não foi possível salvar esta conclusão.';
}

type DayLogRow = {
  user_id?: string | null;
  user_habit_id?: string | null;
  occurred_on?: string | null;
  completed?: boolean | null;
};

function sameDay(value: string | null | undefined, day: string) {
  return typeof value !== 'string' || value.startsWith(day);
}

export async function loadCompletedHabitIds(userId: string, day: string) {
  const { data, error } = await supabase
    .from('habit_day_logs')
    .select('user_id,user_habit_id,occurred_on,completed')
    .eq('user_id', userId)
    .eq('occurred_on', day);
  if (error) {
    return { ok: false as const, ids: [] as string[], message: completionErrorMessage(error, 'load') };
  }
  const ids = ((data ?? []) as DayLogRow[])
    .filter(
      (row) =>
        row.user_id === userId &&
        sameDay(row.occurred_on, day) &&
        row.completed === true &&
        typeof row.user_habit_id === 'string',
    )
    .map((row) => row.user_habit_id as string);
  return { ok: true as const, ids, message: '' };
}

export async function setHabitCompleted(userId: string, habitId: string, day: string, completed: boolean) {
  const { data, error } = await supabase
    .from('habit_day_logs')
    .upsert(
      {
        user_id: userId,
        user_habit_id: habitId,
        occurred_on: day,
        completed,
      },
      { onConflict: 'user_id,user_habit_id,occurred_on' },
    )
    .select('user_id,user_habit_id,occurred_on,completed')
    .maybeSingle();
  const row = data as DayLogRow | null;
  if (
    error ||
    !row ||
    row.user_id !== userId ||
    row.user_habit_id !== habitId ||
    !sameDay(row.occurred_on, day) ||
    row.completed !== completed
  ) {
    return { ok: false as const, message: completionErrorMessage(error, 'save') };
  }
  return { ok: true as const, message: '' };
}
