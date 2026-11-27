import { supabase } from '../../utils/supabase';
import { todayKey } from '@/lib/habit-day';
import {
  MOOD_PERIODS,
  canEditMoodPeriod,
  dailyMoodAverage,
  moodLevelScore,
  moodPeriodAt,
  type MoodLevel,
  type MoodPeriod,
} from '@/lib/mood-score';

export type MoodCheckin = {
  localDate: string;
  period: MoodPeriod;
  level: MoodLevel;
  score: number;
};

type MoodRow = {
  user_id?: string | null;
  local_date?: string | null;
  period?: string | null;
  level?: number | null;
  score?: number | null;
};

const cache = new Map<string, MoodCheckin>();
const listeners = new Set<() => void>();

function cacheKey(userId: string, localDate: string, period: MoodPeriod) {
  return `${userId}:${localDate}:${period}`;
}

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeMood(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function moodSnapshot(userId: string, localDate: string, period: MoodPeriod): MoodCheckin | null {
  return cache.get(cacheKey(userId, localDate, period)) ?? null;
}

export function moodDayScores(userId: string, localDate: string) {
  return MOOD_PERIODS.map((period) => moodSnapshot(userId, localDate, period)?.score ?? null);
}

export function moodDayAverage(userId: string, localDate: string) {
  return dailyMoodAverage(moodDayScores(userId, localDate));
}

function missingTable(error: { message?: string; code?: string } | null) {
  const text = `${error?.code ?? ''} ${error?.message ?? ''}`.toLowerCase();
  return (
    text.includes('mood_checkins') ||
    text.includes('pgrst205') ||
    text.includes('42p01') ||
    text.includes('does not exist') ||
    text.includes('schema cache')
  );
}

function asPeriod(value: string | null | undefined): MoodPeriod | null {
  if (value === 'manha' || value === 'tarde' || value === 'noite') {
    return value;
  }
  return null;
}

function fromRow(row: MoodRow | null, userId: string): MoodCheckin | null {
  if (!row || row.user_id !== userId || typeof row.local_date !== 'string') {
    return null;
  }
  const period = asPeriod(row.period);
  const level = Math.round(Number(row.level)) as MoodLevel;
  const score = moodLevelScore(level);
  if (!period || score == null) {
    return null;
  }
  return {
    localDate: row.local_date.slice(0, 10),
    period,
    level,
    score,
  };
}

export async function loadMoodCheckin(userId: string, localDate: string, period: MoodPeriod) {
  const { data, error } = await supabase
    .from('mood_checkins')
    .select('user_id, local_date, period, level, score')
    .eq('user_id', userId)
    .eq('local_date', localDate)
    .eq('period', period)
    .maybeSingle();
  if (error) {
    return { ok: false as const, message: missingTable(error) ? 'Humor ainda não disponível.' : 'Não foi possível carregar o humor.', row: null };
  }
  const row = fromRow(data as MoodRow | null, userId);
  if (row) {
    cache.set(cacheKey(userId, localDate, period), row);
    emit();
  } else {
    cache.delete(cacheKey(userId, localDate, period));
    emit();
  }
  return { ok: true as const, message: '', row };
}

export async function loadMoodDay(userId: string, localDate = todayKey()) {
  const { data, error } = await supabase
    .from('mood_checkins')
    .select('user_id, local_date, period, level, score')
    .eq('user_id', userId)
    .eq('local_date', localDate);
  if (error) {
    return {
      ok: false as const,
      message: missingTable(error) ? 'Humor ainda não disponível.' : 'Não foi possível carregar o humor.',
      rows: [] as MoodCheckin[],
    };
  }
  const rows: MoodCheckin[] = [];
  for (const item of (data as MoodRow[] | null) ?? []) {
    const row = fromRow(item, userId);
    if (row) {
      rows.push(row);
      cache.set(cacheKey(userId, row.localDate, row.period), row);
    }
  }
  emit();
  return { ok: true as const, message: '', rows };
}

export async function loadMoodUntil(userId: string, through: string) {
  const { data, error } = await supabase
    .from('mood_checkins')
    .select('user_id, local_date, period, level, score')
    .eq('user_id', userId)
    .lte('local_date', through)
    .order('local_date', { ascending: true });
  if (error) {
    return {
      ok: false as const,
      message: missingTable(error) ? 'Humor ainda não disponível.' : 'Não foi possível carregar o humor.',
      rows: [] as MoodCheckin[],
    };
  }
  const rows: MoodCheckin[] = [];
  for (const item of (data as MoodRow[] | null) ?? []) {
    const row = fromRow(item, userId);
    if (row) {
      rows.push(row);
      cache.set(cacheKey(userId, row.localDate, row.period), row);
    }
  }
  emit();
  return { ok: true as const, message: '', rows };
}

export async function saveMoodCheckin(
  userId: string,
  input: { localDate?: string; period?: MoodPeriod; level: number },
  now = new Date(),
) {
  const localDate = input.localDate ?? todayKey(now);
  const period = input.period ?? moodPeriodAt(now);
  const today = todayKey(now);
  if (!canEditMoodPeriod(period, localDate, today, now)) {
    return { ok: false as const, message: 'Não é possível registrar humor futuro.', row: null };
  }
  const level = Math.round(input.level) as MoodLevel;
  const score = moodLevelScore(level);
  if (score == null) {
    return { ok: false as const, message: 'Nível de humor inválido.', row: null };
  }
  const payload = {
    user_id: userId,
    local_date: localDate,
    period,
    level,
    score,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('mood_checkins')
    .upsert(payload, { onConflict: 'user_id,local_date,period' })
    .select('user_id, local_date, period, level, score')
    .maybeSingle();
  if (error) {
    return {
      ok: false as const,
      message: missingTable(error) ? 'Ainda não foi possível salvar o humor.' : 'Não foi possível salvar o humor.',
      row: null,
    };
  }
  const row = fromRow(data as MoodRow | null, userId) ?? { localDate, period, level, score };
  cache.set(cacheKey(userId, localDate, period), row);
  emit();
  return { ok: true as const, message: '', row };
}

export function clearMoodCache() {
  cache.clear();
  emit();
}
