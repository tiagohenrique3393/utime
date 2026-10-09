import { supabase } from '../../utils/supabase';

export function personalCompletionPercent(total: number, completed: number) {
  if (total <= 0) {
    return 0;
  }
  const done = Math.max(0, Math.min(total, completed));
  return Math.round((done / total) * 100);
}

export function todayKey(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
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

export async function loadCompletedHabitIds(userId: string, day: string) {
  const { data, error } = await supabase
    .from('habit_day_logs')
    .select('user_habit_id,completed')
    .eq('user_id', userId)
    .eq('occurred_on', day);
  if (error) {
    return { ok: false as const, ids: [] as string[], message: completionErrorMessage(error, 'load') };
  }
  const ids = ((data ?? []) as { user_habit_id?: string; completed?: boolean | null }[])
    .filter((row) => row.completed === true && typeof row.user_habit_id === 'string')
    .map((row) => row.user_habit_id as string);
  return { ok: true as const, ids, message: '' };
}

export async function setHabitCompleted(userId: string, habitId: string, day: string, completed: boolean) {
  const { error } = await supabase.from('habit_day_logs').upsert(
    {
      user_id: userId,
      user_habit_id: habitId,
      occurred_on: day,
      completed,
    },
    { onConflict: 'user_id,user_habit_id,occurred_on' },
  );
  if (error) {
    return { ok: false as const, message: completionErrorMessage(error, 'save') };
  }
  return { ok: true as const, message: '' };
}
