import { periods } from '@/lib/tasks';
import { todayKey } from '@/lib/habit-day';
import {
  achievementTotals,
  competitionRank,
  completionCreatesEvent,
  completionRemovesEvent,
  honorLabel,
  isOfficialTask,
  membershipOverlapsPeriod,
  officialTaskIds,
  periodEnd,
  periodLabel,
  periodScore,
  periodStart,
  publicHandleCandidate,
  scoreFromLogs,
  shiftPeriod,
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

const events = [
  { taskId: 'manha-agua', occurredOn: '2026-10-05' },
  { taskId: 'manha-agua', occurredOn: '2026-10-05' },
  { taskId: 'manha-agua', occurredOn: '2026-10-06' },
  { taskId: 'tarde-atividade', occurredOn: '2026-10-11' },
  { taskId: 'noite-oracao', occurredOn: '2026-10-12' },
  { taskId: 'habito-pessoal', occurredOn: '2026-10-06' },
  { taskId: 'manha-cafe', occurredOn: '2026-09-30' },
  { taskId: 'manha-banho', occurredOn: '2025-12-31' },
];

assertEqual(periodScore(events, '2026-10-05', '2026-10-12'), 30);
assertEqual(periodScore(events, '2026-10-12', '2026-10-19'), 10);
assertEqual(periodScore(events, '2026-10-01', '2026-11-01'), 40);
assertEqual(periodScore(events, '2026-01-01', '2027-01-01'), 50);
assertEqual(periodScore(events, '2025-01-01', '2026-01-01'), 10);
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

const logs = [
  { catalogHabitId: 'manha-agua', completed: true, occurredOn: '2026-10-05' },
  { catalogHabitId: 'manha-agua', completed: true, occurredOn: '2026-10-05' },
  { catalogHabitId: 'manha-agua', completed: false, occurredOn: '2026-10-06' },
  { catalogHabitId: 'corpo-atividade', completed: true, occurredOn: '2026-10-06' },
  { catalogHabitId: null, completed: true, occurredOn: '2026-10-06' },
  { catalogHabitId: 'noite-oracao', completed: true, occurredOn: '2026-09-30' },
  { catalogHabitId: 'manha-banho', completed: true, occurredOn: '2026-10-11' },
];
assertEqual(scoreFromLogs(logs, '2026-10-05', '2026-10-12'), 20);
assertEqual(scoreFromLogs(logs, '2026-10-01', '2026-11-01'), 20);
assertEqual(scoreFromLogs(logs, '2026-01-01', '2027-01-01'), 30);

assertEqual(completionCreatesEvent({ operation: 'insert', completed: true, occurredOn: '2026-10-10', today: '2026-10-10' }), true);
assertEqual(completionCreatesEvent({ operation: 'insert', completed: true, occurredOn: '2026-10-09', today: '2026-10-10' }), false);
assertEqual(completionCreatesEvent({ operation: 'update', completed: true, occurredOn: '2026-10-10', previousOccurredOn: '2026-10-09', today: '2026-10-10' }), false);
assertEqual(completionCreatesEvent({ operation: 'update', completed: true, occurredOn: '2026-10-10', previousOccurredOn: '2026-10-10', today: '2026-10-10' }), true);
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
