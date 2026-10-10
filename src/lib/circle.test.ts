import { periods } from '@/lib/tasks';
import { todayKey } from '@/lib/habit-day';
import { suggestedHabits } from '@/lib/suggested-habits';
import {
  achievementTotals,
  competitionRank,
  completionCreatesEvent,
  completionRemovesEvent,
  dayScore,
  formatCirclePoints,
  honorLabel,
  isOfficialTask,
  isPersonalCatalogHabit,
  membershipOverlapsPeriod,
  officialTaskIds,
  periodEnd,
  periodLabel,
  periodStart,
  publicHandleCandidate,
  requirementGaps,
  requirementMessage,
  scoreCompletions,
  shiftPeriod,
  type RankCompletion,
} from '@/lib/circle';

function assertEqual<T>(actual: T, expected: T) {
  if (actual !== expected) {
    throw new Error(`Esperado ${String(expected)}, obtido ${String(actual)}`);
  }
}

const journeyIds = periods.flatMap((period) => period.tasks.map((task) => task.id)).sort();
assertEqual([...officialTaskIds].sort().join(','), journeyIds.join(','));
assertEqual(officialTaskIds.length, 15);

const saturday = '2026-10-10';
assertEqual(periodStart('semana', saturday), '2026-10-05');
assertEqual(periodEnd('semana', '2026-10-05'), '2026-10-12');
assertEqual(periodLabel('semana', '2026-10-05'), '5 A 11 DE OUTUBRO DE 2026');
assertEqual(periodStart('semana', '2026-10-05'), '2026-10-05');
assertEqual(periodStart('semana', '2026-10-11'), '2026-10-05');
assertEqual(periodStart('semana', '2026-10-12'), '2026-10-12');
assertEqual(shiftPeriod('semana', '2026-10-05', 1), '2026-10-12');
assertEqual(shiftPeriod('semana', '2026-10-05', -1), '2026-09-28');

assertEqual(periodStart('mes', saturday), '2026-10-01');
assertEqual(periodEnd('mes', '2026-10-01'), '2026-11-01');
assertEqual(periodEnd('mes', '2026-12-01'), '2027-01-01');
assertEqual(periodLabel('mes', '2026-10-01'), 'OUTUBRO DE 2026');

assertEqual(periodStart('ano', saturday), '2026-01-01');
assertEqual(periodEnd('ano', '2026-01-01'), '2027-01-01');
assertEqual(periodStart('ano', '2024-02-29'), '2024-01-01');

assertEqual(suggestedHabits.length, 10);
assertEqual(suggestedHabits.filter((habit) => habit.relevance === 'alta').length, 2);
assertEqual(suggestedHabits.filter((habit) => habit.relevance === 'media').length, 4);
assertEqual(suggestedHabits.filter((habit) => habit.relevance === 'baixa').length, 4);
assertEqual(dayScore({ alta: 2, media: 4, baixa: 4 }), 100);
assertEqual(dayScore({ alta: 3, media: 4, baixa: 4 }), 105);
assertEqual(dayScore({ alta: 2, media: 5, baixa: 4 }), 102.5);
assertEqual(dayScore({ alta: 2, media: 4, baixa: 5 }), 101);
assertEqual(dayScore({ alta: 4, media: 6, baixa: 8 }), 110);
assertEqual(dayScore({ alta: 10, media: 0, baixa: 0 }), 50);
assertEqual(dayScore({ alta: 1, media: 4, baixa: 4 }), 80);
assertEqual(dayScore({ alta: 0, media: 0, baixa: 0 }), 0);

const ranked: RankCompletion[] = [
  { habitId: 'a1', catalogHabitId: null, relevance: 'alta', occurredOn: '2026-10-05', completed: true },
  { habitId: 'a1', catalogHabitId: null, relevance: 'alta', occurredOn: '2026-10-05', completed: true },
  { habitId: 'a2', catalogHabitId: null, relevance: 'alta', occurredOn: '2026-10-05', completed: true },
  { habitId: 'm1', catalogHabitId: null, relevance: 'media', occurredOn: '2026-10-05', completed: true },
  { habitId: 'm2', catalogHabitId: null, relevance: 'media', occurredOn: '2026-10-05', completed: true },
  { habitId: 'm3', catalogHabitId: null, relevance: 'media', occurredOn: '2026-10-05', completed: true },
  { habitId: 'm4', catalogHabitId: null, relevance: 'media', occurredOn: '2026-10-05', completed: true },
  { habitId: 'b1', catalogHabitId: null, relevance: 'baixa', occurredOn: '2026-10-05', completed: true },
  { habitId: 'b2', catalogHabitId: null, relevance: 'baixa', occurredOn: '2026-10-05', completed: true },
  { habitId: 'b3', catalogHabitId: null, relevance: 'baixa', occurredOn: '2026-10-05', completed: true },
  { habitId: 'b4', catalogHabitId: null, relevance: 'baixa', occurredOn: '2026-10-05', completed: true },
  { habitId: 'extra', catalogHabitId: null, relevance: 'alta', occurredOn: '2026-10-06', completed: true },
  { habitId: 'sug', catalogHabitId: 'corpo-atividade', relevance: 'alta', occurredOn: '2026-10-05', completed: true },
  { habitId: 'off', catalogHabitId: null, relevance: null, occurredOn: '2026-10-05', completed: true },
  { habitId: 'old', catalogHabitId: null, relevance: 'baixa', occurredOn: '2026-09-30', completed: true },
];
assertEqual(scoreCompletions(ranked, '2026-10-05', '2026-10-12'), 120);
assertEqual(scoreCompletions(ranked, '2026-10-01', '2026-11-01'), 120);
assertEqual(scoreCompletions(ranked, '2026-01-01', '2027-01-01'), 125);
assertEqual(requirementGaps({ alta: 2, media: 4, baixa: 4 }).ready, true);
assertEqual(requirementGaps({ alta: 1, media: 4, baixa: 3 }).altaMissing, 1);
assertEqual(requirementGaps({ alta: 1, media: 4, baixa: 3 }).baixaMissing, 1);
assertEqual(requirementMessage({ alta: 1, media: 4, baixa: 4 }), 'Falta 1 hábito de relevância alta.');
assertEqual(
  requirementMessage({ alta: 0, media: 0, baixa: 3 }),
  'Faltam 2 hábitos de relevância alta, 4 hábitos de relevância média e 1 hábito de relevância baixa.',
);
assertEqual(isPersonalCatalogHabit('corpo-atividade'), true);
assertEqual(isPersonalCatalogHabit('manha-agua'), false);
assertEqual(isPersonalCatalogHabit(null), false);
assertEqual(scoreCompletions([
  { habitId: 'j1', catalogHabitId: 'manha-agua', relevance: 'baixa', occurredOn: '2026-10-05', completed: true },
], '2026-10-05', '2026-10-12'), 5);
assertEqual(formatCirclePoints(102.5), '102,5');
assertEqual(formatCirclePoints(100), '100');
assertEqual(isOfficialTask('manha-agua'), true);
assertEqual(isOfficialTask('habito-pessoal'), false);
assertEqual(honorLabel('semana', 1, 'podium'), 'SEMANA NO PÓDIO');
assertEqual(honorLabel('semana', 3, 'podium'), 'SEMANAS NO PÓDIO');
assertEqual(honorLabel('mes', 2, 'first'), 'VEZES EM 1º LUGAR');

assertEqual(competitionRank([40, 40, 10, 10, 0]).join(','), '1,1,3,3,5');
assertEqual(competitionRank([0, 0]).join(','), '1,1');

const weekStart = '2026-10-05T03:00:00.000Z';
const weekFinish = '2026-10-12T03:00:00.000Z';
assertEqual(membershipOverlapsPeriod(weekStart, null, '2026-10-05', '2026-10-12'), true);
assertEqual(membershipOverlapsPeriod('2026-10-07T15:00:00.000Z', '2026-10-08T15:00:00.000Z', '2026-10-05', '2026-10-12'), true);
assertEqual(membershipOverlapsPeriod('2026-10-01T03:00:00.000Z', '2026-10-04T03:00:00.000Z', '2026-10-05', '2026-10-12'), false);
assertEqual(membershipOverlapsPeriod(weekFinish, null, '2026-10-05', '2026-10-12'), false);
assertEqual(membershipOverlapsPeriod('2026-10-11T12:00:00.000Z', null, '2026-10-05', '2026-10-12'), true);

assertEqual(completionCreatesEvent({ operation: 'insert', completed: true, occurredOn: '2026-10-10', today: '2026-10-10', relevance: 'alta', catalogHabitId: null }), true);
assertEqual(completionCreatesEvent({ operation: 'insert', completed: true, occurredOn: '2026-10-09', today: '2026-10-10', relevance: 'alta', catalogHabitId: null }), false);
assertEqual(completionCreatesEvent({ operation: 'insert', completed: true, occurredOn: '2026-10-10', today: '2026-10-10', relevance: 'alta', catalogHabitId: 'mente-estudo' }), false);
assertEqual(completionCreatesEvent({ operation: 'insert', completed: true, occurredOn: '2026-10-10', today: '2026-10-10', relevance: null, catalogHabitId: null }), false);
assertEqual(completionCreatesEvent({ operation: 'update', completed: true, occurredOn: '2026-10-10', previousOccurredOn: '2026-10-09', today: '2026-10-10', relevance: 'media', catalogHabitId: null }), false);
assertEqual(completionCreatesEvent({ operation: 'update', completed: true, occurredOn: '2026-10-10', previousOccurredOn: '2026-10-10', today: '2026-10-10', relevance: 'media', catalogHabitId: null }), true);
assertEqual(completionRemovesEvent(false, false), true);
assertEqual(completionRemovesEvent(false, true), false);
assertEqual(achievementTotals([{ rank: 1, score: 0 }, { rank: 1, score: 20 }, { rank: 1, score: 20 }, { rank: 3, score: 10 }, { rank: 4, score: 10 }]).podiums, 3);
assertEqual(achievementTotals([{ rank: 1, score: 0 }, { rank: 1, score: 20 }, { rank: 1, score: 20 }, { rank: 3, score: 10 }, { rank: 4, score: 10 }]).firsts, 2);

assertEqual(publicHandleCandidate('Tiago Henrique', '11111111-1111-1111-1111-11111111abcd', new Set()), 'tiago-henrique');
assertEqual(publicHandleCandidate('Água', '11111111-1111-1111-1111-11111111abcd', new Set()), 'agua');
assertEqual(publicHandleCandidate('***', '11111111-1111-1111-1111-11111111abcd', new Set()), 'participante');
assertEqual(publicHandleCandidate('Tiago', '11111111-1111-1111-1111-11111111abcd', new Set(['tiago'])), 'tiago-abcd');

assertEqual(todayKey(new Date('2026-10-12T02:59:00.000Z')), '2026-10-11');
assertEqual(todayKey(new Date('2026-10-12T03:00:00.000Z')), '2026-10-12');
assertEqual(periodStart('semana', todayKey(new Date('2026-10-12T02:59:00.000Z'))), '2026-10-05');
assertEqual(periodStart('semana', todayKey(new Date('2026-10-12T03:00:00.000Z'))), '2026-10-12');
assertEqual(periodStart('mes', todayKey(new Date('2026-11-01T02:59:00.000Z'))), '2026-10-01');
assertEqual(periodStart('mes', todayKey(new Date('2026-11-01T03:00:00.000Z'))), '2026-11-01');
assertEqual(periodStart('ano', todayKey(new Date('2027-01-01T02:59:00.000Z'))), '2026-01-01');
assertEqual(periodStart('ano', todayKey(new Date('2027-01-01T03:00:00.000Z'))), '2027-01-01');

console.log('circle-ok');
