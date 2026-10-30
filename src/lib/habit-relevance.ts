import { normalizeHabitText } from '@/lib/habit-classify';

export type HabitRelevance = 'alta' | 'media' | 'baixa';

export const relevanceLabels: Record<HabitRelevance, string> = {
  alta: 'ALTA RELEVÂNCIA',
  media: 'MÉDIA RELEVÂNCIA',
  baixa: 'BAIXA RELEVÂNCIA',
};

const relevances = new Set<HabitRelevance>(['alta', 'media', 'baixa']);

export function requireHabitRelevance(
  value: string | null | undefined,
): { ok: true; relevance: HabitRelevance } | { ok: false; message: string } {
  if (value && relevances.has(value as HabitRelevance)) {
    return { ok: true, relevance: value as HabitRelevance };
  }
  return { ok: false, message: 'Escolha a relevância alta, média ou baixa.' };
}

export function matchingCustomHabit<T extends { catalogHabitId: string | null; customLabel: string | null }>(
  rows: readonly T[],
  label: string,
) {
  const key = normalizeHabitText(label);
  if (!key) {
    return null;
  }
  return rows.find((habit) => habit.catalogHabitId === null && normalizeHabitText(habit.customLabel ?? '') === key) ?? null;
}
