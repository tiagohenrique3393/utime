import { periods } from '@/lib/tasks';
import {
  honorLabel,
  isOfficialTask,
  officialTaskIds,
  periodEnd,
  periodLabel,
  periodScore,
  periodStart,
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

console.log('circle-ok');
