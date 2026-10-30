import { scoreHabits } from '@/lib/daily-score';
import { dailyPercent } from '@/lib/habit-day';
import { matchingCustomHabit, relevanceLabels, requireHabitRelevance } from '@/lib/habit-relevance';
import { showsExcellence } from '@/lib/progress-color';
import { completionCreatesEvent, isPersonalCatalogHabit, rankingHabitCounts } from '@/lib/circle';
import { HYDRATION_HABIT_ID } from '@/lib/suggested-habits';

function assertEqual<T>(actual: T, expected: T, label = '') {
  if (actual !== expected) {
    throw new Error(`${label} Esperado ${String(expected)}, obtido ${String(actual)}`);
  }
}

const alta = requireHabitRelevance('alta');
const media = requireHabitRelevance('media');
const baixa = requireHabitRelevance('baixa');
assertEqual(alta.ok, true);
assertEqual(media.ok, true);
assertEqual(baixa.ok, true);
if (!alta.ok || !media.ok || !baixa.ok) {
  throw new Error('relevância válida recusada');
}
assertEqual(relevanceLabels.alta, 'ALTA RELEVÂNCIA');
assertEqual(relevanceLabels.media, 'MÉDIA RELEVÂNCIA');
assertEqual(relevanceLabels.baixa, 'BAIXA RELEVÂNCIA');
assertEqual(alta.relevance, 'alta');
assertEqual(media.relevance, 'media');
assertEqual(baixa.relevance, 'baixa');
assertEqual(requireHabitRelevance(null).ok, false);
assertEqual(requireHabitRelevance(undefined).ok, false);
assertEqual(requireHabitRelevance('').ok, false);
assertEqual(requireHabitRelevance('ALTA').ok, false);
assertEqual(requireHabitRelevance('corpo').ok, false);

const stored = [
  { id: '1', catalogHabitId: null, customLabel: 'Sem celular', active: true },
  { id: '2', catalogHabitId: 'mente-leitura', customLabel: null, active: true },
  { id: '3', catalogHabitId: null, customLabel: 'Dormir bem', active: false },
];
assertEqual(matchingCustomHabit(stored, ' sem   celular ')?.id, '1');
assertEqual(matchingCustomHabit(stored, 'Ler'), null);
assertEqual(matchingCustomHabit(stored, 'Dormir bem')?.id, '3');

const day = scoreHabits([
  { id: 'a', pillar: 'mente', done: true, catalogHabitId: null },
  { id: 'b', pillar: 'mente', done: false, catalogHabitId: null },
  { id: 'w', pillar: 'corpo', done: false, catalogHabitId: HYDRATION_HABIT_ID },
]);
assertEqual(day.percent, dailyPercent(2, 1));
assertEqual(day.excludedIds.join(','), 'w');
assertEqual(showsExcellence(day.percent), false);
assertEqual(getColor(day.percent), 'red');

const perfect = scoreHabits([
  { id: 'a', pillar: 'mente', done: true, catalogHabitId: null },
  { id: 'w', pillar: 'corpo', done: false, catalogHabitId: HYDRATION_HABIT_ID },
]);
assertEqual(perfect.percent, 100);
assertEqual(showsExcellence(perfect.percent), true);

assertEqual(isPersonalCatalogHabit(HYDRATION_HABIT_ID), true);
assertEqual(rankingHabitCounts([
  { id: 'w', active: true, relevance: 'baixa', catalogHabitId: HYDRATION_HABIT_ID },
]).baixa, 0);

for (const relevance of ['alta', 'media', 'baixa'] as const) {
  assertEqual(completionCreatesEvent({
    operation: 'insert',
    completed: true,
    occurredOn: '2026-10-30',
    today: '2026-10-30',
    relevance,
    catalogHabitId: null,
  }), true, relevance);
}
assertEqual(completionCreatesEvent({
  operation: 'insert',
  completed: true,
  occurredOn: '2026-10-30',
  today: '2026-10-30',
  relevance: null,
  catalogHabitId: null,
}), false);

function getColor(percent: number) {
  if (percent >= 100) {
    return 'gold';
  }
  if (percent >= 70) {
    return 'green';
  }
  return 'red';
}

console.log('habit-relevance-ok');
