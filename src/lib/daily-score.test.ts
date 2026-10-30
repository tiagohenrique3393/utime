import { marksFromLogs } from '@/lib/constancy';
import { scoreDailyHabits, type DailyHabit } from '@/lib/daily-board';
import { scoreHabits, type ScoreHabit } from '@/lib/daily-score';
import { todayKey } from '@/lib/habit-day';
import { getProgressColor, showsExcellence } from '@/lib/progress-color';
import { progressReport, type ProgressHabit, type TodayProgressHabit } from '@/lib/progress-view';

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${String(expected)}, obtido ${String(actual)}`);
  }
}

function daily(id: string, pillar: DailyHabit['pillar'], done: boolean, catalogHabitId: string | null): DailyHabit {
  return {
    id,
    userHabitId: id,
    catalogHabitId,
    label: id,
    period: 'manha',
    pillar,
    relevance: 'media',
    minutes: null,
  };
}

const day = '2026-10-30';
const routine: DailyHabit[] = [
  daily('c1', 'corpo', true, 'corpo-atividade'),
  daily('c2', 'corpo', true, 'corpo-refeicao'),
  daily('c3', 'corpo', false, 'corpo-higiene'),
  daily('c4', 'corpo', false, null),
  daily('c5', 'corpo', false, null),
  daily('c6', 'corpo', false, null),
  daily('water', 'corpo', false, 'corpo-hidratacao'),
  daily('m1', 'mente', true, 'mente-estudo'),
  daily('m2', 'mente', true, 'mente-leitura'),
  daily('m3', 'mente', false, 'mente-prioridades'),
  daily('e1', 'espirito', false, 'espirito-meditacao'),
  daily('e2', 'espirito', false, 'espirito-atencao'),
];
const completed = new Set(routine.filter((habit) => habit.id === 'c1' || habit.id === 'c2' || habit.id === 'm1' || habit.id === 'm2').map((habit) => habit.id));

const hoje = scoreDailyHabits(routine, completed);
assertEqual(hoje.excludedIds.join(','), 'water', 'hidratação oficial fora da conta');
assertEqual(hoje.includedIds.join(','), 'c1,c2,c3,c4,c5,c6,m1,m2,m3,e1,e2', 'os onze hábitos válidos');
assertEqual(hoje.total, 11, 'denominador de Hoje');
assertEqual(hoje.done, 4, 'numerador de Hoje');
assertEqual(hoje.percent, 36.36, 'geral de Hoje');
assertEqual(hoje.pillars.find((pillar) => pillar.id === 'corpo')?.percent, 33.33, 'corpo de Hoje');
assertEqual(hoje.pillars.find((pillar) => pillar.id === 'corpo')?.planned, 6, 'corpo sem a água');
assertEqual(hoje.pillars.find((pillar) => pillar.id === 'mente')?.percent, 66.67, 'mente de Hoje');
assertEqual(hoje.pillars.find((pillar) => pillar.id === 'espirito')?.percent, 0, 'espírito de Hoje');

const unfiltered = scoreHabits(
  routine.map((habit) => ({
    id: habit.id,
    pillar: habit.pillar,
    catalogHabitId: habit.catalogHabitId === 'corpo-hidratacao' ? null : habit.catalogHabitId,
    done: completed.has(habit.id),
  })),
);
assertEqual(unfiltered.percent, 33.33, 'o cálculo antigo, com a água no denominador');
assertEqual(unfiltered.pillars.find((pillar) => pillar.id === 'corpo')?.percent, 28.57, 'corpo antigo, 2 de 7');

const todayHabits: TodayProgressHabit[] = routine.map((habit) => ({
  id: habit.id,
  label: habit.label,
  pillar: habit.pillar,
  catalogHabitId: habit.catalogHabitId,
  done: completed.has(habit.id),
}));
const known: ProgressHabit[] = todayHabits.map(({ done: _done, ...habit }) => habit);
const sameDay = progressReport({
  today: day,
  period: 'dia',
  logs: [{ dateKey: day, habitId: 'water', completed: true }],
  hydration: [{ dateKey: day, consumedMl: 2000, goalMl: 3000 }],
  todayRoutine: { total: 12, completed: 4 },
  habits: known,
  todayHabits,
});
assertEqual(sameDay.dia, hoje.percent, 'Progresso usa a mesma conta de Hoje');
assertEqual(sameDay.pillars.find((pillar) => pillar.pillar === 'corpo')?.percent, 33.33, 'corpo idêntico');
assertEqual(sameDay.pillars.find((pillar) => pillar.pillar === 'mente')?.percent, 66.67, 'mente idêntica');
assertEqual(sameDay.pillars.find((pillar) => pillar.pillar === 'espirito')?.percent, 0, 'espírito idêntico');
assertEqual(sameDay.water.consumedMl, 2000, 'a água continua no módulo próprio');
assertEqual(sameDay.periodGoalMl, 3000, 'a meta de água não entra no hábito');

const ownWater: ScoreHabit = { id: 'own', pillar: 'corpo', catalogHabitId: null, done: false };
const withOwn = scoreHabits([
  ...hoje.includedIds.map((id) => {
    const source = routine.find((habit) => habit.id === id);
    return { id, pillar: source?.pillar ?? 'corpo', catalogHabitId: source?.catalogHabitId ?? null, done: completed.has(id) };
  }),
  ownWater,
]);
assertEqual(withOwn.includedIds.includes('own'), true, 'hábito próprio de água continua válido');
assertEqual(withOwn.total, 12, 'o hábito próprio entra no denominador');

function repeated(count: number, done: number, pillar: ScoreHabit['pillar']): ScoreHabit[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${pillar}-${index}`,
    pillar,
    catalogHabitId: null,
    done: index < done,
  }));
}

assertEqual(scoreHabits([]).percent, 0, 'sem hábitos válidos');
assertEqual(scoreHabits([]).pillars.every((pillar) => pillar.percent === 0 && pillar.planned === 0), true, 'pilar vazio fica em zero');
assertEqual(scoreHabits(repeated(100, 0, 'mente')).percent, 0, 'zero por cento');
assertEqual(getProgressColor(scoreHabits(repeated(100, 69, 'mente')).percent), 'red', '69 vermelho');
assertEqual(getProgressColor(scoreHabits(repeated(100, 70, 'mente')).percent), 'green', '70 verde');
assertEqual(showsExcellence(scoreHabits(repeated(100, 99, 'mente')).percent), false, '99 sem excelência');
assertEqual(getProgressColor(scoreHabits(repeated(100, 100, 'mente')).percent), 'gold', '100 dourado');

const toggled = new Set(completed);
toggled.delete('m2');
const afterToggle = scoreDailyHabits(routine, toggled);
assertEqual(afterToggle.done, 3, 'desmarcar reduz o numerador');
assertEqual(afterToggle.percent, 27.27, 'geral depois de desmarcar');
assertEqual(afterToggle.pillars.find((pillar) => pillar.id === 'mente')?.percent, 33.33, 'mente depois de desmarcar');
const removed = routine.filter((habit) => habit.id !== 'c6');
const afterEdit = scoreDailyHabits(removed, completed);
assertEqual(afterEdit.total, 10, 'personalizar remove o hábito do denominador');
assertEqual(afterEdit.pillars.find((pillar) => pillar.id === 'corpo')?.planned, 5, 'corpo acompanha a edição');

const past = progressReport({
  today: day,
  period: 'semana',
  logs: [
    { dateKey: '2026-10-29', habitId: 'water', completed: false },
    { dateKey: '2026-10-29', habitId: 'c1', completed: true },
  ],
  hydration: [],
  todayRoutine: null,
  habits: known,
  todayHabits: null,
});
assertEqual(past.habitPoints.find((point) => point.key === '2026-10-29')?.value, 100, 'o histórico não conta a água');

const marks = marksFromLogs(
  [
    { dateKey: '2026-10-29', habitId: 'water', completed: false },
    { dateKey: '2026-10-29', habitId: 'c1', completed: true },
  ],
  new Set(['water', 'corpo-hidratacao']),
);
assertEqual(marks.get('2026-10-29')?.planned, 1, 'constância ignora a água gravada');
assertEqual(marks.get('2026-10-29')?.done, 1, 'constância mantém o hábito válido');

const emptySpirit = progressReport({
  today: day,
  period: 'dia',
  logs: [],
  hydration: [],
  todayRoutine: { total: 1, completed: 1 },
  habits: [{ id: 'm1', label: 'Ler', pillar: 'mente', catalogHabitId: null }],
  todayHabits: [{ id: 'm1', label: 'Ler', pillar: 'mente', catalogHabitId: null, done: true }],
});
assertEqual(emptySpirit.dia, 100, 'dia só com mente');
assertEqual(emptySpirit.pillars.find((pillar) => pillar.pillar === 'espirito')?.percent, 0, 'pilar sem hábito no dia fica em zero');
const weekSpirit = progressReport({
  today: day,
  period: 'semana',
  logs: [{ dateKey: '2026-10-26', habitId: 'e1', completed: true }],
  hydration: [],
  todayRoutine: null,
  habits: [{ id: 'e1', label: 'Meditar', pillar: 'espirito', catalogHabitId: 'espirito-meditacao' }],
  todayHabits: [{ id: 'm1', label: 'Ler', pillar: 'mente', catalogHabitId: null, done: true }],
});
assertEqual(weekSpirit.pillars.find((pillar) => pillar.pillar === 'espirito')?.percent, 100, 'a semana não transforma pilar vazio de hoje em zero');

assertEqual(todayKey(new Date('2026-10-30T02:59:00.000Z')), '2026-10-29', 'antes da meia-noite de Brasília');
assertEqual(todayKey(new Date('2026-10-30T03:00:00.000Z')), '2026-10-30', 'meia-noite de Brasília');

console.log('daily-score-ok');
