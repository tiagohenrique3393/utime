import { supabase } from '../../utils/supabase';
import { ensureCatalogHabit } from '@/lib/habit-catalog';
import { setHabitCompleted } from '@/lib/habit-day';
import { HYDRATION_HABIT_ID, suggestedHabitById } from '@/lib/suggested-habits';

export type HydrationDay = {
  goalMl: number | null;
  consumedMl: number;
};

const emptyDay: HydrationDay = { goalMl: null, consumedMl: 0 };

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

export function hydrationProgress(consumedMl: number, goalMl: number | null) {
  if (goalMl == null || goalMl <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round((consumedMl / goalMl) * 100)));
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
  return { ok: true as const, day: fromRow(data as HydrationRow | null, userId, day) ?? emptyDay, message: '' };
}

export async function saveHydration(userId: string, day: string, next: HydrationDay) {
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
  const suggestion = suggestedHabitById(HYDRATION_HABIT_ID);
  if (suggestion) {
    const ensured = await ensureCatalogHabit({
      id: suggestion.id,
      period: suggestion.period,
      pillar: suggestion.pillar,
      relevance: suggestion.relevance,
    });
    if (!ensured.ok || !ensured.habitId) {
      return {
        ok: true as const,
        day: saved,
        message: ensured.message || 'A água foi salva. A conclusão do hábito ainda não pôde ser gravada.',
      };
    }
    const logged = await setHabitCompleted(
      userId,
      ensured.habitId,
      day,
      hydrationReached(saved.consumedMl, saved.goalMl),
    );
    if (!logged.ok) {
      return { ok: true as const, day: saved, message: logged.message };
    }
  }
  return { ok: true as const, day: saved, message: '' };
}

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
      const dateKey = typeof row.occurred_on === 'string' ? row.occurred_on.slice(0, 10) : '';
      const parsed = fromRow(row, userId, dateKey);
      if (parsed && dateKey <= until) {
        rows.push({ dateKey, consumedMl: parsed.consumedMl, goalMl: parsed.goalMl });
      }
    }
    if (batch.length < pageSize) {
      break;
    }
  }
  return { ok: true as const, rows, message: '' };
}
