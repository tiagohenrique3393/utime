import { hydrationProgress } from '@/lib/hydration';
import {
  activationDateKey,
  hydrationLoadThrough,
  hydrationWeekDateKeys,
  hydrationYearDateKeys,
  monthDateKeys,
  periodGoalMl,
  progressReport,
  shiftDateKey,
  weekdayIndex,
  type HydrationLog,
  type ProgressPeriod,
} from '@/lib/progress-view';

function assertEqual<T>(actual: T, expected: T) {
  if (actual !== expected) {
    throw new Error(`Esperado ${String(expected)}, obtido ${String(actual)}`);
  }
}

function assertNotEqual<T>(actual: T, expected: T) {
  if (actual === expected) {
    throw new Error(`O valor não deveria ser ${String(expected)}`);
  }
}

function assertDeepEqual(actual: readonly string[], expected: readonly string[]) {
  if (actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) {
    throw new Error(`Esperado ${expected.join(',')}, obtido ${actual.join(',')}`);
  }
}

const today = '2026-10-09';
const active = '2026-01-01';
const constant: HydrationLog[] = [{ dateKey: today, consumedMl: 3000, goalMl: 3000 }];

function report(period: ProgressPeriod, hydration: readonly HydrationLog[], activatedOn: string | null, day = today) {
  return progressReport({
    today: day,
    period,
    logs: [],
    hydration,
    todayRoutine: null,
    activatedOn,
  });
}

function sumGoals(dates: readonly string[], goalFor: (key: string) => number | null) {
  let sum = 0;
  let seen = false;
  for (const key of dates) {
    const goal = goalFor(key);
    if (goal == null) {
      continue;
    }
    seen = true;
    sum += goal;
  }
  return seen ? sum : null;
}

const week = hydrationWeekDateKeys(today);
assertEqual(week.length, 7);
assertEqual(weekdayIndex(week[0]), 1);
assertEqual(weekdayIndex(week[6]), 0);
assertEqual(week[0], '2026-10-05');
assertEqual(week[6], '2026-10-11');
assertEqual(week.includes(shiftDateKey(week[0], 7)), false);
assertDeepEqual(hydrationWeekDateKeys('2026-10-10'), week);
assertDeepEqual(hydrationWeekDateKeys('2026-10-11'), week);
assertEqual(hydrationWeekDateKeys('2026-10-12')[0], '2026-10-12');

assertEqual(monthDateKeys('2025-02-01').length, 28);
assertEqual(monthDateKeys('2024-02-01').length, 29);
assertEqual(monthDateKeys('2026-04-01').length, 30);
assertEqual(monthDateKeys('2026-10-09').length, 31);
assertEqual(hydrationYearDateKeys('2025-06-01').length, 365);
assertEqual(hydrationYearDateKeys('2026-10-09').length, 365);
assertEqual(hydrationYearDateKeys('2024-06-01').length, 366);
assertEqual(hydrationYearDateKeys('2024-01-01').includes('2024-02-29'), true);
assertEqual(shiftDateKey('2024-03-01', -1), '2024-02-29');
assertEqual(shiftDateKey('2026-03-01', -1), '2026-02-28');

const dia = report('dia', constant, active);
const semana = report('semana', constant, active);
const mes = report('mes', constant, active);
const ano = report('ano', constant, active);
assertEqual(dia.water.consumedMl, 3000);
assertEqual(dia.periodGoalMl, 3000);
assertEqual(semana.water.consumedMl, 3000);
assertEqual(semana.periodGoalMl, 21000);
assertEqual(mes.water.consumedMl, 3000);
assertEqual(mes.periodGoalMl, 93000);
assertEqual(ano.water.consumedMl, 3000);
assertEqual(ano.periodGoalMl, 1095000);
assertNotEqual(semana.periodGoalMl, 18000);
assertNotEqual(mes.periodGoalMl, 27000);
assertNotEqual(ano.periodGoalMl, 846000);
assertEqual(hydrationProgress(3000, 21000), 14);
assertEqual(hydrationProgress(3000, 93000), 3);
assertEqual(hydrationProgress(3000, 1095000), 0);

const leap: HydrationLog[] = [{ dateKey: '2024-06-01', consumedMl: 0, goalMl: 3000 }];
assertEqual(periodGoalMl(hydrationYearDateKeys('2024-06-01'), leap, '2024-01-01'), 366 * 3000);
assertEqual(periodGoalMl(monthDateKeys('2024-02-01'), leap, '2024-01-01'), 29 * 3000);
assertEqual(periodGoalMl(monthDateKeys('2025-02-01'), [{ dateKey: '2025-02-01', consumedMl: 0, goalMl: 3000 }], '2025-01-01'), 28 * 3000);
assertEqual(periodGoalMl(monthDateKeys('2026-04-01'), [{ dateKey: '2026-04-01', consumedMl: 0, goalMl: 3000 }], '2026-01-01'), 30 * 3000);

const changed: HydrationLog[] = [
  { dateKey: '2026-10-09', consumedMl: 3000, goalMl: 3000 },
  { dateKey: '2026-10-20', consumedMl: 0, goalMl: 2000 },
];
const october = monthDateKeys(today);
const year = hydrationYearDateKeys(today);
assertEqual(
  periodGoalMl(october, changed, active),
  sumGoals(october, (key) => (key < '2026-10-20' ? 3000 : 2000)),
);
assertEqual(periodGoalMl(october, changed, active), 19 * 3000 + 12 * 2000);
assertEqual(
  periodGoalMl(year, changed, active),
  sumGoals(year, (key) => (key < '2026-10-20' ? 3000 : 2000)),
);
assertEqual(periodGoalMl(week, changed, active), 21000);
assertEqual(report('mes', changed, active).water.consumedMl, 3000);
assertEqual(report('ano', changed, active).water.consumedMl, 3000);

const history: HydrationLog[] = [
  { dateKey: '2026-10-04', consumedMl: 1000, goalMl: 2000 },
  { dateKey: '2026-10-08', consumedMl: 1500, goalMl: 3000 },
  { dateKey: '2026-10-10', consumedMl: 2500, goalMl: 2500 },
];
const historyGoal = (key: string) => {
  if (key < '2026-10-08') {
    return 2000;
  }
  if (key < '2026-10-10') {
    return 3000;
  }
  return 2500;
};
assertEqual(periodGoalMl(hydrationWeekDateKeys('2026-10-10'), history, active), sumGoals(hydrationWeekDateKeys('2026-10-10'), historyGoal));
assertEqual(periodGoalMl(hydrationWeekDateKeys('2026-10-10'), history, active), 17000);
assertEqual(report('semana', history, active, '2026-10-10').water.consumedMl, 4000);
assertEqual(periodGoalMl(monthDateKeys('2026-10-10'), history, active), sumGoals(monthDateKeys('2026-10-10'), historyGoal));
assertEqual(report('mes', history, active, '2026-10-10').water.consumedMl, 5000);
assertEqual(report('dia', history, active, '2026-10-07').water.consumedMl, null);
assertEqual(report('dia', history, active, '2026-10-07').periodGoalMl, 2000);

const outside: HydrationLog[] = [
  ...history,
  { dateKey: shiftDateKey(hydrationWeekDateKeys('2026-10-10')[0], 7), consumedMl: 9999, goalMl: 3000 },
];
assertEqual(report('semana', outside, active, '2026-10-10').water.consumedMl, 4000);

const quiet: HydrationLog[] = [{ dateKey: today, consumedMl: 0, goalMl: 3000 }];
assertEqual(report('dia', quiet, active).water.consumedMl, 0);
assertEqual(report('semana', quiet, active).water.consumedMl, 0);
assertEqual(report('semana', quiet, active).periodGoalMl, 21000);

const userA = report('dia', [{ dateKey: today, consumedMl: 3000, goalMl: 3000 }], active);
const userB = report('dia', [{ dateKey: today, consumedMl: 800, goalMl: 2000 }], active);
assertEqual(userA.water.consumedMl, 3000);
assertEqual(userA.periodGoalMl, 3000);
assertEqual(userB.water.consumedMl, 800);
assertEqual(userB.periodGoalMl, 2000);

const boundary: HydrationLog[] = [
  { dateKey: '2026-09-27', consumedMl: 9999, goalMl: 3000 },
  { dateKey: '2026-09-30', consumedMl: 1500, goalMl: 3000 },
  { dateKey: '2026-10-01', consumedMl: 500, goalMl: 3000 },
];
const octoberWeek = hydrationWeekDateKeys('2026-10-01');
assertEqual(octoberWeek[0], '2026-09-28');
assertEqual(octoberWeek[6], '2026-10-04');
assertEqual(report('semana', boundary, active, '2026-10-01').water.consumedMl, 2000);
assertEqual(report('mes', boundary, active, '2026-10-01').water.consumedMl, 500);
assertEqual(report('mes', boundary, active, '2026-10-01').periodGoalMl, 93000);
assertEqual(report('ano', boundary, active, '2026-10-01').water.consumedMl, 11999);

assertEqual(weekdayIndex('2026-01-02'), 5);
const newYearWeek = hydrationWeekDateKeys('2026-01-02');
assertEqual(newYearWeek[0], '2025-12-29');
assertEqual(newYearWeek[6], '2026-01-04');
const yearTurn: HydrationLog[] = [
  { dateKey: '2025-12-28', consumedMl: 9999, goalMl: 3000 },
  { dateKey: '2025-12-30', consumedMl: 400, goalMl: 3000 },
  { dateKey: '2026-01-01', consumedMl: 100, goalMl: 3000 },
  { dateKey: '2026-01-02', consumedMl: 50, goalMl: 3000 },
];
assertEqual(report('semana', yearTurn, '2025-01-01', '2026-01-02').water.consumedMl, 550);
assertEqual(report('semana', yearTurn, '2025-01-01', '2026-01-02').periodGoalMl, 21000);
assertEqual(report('mes', yearTurn, '2025-01-01', '2026-01-02').water.consumedMl, 150);
assertEqual(report('ano', yearTurn, active, '2026-01-02').water.consumedMl, 150);
assertEqual(report('ano', yearTurn, active, '2026-01-02').periodGoalMl, 365 * 3000);

const over: HydrationLog[] = [{ dateKey: today, consumedMl: 4500, goalMl: 3000 }];
assertEqual(report('dia', over, active).water.consumedMl, 4500);
assertEqual(report('dia', over, active).periodGoalMl, 3000);
assertEqual(hydrationProgress(4500, 3000), 100);
assertEqual(hydrationProgress(1, 300000), 0);

const duplicates: HydrationLog[] = [
  { dateKey: today, consumedMl: 1000, goalMl: 3000 },
  { dateKey: today, consumedMl: 1800, goalMl: 2500 },
];
assertEqual(report('dia', duplicates, today).water.consumedMl, 1800);
assertEqual(report('dia', duplicates, today).periodGoalMl, 2500);
assertNotEqual(report('dia', duplicates, today).water.consumedMl, 2800);

const started = '2026-10-09';
assertEqual(report('semana', constant, started).periodGoalMl, 9000);
assertEqual(report('mes', constant, started).periodGoalMl, 23 * 3000);
assertEqual(
  report('ano', constant, started).periodGoalMl,
  hydrationYearDateKeys(today).filter((key) => key >= started).length * 3000,
);
assertEqual(report('ano', constant, started).periodGoalMl, 84 * 3000);
assertNotEqual(report('ano', constant, started).periodGoalMl, 1095000);
assertEqual(periodGoalMl(october, constant), report('mes', constant, started).periodGoalMl);

const scheduled: HydrationLog[] = [{ dateKey: '2026-10-20', consumedMl: 0, goalMl: 2000 }];
assertEqual(periodGoalMl(october, scheduled, '2026-10-01'), 31 * 2000);
assertEqual(periodGoalMl(monthDateKeys('2026-09-01'), scheduled, '2026-10-01'), null);

assertEqual(hydrationProgress(500, 0), 0);
assertEqual(hydrationProgress(500, null), 0);
const zeroGoal: HydrationLog[] = [{ dateKey: today, consumedMl: 500, goalMl: 0 }];
assertEqual(report('dia', zeroGoal, today).periodGoalMl, 0);
assertEqual(report('dia', zeroGoal, today).water.consumedMl, 500);
const zeroPeriodGoal = report('dia', zeroGoal, today).periodGoalMl;
const zeroConsumed = report('dia', zeroGoal, today).water.consumedMl;
const zeroPercent = zeroConsumed != null && zeroPeriodGoal != null && zeroPeriodGoal > 0 ? hydrationProgress(zeroConsumed, zeroPeriodGoal) : null;
assertEqual(zeroPercent, null);

assertEqual(activationDateKey('2026-10-10T02:30:00.000Z'), '2026-10-09');
assertEqual(activationDateKey('2026-10-10T03:00:00.000Z'), '2026-10-10');
assertEqual(activationDateKey(null), null);
assertEqual(activationDateKey('invalido'), null);

const horizon = hydrationLoadThrough('2026-12-31');
assertEqual(horizon, '2027-01-06');
assertEqual(hydrationWeekDateKeys('2026-12-31').every((key) => key <= horizon), true);
assertEqual(hydrationYearDateKeys('2026-12-31').every((key) => key <= horizon), true);

const habits = [{ id: 'h1', label: 'Leitura', pillar: 'mente' as const, catalogHabitId: null }];
const habitReport = progressReport({
  today,
  period: 'semana',
  logs: [
    { dateKey: '2026-10-04', habitId: 'h1', completed: true },
    { dateKey: '2026-01-02', habitId: 'h1', completed: true },
    { dateKey: '2026-12-15', habitId: 'h1', completed: true },
  ],
  hydration: [
    { dateKey: '2026-10-04', consumedMl: 9000, goalMl: 3000 },
    { dateKey: today, consumedMl: 3000, goalMl: 3000 },
    { dateKey: '2026-10-11', consumedMl: 1000, goalMl: 3000 },
  ],
  todayRoutine: null,
  habits,
  todayHabits: null,
  activatedOn: active,
});
assertEqual(habitReport.semana, 100);
assertEqual(habitReport.mes, 100);
assertEqual(habitReport.ano, 100);
assertEqual(habitReport.dia, null);
assertEqual(habitReport.pillars.find((pillar) => pillar.pillar === 'mente')?.percent, 100);
assertEqual(habitReport.pillars.find((pillar) => pillar.pillar === 'corpo')?.percent, null);
assertEqual(habitReport.water.consumedMl, 4000);
assertEqual(habitReport.periodGoalMl, 21000);

console.log('progress-hydration-ok');
