import { supabase } from '../../utils/supabase';
import { todayKey } from '@/lib/habit-day';
import {
  DEFAULT_SLEEP_GOAL_HOURS,
  clampSleepHours,
  clampSleepQuality,
  sleepScore,
} from '@/lib/sleep-score';

export type SleepCheckin = {
  localDate: string;
  hours: number;
  quality: number;
  goalHours: number;
  score: number;
  note?: string | null;
};

type SleepRow = {
  user_id?: string | null;
  local_date?: string | null;
  hours?: number | null;
  quality?: number | null;
  goal_hours?: number | null;
  score?: number | null;
  note?: string | null;
};

const cache = new Map<string, SleepCheckin>();
const listeners = new Set<() => void>();

function cacheKey(userId: string, localDate: string) {
  return `${userId}:${localDate}`;
}

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeSleep(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function sleepSnapshot(userId: string, localDate: string): SleepCheckin | null {
  return cache.get(cacheKey(userId, localDate)) ?? null;
}

function missingTable(error: { message?: string; code?: string } | null) {
  const text = `${error?.code ?? ''} ${error?.message ?? ''}`.toLowerCase();
  return (
    text.includes('sleep_checkins') ||
    text.includes('pgrst205') ||
    text.includes('42p01') ||
    text.includes('does not exist') ||
    text.includes('schema cache')
  );
}

function fromRow(row: SleepRow | null, userId: string): SleepCheckin | null {
  if (!row || row.user_id !== userId || typeof row.local_date !== 'string') {
    return null;
  }
  const hours = clampSleepHours(Number(row.hours));
  const quality = clampSleepQuality(Number(row.quality));
  if (quality == null) {
    return null;
  }
  const goalHours =
    Number.isFinite(Number(row.goal_hours)) && Number(row.goal_hours) > 0
      ? Number(row.goal_hours)
      : DEFAULT_SLEEP_GOAL_HOURS;
  const storedScore = Number(row.score);
  const score = Number.isFinite(storedScore) ? storedScore : sleepScore(hours, quality, goalHours);
  if (score == null || !Number.isFinite(score)) {
    return null;
  }
  return {
    localDate: row.local_date.slice(0, 10),
    hours,
    quality,
    goalHours,
    score,
    note: typeof row.note === 'string' ? row.note : null,
  };
}

export async function loadSleepCheckin(userId: string, localDate = todayKey()) {
  const { data, error } = await supabase
    .from('sleep_checkins')
    .select('user_id, local_date, hours, quality, goal_hours, score')
    .eq('user_id', userId)
    .eq('local_date', localDate)
    .maybeSingle();
  if (error) {
    return { ok: false as const, message: missingTable(error) ? 'Sono ainda não disponível.' : 'Não foi possível carregar o sono.', row: null };
  }
  const row = fromRow(data as SleepRow | null, userId);
  if (row) {
    cache.set(cacheKey(userId, localDate), row);
    emit();
  } else {
    cache.delete(cacheKey(userId, localDate));
    emit();
  }
  return { ok: true as const, message: '', row };
}

export async function loadSleepUntil(userId: string, through: string) {
  const { data, error } = await supabase
    .from('sleep_checkins')
    .select('user_id, local_date, hours, quality, goal_hours, score')
    .eq('user_id', userId)
    .lte('local_date', through)
    .order('local_date', { ascending: true });
  if (error) {
    return {
      ok: false as const,
      message: missingTable(error) ? 'Sono ainda não disponível.' : 'Não foi possível carregar o sono.',
      rows: [] as SleepCheckin[],
    };
  }
  const rows: SleepCheckin[] = [];
  for (const item of (data as SleepRow[] | null) ?? []) {
    const row = fromRow(item, userId);
    if (row) {
      rows.push(row);
      cache.set(cacheKey(userId, row.localDate), row);
    }
  }
  emit();
  return { ok: true as const, message: '', rows };
}

export async function saveSleepCheckin(
  userId: string,
  input: { localDate?: string; hours: number; quality: number; goalHours?: number; note?: string | null },
) {
  const localDate = input.localDate ?? todayKey();
  const hours = clampSleepHours(input.hours);
  const quality = clampSleepQuality(input.quality);
  const goalHours =
    input.goalHours != null && Number.isFinite(input.goalHours) && input.goalHours > 0
      ? input.goalHours
      : DEFAULT_SLEEP_GOAL_HOURS;
  if (quality == null) {
    return { ok: false as const, message: 'Qualidade inválida.', row: null };
  }
  const score = sleepScore(hours, quality, goalHours);
  if (score == null) {
    return { ok: false as const, message: 'Qualidade inválida.', row: null };
  }
  const note =
    typeof input.note === 'string' && input.note.trim()
      ? input.note.trim().slice(0, 500)
      : null;
  const payload = {
    user_id: userId,
    local_date: localDate,
    hours,
    quality,
    goal_hours: goalHours,
    score,
    note,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('sleep_checkins')
    .upsert(payload, { onConflict: 'user_id,local_date' })
    .select('user_id, local_date, hours, quality, goal_hours, score, note')
    .maybeSingle();
  if (error) {
    // Coluna note pode ainda não existir antes da migration 0–10.
    if (`${error.message ?? ''}`.toLowerCase().includes('note')) {
      const retry = await supabase
        .from('sleep_checkins')
        .upsert(
          {
            user_id: userId,
            local_date: localDate,
            hours,
            quality,
            goal_hours: goalHours,
            score,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,local_date' },
        )
        .select('user_id, local_date, hours, quality, goal_hours, score')
        .maybeSingle();
      if (!retry.error) {
        const row = fromRow(retry.data as SleepRow | null, userId) ?? {
          localDate,
          hours,
          quality,
          goalHours,
          score,
          note: null,
        };
        cache.set(cacheKey(userId, localDate), row);
        emit();
        return { ok: true as const, message: '', row };
      }
    }
    return {
      ok: false as const,
      message: missingTable(error) ? 'Ainda não foi possível salvar o sono.' : 'Não foi possível salvar o sono.',
      row: null,
    };
  }
  const row = fromRow(data as SleepRow | null, userId) ?? {
    localDate,
    hours,
    quality,
    goalHours,
    score,
    note,
  };
  cache.set(cacheKey(userId, localDate), row);
  emit();
  return { ok: true as const, message: '', row };
}

export async function loadSleepGoal(userId: string) {
  const { data, error } = await supabase
    .from('sleep_preferences')
    .select('goal_hours')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || data == null || !Number.isFinite(Number((data as { goal_hours?: number }).goal_hours))) {
    return DEFAULT_SLEEP_GOAL_HOURS;
  }
  return Number((data as { goal_hours: number }).goal_hours);
}

export async function saveSleepGoal(userId: string, goalHours: number) {
  const goal =
    Number.isFinite(goalHours) && goalHours > 0 && goalHours <= 24 ? goalHours : DEFAULT_SLEEP_GOAL_HOURS;
  const { error } = await supabase.from('sleep_preferences').upsert(
    {
      user_id: userId,
      goal_hours: goal,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (error) {
    return { ok: false as const, message: 'Não foi possível salvar a meta de sono.', goalHours: goal };
  }
  return { ok: true as const, message: '', goalHours: goal };
}

export function clearSleepCache() {
  cache.clear();
  emit();
}
