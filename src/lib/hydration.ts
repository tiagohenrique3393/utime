import { supabase } from '../../utils/supabase';
import { isWritableDay } from '@/lib/habit-day';

export type HydrationDay = {
  goalMl: number | null;
  consumedMl: number;
};

const emptyDay: HydrationDay = { goalMl: null, consumedMl: 0 };

type HydrationCache = { userId: string; day: string; value: HydrationDay };
let hydrationCache: HydrationCache | null = null;
const hydrationListeners = new Set<() => void>();

export function subscribeHydrationDay(listener: () => void) {
  hydrationListeners.add(listener);
  return () => {
    hydrationListeners.delete(listener);
  };
}

export function hydrationDaySnapshot(userId: string, day: string) {
  if (!hydrationCache || hydrationCache.userId !== userId || hydrationCache.day !== day) {
    return null;
  }
  return hydrationCache.value;
}

function publishHydration(userId: string, day: string, value: HydrationDay) {
  hydrationCache = {
    userId,
    day,
    value: { goalMl: value.goalMl, consumedMl: value.consumedMl },
  };
  hydrationListeners.forEach((listener) => listener());
}

function missingTable(error: { message?: string; code?: string } | null) {
  const text = `${error?.code ?? ''} ${error?.message ?? ''}`.toLowerCase();
  return (
    text.includes('hydration_days') ||
    text.includes('pgrst205') ||
    text.includes('42p01') ||
    text.includes('does not exist') ||
    text.includes('schema cache')
  );
}

function failureMessage(error: { message?: string; code?: string } | null, action: 'load' | 'save') {
  const text = `${error?.code ?? ''} ${error?.message ?? ''}`.toLowerCase();
  if (text.includes('closed day') || text.includes('encerrado')) {
    return 'Este dia já está encerrado.';
  }
  if (missingTable(error)) {
    return action === 'load'
      ? 'O registro de hidratação ainda não está disponível.'
      : 'Ainda não foi possível salvar a hidratação.';
  }
  return action === 'load' ? 'Não foi possível carregar a hidratação.' : 'Não foi possível salvar a hidratação.';
}

export function hydrationReached(consumedMl: number, goalMl: number | null) {
  return goalMl != null && goalMl > 0 && consumedMl >= goalMl;
}

export const hydrationGoalsMl = [1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000] as const;

export function isHydrationGoal(ml: number) {
  return (hydrationGoalsMl as readonly number[]).includes(ml);
}

export function hydrationProgress(consumedMl: number, goalMl: number | null) {
  if (goalMl == null || goalMl <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round((consumedMl / goalMl) * 100)));
}

export function hydrationPercent(consumedMl: number, goalMl: number | null) {
  if (goalMl == null || !Number.isFinite(goalMl) || goalMl <= 0) {
    return 0;
  }
  const consumed = Number.isFinite(consumedMl) ? Math.max(0, consumedMl) : 0;
  return Math.round((consumed / goalMl) * 1000) / 10;
}

export function hydrationFill(consumedMl: number, goalMl: number | null) {
  return Math.min(100, hydrationPercent(consumedMl, goalMl));
}

export function formatHydrationPercent(value: number) {
  const rounded = Math.round(value * 10) / 10;
  const text = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: Number.isInteger(rounded) ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(rounded);
  return `${text}%`;
}

export function addHydrationIntake(consumedMl: number, amount: number) {
  const base = Number.isFinite(consumedMl) ? Math.max(0, consumedMl) : 0;
  const extra = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  return Math.round(base + extra);
}

export function clearedHydration(day: HydrationDay): HydrationDay {
  return { goalMl: day.goalMl, consumedMl: 0 };
}

export function hydrationDayView(today: HydrationDay | null, previousGoalMl: number | null): HydrationDay {
  const consumedMl = today?.consumedMl ?? 0;
  const goalMl = today?.goalMl != null && today.goalMl > 0 ? today.goalMl : previousGoalMl;
  return { goalMl, consumedMl };
}

export function formatWater(ml: number) {
  const safe = Math.max(0, Math.round(ml));
  const liters = safe / 1000;
  const literText = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: Number.isInteger(liters) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(liters);
  return `${new Intl.NumberFormat('pt-BR').format(safe)} ml · ${literText} L`;
}

type HydrationRow = {
  user_id?: string | null;
  occurred_on?: string | null;
  goal_ml?: number | null;
  consumed_ml?: number | null;
};

function occurredOnKey(value: unknown) {
  if (typeof value === 'string') {
    return /^(\d{4}-\d{2}-\d{2})/.exec(value)?.[1] ?? '';
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    const day = String(value.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return '';
}

function fromRow(row: HydrationRow | null, userId: string, day: string): HydrationDay | null {
  if (!row || row.user_id !== userId || typeof row.occurred_on !== 'string' || !row.occurred_on.startsWith(day)) {
    return null;
  }
  const consumed = Number(row.consumed_ml);
  const goal = row.goal_ml == null ? null : Number(row.goal_ml);
  return {
    goalMl: goal != null && Number.isFinite(goal) && goal > 0 ? Math.round(goal) : null,
    consumedMl: Number.isFinite(consumed) && consumed > 0 ? Math.round(consumed) : 0,
  };
}

async function latestGoalBefore(userId: string, day: string) {
  const { data, error } = await supabase
    .from('hydration_days')
    .select('user_id,occurred_on,goal_ml,consumed_ml')
    .eq('user_id', userId)
    .lt('occurred_on', day)
    .not('goal_ml', 'is', null)
    .order('occurred_on', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    return { ok: false as const, goalMl: null as number | null, message: failureMessage(error, 'load') };
  }
  const row = data as HydrationRow | null;
  const dateKey = occurredOnKey(row?.occurred_on);
  const goal = row?.goal_ml == null ? null : Number(row.goal_ml);
  const goalMl = dateKey && dateKey < day && Number.isFinite(goal) && (goal as number) > 0 ? Math.round(goal as number) : null;
  return { ok: true as const, goalMl, message: '' };
}

export async function loadHydration(userId: string, day: string) {
  const { data, error } = await supabase
    .from('hydration_days')
    .select('user_id,occurred_on,goal_ml,consumed_ml')
    .eq('user_id', userId)
    .eq('occurred_on', day)
    .maybeSingle();
  if (error) {
    return { ok: false as const, day: emptyDay, message: failureMessage(error, 'load') };
  }
  const today = fromRow(data as HydrationRow | null, userId, day);
  let previousGoal: number | null = null;
  if (today?.goalMl == null) {
    const previous = await latestGoalBefore(userId, day);
    if (!previous.ok) {
      return { ok: false as const, day: today ?? emptyDay, message: previous.message };
    }
    previousGoal = previous.goalMl;
  }
  const dayValue = hydrationDayView(today, previousGoal);
  publishHydration(userId, day, dayValue);
  return { ok: true as const, day: dayValue, message: '' };
}

export async function saveHydration(userId: string, day: string, next: HydrationDay) {
  if (!isWritableDay(day)) {
    return { ok: false as const, day: emptyDay, message: 'Este dia já está encerrado.' };
  }
  const goalMl = next.goalMl != null && next.goalMl > 0 ? Math.round(next.goalMl) : null;
  const consumedMl = Math.max(0, Math.round(next.consumedMl));
  const { data, error } = await supabase
    .from('hydration_days')
    .upsert(
      {
        user_id: userId,
        occurred_on: day,
        goal_ml: goalMl,
        consumed_ml: consumedMl,
      },
      { onConflict: 'user_id,occurred_on' },
    )
    .select('user_id,occurred_on,goal_ml,consumed_ml')
    .maybeSingle();
  const saved = fromRow(data as HydrationRow | null, userId, day);
  if (error || !saved || saved.goalMl !== goalMl || saved.consumedMl !== consumedMl) {
    return { ok: false as const, day: emptyDay, message: failureMessage(error, 'save') };
  }
  publishHydration(userId, day, saved);
  return { ok: true as const, day: saved, message: '' };
}

// `until` é inclusivo. A tela de progresso pede até 6 de janeiro para enxergar meta futura do ano e da semana que vira o ano.
export async function loadHydrationUntil(userId: string, until: string) {
  const rows: { dateKey: string; consumedMl: number; goalMl: number | null }[] = [];
  const pageSize = 1000;
  for (let from = 0; from < 20000; from += pageSize) {
    const { data, error } = await supabase
      .from('hydration_days')
      .select('user_id,occurred_on,goal_ml,consumed_ml')
      .eq('user_id', userId)
      .lte('occurred_on', until)
      .order('occurred_on', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) {
      return { ok: false as const, rows, message: failureMessage(error, 'load') };
    }
    const batch = (data ?? []) as HydrationRow[];
    for (const row of batch) {
      const dateKey = occurredOnKey(row.occurred_on);
      if (!dateKey || dateKey > until || String(row.user_id ?? '') !== userId) {
        continue;
      }
      const consumed = Number(row.consumed_ml);
      const goal = row.goal_ml == null ? null : Number(row.goal_ml);
      rows.push({
        dateKey,
        consumedMl: Number.isFinite(consumed) && consumed > 0 ? Math.round(consumed) : 0,
        goalMl: goal != null && Number.isFinite(goal) && goal > 0 ? Math.round(goal) : null,
      });
    }
    if (batch.length < pageSize) {
      break;
    }
  }
  return { ok: true as const, rows, message: '' };
}
