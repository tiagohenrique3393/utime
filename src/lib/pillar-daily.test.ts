import { dailyPillarBoard, type DailyHabit } from '@/lib/daily-board';
import { habitLogFromRow } from '@/lib/habit-day';
import { dailyPillarStats, pillarDayStat, type PillarDayHabit } from '@/lib/pillar-daily';

function assertEqual<T>(actual: T, expected: T) {
  if (actual !== expected) {
    throw new Error(`Esperado ${String(expected)}, obtido ${String(actual)}`);
  }
}

function habit(id: string, pillar: PillarDayHabit['pillar'], done: boolean): PillarDayHabit {
  return { id, pillar, done };
}

function percent(habits: readonly PillarDayHabit[], pillar: PillarDayHabit['pillar']) {
  return pillarDayStat(habits, pillar).percent;
}

const none: PillarDayHabit[] = [];
assertEqual(percent(none, 'corpo'), 0);
assertEqual(percent(none, 'mente'), 0);
assertEqual(percent(none, 'espirito'), 0);
assertEqual(pillarDayStat(none, 'mente').planned, 0);
assertEqual(pillarDayStat(none, 'mente').done, 0);

const open = [habit('correr', 'corpo', false), habit('ler', 'mente', false)];
assertEqual(percent(open, 'corpo'), 0);
assertEqual(percent(open, 'mente'), 0);
assertEqual(pillarDayStat(open, 'corpo').planned, 1);
assertEqual(pillarDayStat(open, 'espirito').planned, 0);

const partial = [habit('correr', 'corpo', true), habit('agua', 'corpo', false), habit('ler', 'mente', true)];
assertEqual(pillarDayStat(partial, 'corpo').done, 1);
assertEqual(pillarDayStat(partial, 'corpo').planned, 2);
assertEqual(percent(partial, 'corpo'), 50);
assertEqual(percent(partial, 'mente'), 100);
assertEqual(percent(partial, 'espirito'), 0);

const thirds = [habit('a', 'espirito', true), habit('b', 'espirito', false), habit('c', 'espirito', false)];
assertEqual(percent(thirds, 'espirito'), 33.33);
assertEqual(Math.round(percent(thirds, 'espirito')), 33);

const full = [habit('correr', 'corpo', true), habit('agua', 'corpo', true)];
assertEqual(percent(full, 'corpo'), 100);
assertEqual(pillarDayStat(full, 'corpo').done, 2);

const spread = [
  habit('treino', 'corpo', true),
  habit('refeicao', 'corpo', false),
  habit('estudo', 'mente', true),
  habit('leitura', 'mente', true),
  habit('meditar', 'espirito', false),
];
const spreadStats = dailyPillarStats(spread);
assertEqual(spreadStats.map((item) => item.id).join(','), 'corpo,mente,espirito');
assertEqual(spreadStats[0]?.percent, 50);
assertEqual(spreadStats[1]?.percent, 100);
assertEqual(spreadStats[2]?.percent, 0);
assertEqual(percent(spread, 'mente'), 100);
assertEqual(pillarDayStat(spread, 'corpo').done, 1);

let toggled = spread.map((item) => (item.id === 'refeicao' ? { ...item, done: true } : item));
assertEqual(percent(toggled, 'corpo'), 100);
toggled = toggled.map((item) => (item.id === 'estudo' ? { ...item, done: false } : item));
assertEqual(percent(toggled, 'mente'), 50);
assertEqual(percent(spread, 'corpo'), 50);

const officialIds = ['manha-banho', 'manha-leitura', 'noite-oracao'];
const personalOnly = [habit('meu-habito', 'mente', true)];
assertEqual(percent(personalOnly, 'mente'), 100);
assertEqual(pillarDayStat(personalOnly, 'mente').planned, 1);
assertEqual(officialIds.some((id) => personalOnly.some((item) => item.id === id)), false);

type StoredLog = {
  user_id: string;
  user_habit_id: string;
  occurred_on: string;
  completed: boolean;
};

const day = '2026-10-10';
const routine = [habit('treino', 'corpo', false), habit('leitura', 'mente', false)];

function fromLogs(userId: string, rows: readonly StoredLog[], on = day) {
  const done = new Set(
    rows
      .map((row) => habitLogFromRow(row, userId, on))
      .filter((row): row is { habitId: string; completed: boolean } => row !== null && row.completed)
      .map((row) => row.habitId),
  );
  return routine.map((item) => ({ ...item, done: done.has(item.id) }));
}

let stored: StoredLog[] = [
  { user_id: 'user-a', user_habit_id: 'treino', occurred_on: day, completed: true },
  { user_id: 'user-a', user_habit_id: 'leitura', occurred_on: day, completed: false },
  { user_id: 'user-b', user_habit_id: 'treino', occurred_on: day, completed: true },
  { user_id: 'user-b', user_habit_id: 'leitura', occurred_on: day, completed: true },
  { user_id: 'user-a', user_habit_id: 'leitura', occurred_on: '2026-10-11', completed: true },
  { user_id: 'user-a', user_habit_id: 'treino', occurred_on: '2026-10-09', completed: false },
];

assertEqual(percent(fromLogs('user-a', stored), 'corpo'), 100);
assertEqual(percent(fromLogs('user-a', stored), 'mente'), 0);
assertEqual(percent(fromLogs('user-b', stored), 'corpo'), 100);
assertEqual(percent(fromLogs('user-b', stored), 'mente'), 100);

stored = stored.map((row) =>
  row.user_id === 'user-a' && row.user_habit_id === 'treino' && row.occurred_on === day ? { ...row, completed: false } : row,
);
assertEqual(percent(fromLogs('user-a', stored), 'corpo'), 0);
assertEqual(percent(fromLogs('user-b', stored), 'mente'), 100);
assertEqual(stored.length, 6);

const reloaded = fromLogs('user-a', stored.map((row) => ({ ...row })));
assertEqual(percent(reloaded, 'corpo'), percent(fromLogs('user-a', stored), 'corpo'));
assertEqual(percent(reloaded, 'mente'), percent(fromLogs('user-a', stored), 'mente'));

const dailyHabit = (id: string, pillar: DailyHabit['pillar']): DailyHabit => ({
  id,
  userHabitId: id,
  catalogHabitId: null,
  label: id,
  period: 'manha',
  pillar,
  relevance: null,
});
const boardHabits = [dailyHabit('treino', 'corpo'), dailyHabit('leitura', 'mente')];
const completed = new Set(['treino']);
const boardStats = dailyPillarBoard(boardHabits, completed);
assertEqual(boardStats.find((item) => item.id === 'corpo')?.percent, percent([habit('treino', 'corpo', true), habit('leitura', 'mente', false)], 'corpo'));
assertEqual(boardStats.find((item) => item.id === 'mente')?.percent, 0);
assertEqual(boardStats.find((item) => item.id === 'espirito')?.percent, 0);

console.log('pillar-daily-ok');
