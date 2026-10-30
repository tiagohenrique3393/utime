import { dayOutcome, marksFromLogs, monthScore } from '@/lib/constancy';
import { completionCreatesEvent, dayScore, scoreCompletions } from '@/lib/circle';
import { exactDailyPercent, todayKey } from '@/lib/habit-day';
import { hydrationPercent } from '@/lib/hydration';
import { getProgressColor, showsExcellence } from '@/lib/progress-color';
import {
  averagePercent,
  habitPercentOn,
  hydrationWeekDateKeys,
  progressReport,
  weekDateKeys,
  type HabitLog,
} from '@/lib/progress-view';

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${String(expected)}, obtido ${String(actual)}`);
  }
}

function close(actual: number | null, expected: number, label: string) {
  if (actual == null || Math.abs(actual - expected) > 0.001) {
    throw new Error(`${label}: esperado ${expected}, obtido ${String(actual)}`);
  }
}

const habits = [
  { id: 'c', label: 'Correr', pillar: 'corpo' as const, catalogHabitId: 'corpo-atividade' },
  { id: 'm', label: 'Ler', pillar: 'mente' as const, catalogHabitId: 'mente-leitura' },
  { id: 'e', label: 'Meditar', pillar: 'espirito' as const, catalogHabitId: 'espirito-meditacao' },
  { id: 'water', label: 'Hidratação', pillar: 'corpo' as const, catalogHabitId: 'corpo-hidratacao' },
];

function day(dateKey: string, done: Record<string, boolean>): HabitLog[] {
  return Object.entries(done).map(([habitId, completed]) => ({ dateKey, habitId, completed }));
}

assertEqual(exactDailyPercent(0, 10), 0, 'dia zerado');
assertEqual(exactDailyPercent(1, 10), 10, 'dez por cento');
assertEqual(exactDailyPercent(3, 10), 30, 'trinta por cento');
assertEqual(exactDailyPercent(7, 10), 70, 'setenta por cento');
assertEqual(exactDailyPercent(10, 10), 100, 'cem por cento');
assertEqual(exactDailyPercent(0, 0), null, 'sem hábitos programados');
assertEqual(getProgressColor(69.99), 'red', 'abaixo de 70 no valor real');
assertEqual(getProgressColor(70), 'green', '70 no valor real');
assertEqual(showsExcellence(99.99), false, '99,99 não é excelência');
assertEqual(showsExcellence(100), true, '100 é excelência');

const closedZero = habitPercentOn('2026-10-26', '2026-10-30', day('2026-10-26', { c: false, m: false }), null);
assertEqual(closedZero, 0, 'dia encerrado sem check-in');
const partial = habitPercentOn('2026-10-27', '2026-10-30', day('2026-10-27', { c: true, m: false }), null);
assertEqual(partial, 50, 'check-in parcial');
const duplicated = habitPercentOn(
  '2026-10-27',
  '2026-10-30',
  [...day('2026-10-27', { c: true }), ...day('2026-10-27', { c: true, m: false })],
  null,
);
assertEqual(duplicated, 50, 'hábito duplicado conta uma vez');

const removed = progressReport({
  today: '2026-10-30',
  period: 'dia',
  logs: day('2026-10-29', { c: true, gone: false }),
  hydration: [],
  todayRoutine: null,
  habits,
  todayHabits: null,
});
assertEqual(removed.dia, null, 'ontem não é o dia');
const removedWeek = progressReport({
  today: '2026-10-30',
  period: 'semana',
  logs: day('2026-10-29', { c: true, gone: true }),
  hydration: [],
  todayRoutine: null,
  habits,
  todayHabits: null,
});
assertEqual(removedWeek.semana, 100, 'hábito removido permanece no denominador histórico');
assertEqual(removedWeek.pillars.find((pillar) => pillar.pillar === 'corpo')?.percent, 100, 'pilar desconhecido não é inventado');

const sampleDays = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30'];
const sampleRates = [100, 80, 0, 60, 100];
const sampleLogs = sampleDays.flatMap((dateKey, index) => {
  const rate = sampleRates[index] ?? 0;
  return Array.from({ length: 10 }, (_, habit) => ({
    dateKey,
    habitId: `h${habit}`,
    completed: habit < rate / 10,
  }));
});
assertEqual(averagePercent(sampleRates), 68, 'média dos cinco dias, inclusive o zero');
const sample = progressReport({
  today: '2026-10-30',
  period: 'semana',
  logs: sampleLogs,
  hydration: [],
  todayRoutine: { total: 10, completed: 10 },
  habits: [],
  todayHabits: Array.from({ length: 10 }, (_, habit) => ({
    id: `h${habit}`,
    label: `h${habit}`,
    pillar: 'mente' as const,
    catalogHabitId: null,
    done: true,
  })),
});
assertEqual(sample.semana, 68, 'semana oficial');
assertEqual(habitPercentOn('2026-10-25', '2026-10-30', sampleLogs, null), null, 'dia anterior sem plano fica de fora');
assertEqual(habitPercentOn('2026-10-31', '2026-10-30', [], null), null, 'dia futuro fica de fora');

const weighted = progressReport({
  today: '2026-10-30',
  period: 'dia',
  logs: [],
  hydration: [{ dateKey: '2026-10-30', consumedMl: 18200, goalMl: 93000 }],
  todayRoutine: { total: 3, completed: 2 },
  habits,
  todayHabits: [
    { id: 'c', label: 'Correr', pillar: 'corpo', catalogHabitId: 'corpo-atividade', done: true },
    { id: 'c2', label: 'Refeição', pillar: 'corpo', catalogHabitId: null, done: true },
    { id: 'm', label: 'Ler', pillar: 'mente', catalogHabitId: 'mente-leitura', done: false },
    { id: 'water', label: 'Hidratação', pillar: 'corpo', catalogHabitId: 'corpo-hidratacao', done: true },
  ],
});
close(weighted.dia, (2 / 3) * 100, 'geral não é a média dos pilares');
assertEqual(weighted.pillars.find((pillar) => pillar.pillar === 'corpo')?.percent, 100, 'corpo do dia');
assertEqual(weighted.pillars.find((pillar) => pillar.pillar === 'mente')?.percent, 0, 'mente do dia');
assertEqual(weighted.pillars.find((pillar) => pillar.pillar === 'espirito')?.percent, 0, 'pilar sem hábito no dia');
assertEqual(weighted.water.consumedMl, 18200, 'água separada');
assertEqual(hydrationPercent(18200, 93000), 19.6, '18,2 L de 93 L');

const neutralPillar = progressReport({
  today: '2026-10-30',
  period: 'semana',
  logs: [
    ...day('2026-10-26', { c: true }),
    ...day('2026-10-27', { m: false }),
  ],
  hydration: [],
  todayRoutine: null,
  habits,
  todayHabits: null,
});
assertEqual(neutralPillar.semana, 50, 'média dos percentuais gerais');
assertEqual(neutralPillar.pillars.find((pillar) => pillar.pillar === 'corpo')?.percent, 100, 'dia sem corpo não vira zero');
assertEqual(neutralPillar.pillars.find((pillar) => pillar.pillar === 'mente')?.percent, 0, 'mente prevista e vazia entra como zero');
assertEqual(neutralPillar.pillars.find((pillar) => pillar.pillar === 'espirito')?.percent, null, 'espírito sem plano fica neutro na semana');

const marks = marksFromLogs([
  ...day('2026-10-26', { c: true, m: true }),
  ...day('2026-10-27', { c: true, m: false }),
  ...day('2026-10-28', { c: false, m: false }),
  ...day('2026-10-30', { c: false }),
]);
assertEqual(dayOutcome(marks.get('2026-10-26'), '2026-10-26', '2026-10-30'), 'star', '100% é excelência e meta');
assertEqual(dayOutcome(marks.get('2026-10-27'), '2026-10-27', '2026-10-30'), 'miss', '50% fica abaixo da meta');
assertEqual(dayOutcome({ planned: 10, done: 7 }, '2026-10-27', '2026-10-30'), 'keep', '70% real entra na meta');
assertEqual(dayOutcome({ planned: 10, done: 1 }, '2026-10-27', '2026-10-30'), 'miss', '10% fica abaixo');
assertEqual(dayOutcome({ planned: 10, done: 3 }, '2026-10-27', '2026-10-30'), 'miss', '30% fica abaixo');
assertEqual(dayOutcome({ planned: 10, done: 0 }, '2026-10-27', '2026-10-30'), 'miss', '0% encerrado fica abaixo');
assertEqual(dayOutcome(marks.get('2026-10-28'), '2026-10-28', '2026-10-30'), 'miss', 'zero encerrado fica abaixo');
assertEqual(dayOutcome(marks.get('2026-10-30'), '2026-10-30', '2026-10-30'), 'open', 'hoje abaixo de 70% não quebra a sequência');
assertEqual(dayOutcome(undefined, '2026-10-25', '2026-10-30'), 'empty', 'sem plano não é falha');
assertEqual(dayOutcome(undefined, '2026-11-01', '2026-10-30'), 'future', 'futuro não é falha');

const october = monthScore(marks, 2026, 10, '2026-10-30');
assertEqual(october.meta, 1, 'só o dia de 100% está na meta');
assertEqual(october.excellence, 1, 'excelência');
assertEqual(october.below, 2, 'parcial de 50% e zero encerrado');
assertEqual(october.eligible, 3, 'hoje em andamento fica fora do denominador');
assertEqual(october.monthPercent, 33, 'a taxa usa os dias elegíveis');

assertEqual(dayScore({ alta: 2, media: 4, baixa: 4 }), 100, 'base de 100');
assertEqual(dayScore({ alta: 4, media: 6, baixa: 8 }), 110, 'teto de 110');
assertEqual(dayScore({ alta: 2, media: 4, baixa: 5 }) - 100 <= 10, true, 'bônus diário não passa de 10');
assertEqual(
  scoreCompletions(
    [
      { habitId: 'a', catalogHabitId: null, relevance: 'alta', occurredOn: '2026-10-26', completed: false },
      { habitId: 'b', catalogHabitId: null, relevance: 'alta', occurredOn: '2026-10-26', completed: true },
    ],
    '2026-10-26',
    '2026-10-27',
  ),
  20,
  'só o hábito concluído pontua',
);
assertEqual(
  completionCreatesEvent({
    operation: 'insert',
    completed: false,
    occurredOn: '2026-10-30',
    today: '2026-10-30',
    relevance: 'alta',
    catalogHabitId: null,
  }),
  false,
  'dia sem check-in não cria evento',
);

assertEqual(weekDateKeys('2026-10-30')[0], '2026-10-26', 'sexta pertence à semana de segunda');
assertEqual(weekDateKeys('2026-01-01')[0], '2025-12-29', 'ano novo continua na semana anterior');
assertEqual(weekDateKeys('2026-10-30').join(','), hydrationWeekDateKeys('2026-10-30').join(','), 'hábitos e água usam a mesma segunda');
assertEqual(todayKey(new Date('2026-01-01T02:59:00.000Z')), '2025-12-31', 'virada em São Paulo');
assertEqual(todayKey(new Date('2024-02-29T15:00:00.000Z')), '2024-02-29', '29 de fevereiro');
const leap = progressReport({
  today: '2024-03-01',
  period: 'ano',
  logs: day('2024-02-29', { c: true }),
  hydration: [],
  todayRoutine: null,
  habits,
  todayHabits: null,
});
assertEqual(leap.ano, 100, 'o bissexto entra quando houve plano');

const octoberOnly = progressReport({
  today: '2026-10-30',
  period: 'ano',
  logs: day('2026-10-26', { c: true, m: false }),
  hydration: [],
  todayRoutine: null,
  habits,
  todayHabits: null,
});
assertEqual(octoberOnly.ano, octoberOnly.mes, 'sem plano anterior o ano acompanha o mês');
assertEqual(octoberOnly.ano, 50, 'janeiro a setembro sem plano não viram zero');

for (const [index, dateKey] of sampleDays.entries()) {
  const rate = sampleRates[index] ?? 0;
  const rows = sampleLogs.filter((row) => row.dateKey === dateKey);
  console.log(
    [
      dateKey,
      `programados=${rows.length}`,
      `concluidos=${rows.filter((row) => row.completed).length}`,
      `real=${habitPercentOn(dateKey, '2026-10-30', sampleLogs, { total: 10, completed: 10 })}`,
      'elegivel=sim',
      `meta=${rate >= 70}`,
      `excelencia=${rate === 100}`,
    ].join(' '),
  );
}
console.log('semana=68 mes-do-exemplo=68');

console.log('progress-math-ok');
