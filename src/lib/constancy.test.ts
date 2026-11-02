import {
  activityRatio,
  activityStatus,
  activityTone,
  applyTodayRoutine,
  bestStreak,
  currentStreak,
  dayOutcome,
  describePercent,
  goalLineFromTop,
  keepsStreak,
  marksFromLogs,
  monthActivity,
  monthActivityProblems,
  monthCells,
  monthGrid,
  monthScore,
  monthTitle,
  perfectDay,
  performanceTone,
  recentWeekAverages,
  recentWeekScores,
  shiftMonth,
  todayCursor,
  weekStartMonday,
  yearExcellence,
  type DayLog,
  type DayMark,
} from '@/lib/constancy';
import { exactDailyPercent, isWritableDay, todayKey } from '@/lib/habit-day';
import { shiftDateKey, weekdayIndex } from '@/lib/progress-view';

function assertEqual<T>(actual: T, expected: T) {
  if (actual !== expected) {
    throw new Error(`Esperado ${String(expected)}, obtido ${String(actual)}`);
  }
}

function log(dateKey: string, habitId: string, completed: boolean): DayLog {
  return { dateKey, habitId, completed };
}

assertEqual(keepsStreak(69, 100), false);
assertEqual(keepsStreak(70, 100), true);
assertEqual(keepsStreak(7, 10), true);
assertEqual(keepsStreak(2, 3), false);
assertEqual(keepsStreak(0, 0), false);
assertEqual(perfectDay(10, 10), true);
assertEqual(perfectDay(9, 10), false);
assertEqual(perfectDay(0, 0), false);

const below = marksFromLogs([log('2026-10-08', 'a', true), ...Array.from({ length: 99 }, (_, index) => log('2026-10-08', `h${index}`, index < 68))]);
assertEqual(below.get('2026-10-08')?.planned, 100);
assertEqual(below.get('2026-10-08')?.done, 69);
assertEqual(dayOutcome(below.get('2026-10-08'), '2026-10-08', '2026-10-10'), 'miss');

const seventy = marksFromLogs(Array.from({ length: 10 }, (_, index) => log('2026-10-08', `h${index}`, index < 7)));
assertEqual(seventy.get('2026-10-08')?.done, 7);
assertEqual(dayOutcome(seventy.get('2026-10-08'), '2026-10-08', '2026-10-10'), 'keep');

const full = marksFromLogs(Array.from({ length: 4 }, (_, index) => log('2026-10-08', `h${index}`, true)));
assertEqual(dayOutcome(full.get('2026-10-08'), '2026-10-08', '2026-10-10'), 'star');
assertEqual(currentStreak(full, '2026-10-08'), 1);
assertEqual(yearExcellence(full, 2026, '2026-10-08').total, 1);

const duplicated = marksFromLogs([
  log('2026-10-01', 'a', false),
  log('2026-10-01', 'a', true),
  log('2026-10-01', '', true),
  log('2026-13-01', 'a', true),
]);
assertEqual(duplicated.get('2026-10-01')?.planned, 1);
assertEqual(duplicated.get('2026-10-01')?.done, 1);
assertEqual(duplicated.has('2026-13-01'), false);

assertEqual(dayOutcome(undefined, '2026-10-01', '2026-10-10'), 'empty');
assertEqual(dayOutcome({ planned: 0, done: 0 }, '2026-10-10', '2026-10-10'), 'open');
assertEqual(dayOutcome({ planned: 10, done: 6 }, '2026-10-10', '2026-10-10'), 'open');
assertEqual(dayOutcome({ planned: 10, done: 10 }, '2026-10-10', '2026-10-10'), 'star');
assertEqual(dayOutcome({ planned: 1, done: 1 }, '2026-10-11', '2026-10-10'), 'future');

const sequence = marksFromLogs([
  log('2026-09-30', 'a', true),
  log('2026-10-01', 'a', true),
  log('2026-10-02', 'a', true),
  log('2026-10-04', 'a', false),
  log('2026-10-04', 'b', true),
  log('2026-10-06', 'a', true),
  log('2026-10-10', 'a', true),
  log('2026-10-10', 'b', false),
  log('2026-10-11', 'a', true),
]);
assertEqual(dayOutcome(sequence.get('2026-10-04'), '2026-10-04', '2026-10-10'), 'miss');
assertEqual(currentStreak(sequence, '2026-10-10'), 1);
assertEqual(bestStreak(sequence, '2026-10-10'), 3);
assertEqual(yearExcellence(sequence, 2026, '2026-10-10').months[8]?.count, 1);
assertEqual(yearExcellence(sequence, 2026, '2026-10-10').months[9]?.count, 3);
assertEqual(yearExcellence(sequence, 2026, '2026-10-10').months[10]?.count, null);
assertEqual(yearExcellence(sequence, 2026, '2026-10-10').months[11]?.count, null);

const bridged = marksFromLogs([
  log('2026-10-01', 'a', true),
  log('2026-10-01', 'b', true),
  log('2026-10-03', 'a', true),
]);
assertEqual(currentStreak(bridged, '2026-10-04'), 2);
assertEqual(bestStreak(bridged, '2026-10-04'), 2);

const openToday = marksFromLogs([
  log('2026-10-08', 'a', true),
  log('2026-10-09', 'a', false),
  log('2026-10-10', 'a', false),
]);
assertEqual(currentStreak(openToday, '2026-10-10'), 0);
assertEqual(bestStreak(openToday, '2026-10-10'), 1);

const october = monthCells(2026, 10);
assertEqual(october[4], '2026-10-01');
assertEqual(october.filter((cell) => cell !== null).length, 31);
assertEqual(october[34], '2026-10-31');
assertEqual(october.length % 7, 0);
assertEqual(monthCells(2024, 2).filter((cell) => cell !== null).length, 29);
assertEqual(monthCells(2025, 2).filter((cell) => cell !== null).length, 28);
assertEqual(monthCells(2026, 2).filter((cell) => cell !== null).length, 28);
assertEqual(monthCells(1900, 2).filter((cell) => cell !== null).length, 28);
assertEqual(monthCells(2000, 2).filter((cell) => cell !== null).length, 29);

const year = yearExcellence(sequence, 2026, '2026-10-10');
const summed = year.months.reduce((total, month) => total + (month.count ?? 0), 0);
assertEqual(year.total, summed);
assertEqual(year.year, 2026);

assertEqual(todayKey(new Date('2026-10-10T02:30:00.000Z')), '2026-10-09');
assertEqual(todayKey(new Date('2026-10-10T02:59:59.000Z')), '2026-10-09');
assertEqual(todayKey(new Date('2026-10-10T03:00:00.000Z')), '2026-10-10');
assertEqual(isWritableDay(todayKey()), true);
assertEqual(isWritableDay(shiftDateKey(todayKey(), -1)), false);
assertEqual(isWritableDay(shiftDateKey(todayKey(), 1)), false);

assertEqual(weekStartMonday('2026-10-12'), '2026-10-12');
assertEqual(weekStartMonday('2026-10-15'), '2026-10-12');
assertEqual(weekStartMonday('2026-10-11'), '2026-10-05');

const octoberGrid = monthGrid(2026, 10);
assertEqual(octoberGrid[0]?.dateKey, '2026-09-27');
assertEqual(octoberGrid[0]?.outside, true);
assertEqual(octoberGrid[4]?.dateKey, '2026-10-01');
assertEqual(octoberGrid[4]?.outside, false);
assertEqual(octoberGrid[octoberGrid.length - 1]?.dateKey, '2026-10-31');
assertEqual(octoberGrid[octoberGrid.length - 1]?.outside, false);

const octoberMarks = marksFromLogs([
  ...Array.from({ length: 10 }, (_, index) => log('2026-10-08', `h${index}`, true)),
  ...Array.from({ length: 10 }, (_, index) => log('2026-10-10', `h${index}`, index < 7)),
  ...Array.from({ length: 10 }, (_, index) => log('2026-10-04', `h${index}`, false)),
  log('2026-10-15', 'a', false),
  log('2026-10-16', 'a', true),
]);
const octoberScore = monthScore(octoberMarks, 2026, 10, '2026-10-15');
assertEqual(octoberScore.excellence, 1);
assertEqual(octoberScore.meta, 2);
assertEqual(octoberScore.below, 1);
assertEqual(octoberScore.eligible, 3);
assertEqual(octoberScore.percent, 67);
assertEqual(octoberScore.monthDays, 31);
assertEqual(octoberScore.monthPercent, 67);

const fourMetaDays = marksFromLogs([
  ...[1, 2, 3, 5].flatMap((day) => Array.from({ length: 10 }, (_, index) => log(`2026-10-${String(day).padStart(2, '0')}`, `h${index}`, true))),
  ...Array.from({ length: 10 }, (_, index) => log('2026-10-16', `h${index}`, true)),
  log('2026-10-20', 'a', false),
]);
const fourOfOctober = monthScore(fourMetaDays, 2026, 10, '2026-10-15');
assertEqual(fourOfOctober.meta, 4);
assertEqual(fourOfOctober.excellence, 4);
assertEqual(fourOfOctober.below, 0);
assertEqual(fourOfOctober.monthDays, 31);
assertEqual(fourOfOctober.monthPercent, 100);

const weekBars = recentWeekScores(octoberMarks, '2026-10-15');
assertEqual(weekBars.length, 4);
assertEqual(weekBars[0]?.label, 'SEM 1');
assertEqual(weekBars[3]?.label, 'SEM 4');
assertEqual(weekBars[0]?.percent, null);
assertEqual(weekBars[1]?.percent, 0);
assertEqual(weekBars[2]?.percent, 100);
assertEqual(weekBars[3]?.percent, null);
assertEqual(recentWeekScores(new Map(), '2026-10-15').every((bar) => bar.percent === null), true);

const todayLogs = marksFromLogs([
  ...Array.from({ length: 8 }, (_, index) => log('2026-10-21', `ativo-${index}`, true)),
  log('2026-10-21', 'fora-da-rotina', false),
  ...Array.from({ length: 10 }, (_, index) => log('2026-10-08', `h${index}`, index < 7)),
  ...Array.from({ length: 4 }, (_, index) => log('2026-10-04', `h${index}`, true)),
]);
assertEqual(dayOutcome(todayLogs.get('2026-10-21'), '2026-10-21', '2026-10-21'), 'keep');
const aligned = applyTodayRoutine(todayLogs, '2026-10-21', { total: 8, done: 8 });
assertEqual(dayOutcome(aligned.get('2026-10-21'), '2026-10-21', '2026-10-21'), 'star');
assertEqual(dayOutcome(aligned.get('2026-10-08'), '2026-10-08', '2026-10-21'), 'keep');
assertEqual(dayOutcome(aligned.get('2026-10-04'), '2026-10-04', '2026-10-21'), 'star');
const partial = applyTodayRoutine(todayLogs, '2026-10-21', { total: 10, done: 7 });
assertEqual(dayOutcome(partial.get('2026-10-21'), '2026-10-21', '2026-10-21'), 'keep');
const belowToday = applyTodayRoutine(todayLogs, '2026-10-21', { total: 10, done: 6 });
assertEqual(dayOutcome(belowToday.get('2026-10-21'), '2026-10-21', '2026-10-21'), 'open');
const unchanged = applyTodayRoutine(todayLogs, '2026-10-21', null);
assertEqual(unchanged.get('2026-10-21')?.planned, 9);
assertEqual(monthScore(aligned, 2026, 10, '2026-10-21').excellence, 2);

function assertGrid(year: number, month: number, days: number) {
  const grid = monthGrid(year, month);
  const inside = grid.filter((cell) => !cell.outside);
  const opening = `${year}-${String(month).padStart(2, '0')}-01`;
  assertEqual(inside.length, days);
  assertEqual(inside[0]?.dateKey, opening);
  assertEqual(grid[0]?.dateKey, shiftDateKey(opening, -weekdayIndex(opening)));
  assertEqual(grid[0]?.outside, weekdayIndex(opening) !== 0);
  assertEqual(grid.length % 7, 0);
  assertEqual(grid.filter((cell) => cell.outside).every((cell) => cell.dateKey.slice(0, 7) !== opening.slice(0, 7)), true);
}

assertGrid(2026, 10, 31);
assertGrid(2026, 4, 30);
assertGrid(2026, 6, 30);
assertGrid(2026, 2, 28);
assertGrid(2024, 2, 29);
assertGrid(2026, 12, 31);
assertGrid(2027, 1, 31);
assertEqual(shiftMonth(2026, 12, 1).year, 2027);
assertEqual(shiftMonth(2026, 12, 1).month, 1);
assertEqual(shiftMonth(2027, 1, -1).year, 2026);
assertEqual(shiftMonth(2027, 1, -1).month, 12);
assertEqual(monthGrid(2027, 1)[0]?.dateKey, '2026-12-27');
assertEqual(monthGrid(2027, 1)[0]?.outside, true);
assertEqual(monthTitle(2026, 10), 'OUTUBRO DE 2026');
assertEqual(monthTitle(2026, 2), 'FEVEREIRO DE 2026');
assertEqual(todayCursor('2026-10-14').year, 2026);
assertEqual(todayCursor('2026-10-14').month, 10);
assertEqual(goalLineFromTop(), 30);

assertEqual(activityTone({ planned: 10, done: 0 }, '2026-10-08', '2026-10-10'), 'idle');
assertEqual(activityTone(undefined, '2026-10-08', '2026-10-10'), 'idle');
assertEqual(activityTone({ planned: 5, done: 1 }, '2026-10-08', '2026-10-10'), 'below');
assertEqual(activityTone({ planned: 1000, done: 699 }, '2026-10-08', '2026-10-10'), 'below');
assertEqual(Math.round(exactDailyPercent(699, 1000) ?? 0), 70);
assertEqual(activityTone({ planned: 1000, done: 700 }, '2026-10-08', '2026-10-10'), 'meta');
assertEqual(activityTone({ planned: 10, done: 7 }, '2026-10-08', '2026-10-10'), 'meta');
assertEqual(activityTone({ planned: 20, done: 17 }, '2026-10-08', '2026-10-10'), 'meta');
assertEqual(activityTone({ planned: 1000, done: 999 }, '2026-10-08', '2026-10-10'), 'meta');
assertEqual(Math.round(exactDailyPercent(999, 1000) ?? 0), 100);
assertEqual(activityTone({ planned: 4, done: 4 }, '2026-10-08', '2026-10-10'), 'excellence');
assertEqual(activityTone({ planned: 1, done: 1 }, '2026-10-16', '2026-10-10'), 'future');
assertEqual(activityRatio({ planned: 1000, done: 699 }, '2026-10-08', '2026-10-10') != null, true);
assertEqual(activityStatus('excellence', 100), 'excelência, 100%');
assertEqual(activityStatus('below', 69.9).includes('69,9%'), true);
assertEqual(activityStatus('idle', null), 'sem atividade registrada');
assertEqual(describePercent(48.38709677419355), '48,39%');

const illustrated = new Map<string, DayMark>();
for (let day = 1; day <= 5; day += 1) {
  illustrated.set(`2026-10-${String(day).padStart(2, '0')}`, { planned: 5, done: 1 });
}
for (let day = 6; day <= 10; day += 1) {
  illustrated.set(`2026-10-${String(day).padStart(2, '0')}`, { planned: 20, done: 17 });
}
for (let day = 11; day <= 15; day += 1) {
  illustrated.set(`2026-10-${String(day).padStart(2, '0')}`, { planned: 4, done: 4 });
}
illustrated.set('2026-09-27', { planned: 1, done: 1 });
illustrated.set('2026-11-01', { planned: 1, done: 1 });
const illustratedMonth = monthActivity(illustrated, 2026, 10, '2026-10-31');
assertEqual(illustratedMonth.totalDays, 31);
assertEqual(illustratedMonth.below, 5);
assertEqual(illustratedMonth.meta, 5);
assertEqual(illustratedMonth.excellence, 5);
assertEqual(illustratedMonth.idle, 16);
assertEqual(illustratedMonth.active, 15);
assertEqual(illustratedMonth.activityPercent, 48);
assertEqual(monthActivityProblems(illustratedMonth).length, 0);
const illustratedTones = { below: 0, meta: 0, excellence: 0, idle: 0 };
for (const cell of monthGrid(2026, 10)) {
  if (cell.outside) {
    continue;
  }
  const tone = activityTone(illustrated.get(cell.dateKey), cell.dateKey, '2026-10-31');
  if (tone === 'future') {
    illustratedTones.idle += 1;
  } else {
    illustratedTones[tone] += 1;
  }
}
assertEqual(illustratedMonth.below, illustratedTones.below);
assertEqual(illustratedMonth.meta, illustratedTones.meta);
assertEqual(illustratedMonth.excellence, illustratedTones.excellence);
assertEqual(illustratedMonth.idle, illustratedTones.idle);
const openOctober = monthActivity(illustrated, 2026, 10, '2026-10-15');
assertEqual(openOctober.active, 15);
assertEqual(openOctober.idle, 16);
assertEqual(openOctober.activityPercent, 48);
assertEqual(activityTone(illustrated.get('2026-10-20'), '2026-10-20', '2026-10-15'), 'future');

let live = new Map<string, DayMark>();
assertEqual(activityTone(live.get('2026-10-10'), '2026-10-10', '2026-10-10'), 'idle');
live = applyTodayRoutine(live, '2026-10-10', { total: 10, done: 2 });
assertEqual(activityTone(live.get('2026-10-10'), '2026-10-10', '2026-10-10'), 'below');
assertEqual(monthActivity(live, 2026, 10, '2026-10-10').below, 1);
live = applyTodayRoutine(live, '2026-10-10', { total: 10, done: 7 });
assertEqual(activityTone(live.get('2026-10-10'), '2026-10-10', '2026-10-10'), 'meta');
assertEqual(monthActivity(live, 2026, 10, '2026-10-10').meta, 1);
assertEqual(monthActivity(live, 2026, 10, '2026-10-10').below, 0);
live = applyTodayRoutine(live, '2026-10-10', { total: 10, done: 10 });
assertEqual(activityTone(live.get('2026-10-10'), '2026-10-10', '2026-10-10'), 'excellence');
assertEqual(monthActivity(live, 2026, 10, '2026-10-10').excellence, 1);
live = applyTodayRoutine(live, '2026-10-10', { total: 10, done: 0 });
assertEqual(activityTone(live.get('2026-10-10'), '2026-10-10', '2026-10-10'), 'idle');
assertEqual(monthActivity(live, 2026, 10, '2026-10-10').active, 0);

const water = marksFromLogs(
  [log('2026-10-10', 'habito', true), log('2026-10-10', 'agua', true)],
  new Set(['agua']),
);
assertEqual(water.get('2026-10-10')?.planned, 1);
assertEqual(activityTone(water.get('2026-10-10'), '2026-10-10', '2026-10-10'), 'excellence');
const onlyWater = marksFromLogs([log('2026-10-10', 'agua', true)], new Set(['agua']));
assertEqual(activityTone(onlyWater.get('2026-10-10'), '2026-10-10', '2026-10-10'), 'idle');

const weekToday = '2026-10-14';
const currentWeek = weekStartMonday(weekToday);
assertEqual(currentWeek, '2026-10-12');
assertEqual(weekdayIndex(currentWeek), 1);
assertEqual(weekdayIndex(shiftDateKey(currentWeek, 6)), 0);
const weekMarks = new Map<string, DayMark>();
weekMarks.set('2026-10-12', { planned: 4, done: 4 });
weekMarks.set('2026-10-13', { planned: 10, done: 0 });
weekMarks.set('2026-10-14', { planned: 10, done: 5 });
weekMarks.set('2026-10-15', { planned: 1, done: 1 });
for (let index = 0; index < 6; index += 1) {
  weekMarks.set(shiftDateKey('2026-10-05', index), { planned: 10, done: 10 });
}
for (let index = 0; index < 7; index += 1) {
  weekMarks.set(shiftDateKey('2026-09-28', index), { planned: 10, done: 7 });
  weekMarks.set(shiftDateKey('2026-09-21', index), { planned: 1000, done: 699 });
}
const performanceBars = recentWeekAverages(weekMarks, weekToday);
assertEqual(performanceBars[0]?.start, '2026-09-21');
assertEqual(performanceBars[1]?.start, '2026-09-28');
assertEqual(performanceBars[2]?.start, '2026-10-05');
assertEqual(performanceBars[3]?.start, '2026-10-12');
assertEqual(performanceBars[0]?.label, 'SEM 1');
assertEqual(performanceBars[3]?.label, 'SEM 4');
assertEqual(performanceTone(performanceBars[0]?.ratio ?? 0), 'below');
assertEqual(performanceBars[0]?.percent, 70);
assertEqual(performanceTone(performanceBars[1]?.ratio ?? 0), 'meta');
assertEqual(performanceBars[1]?.percent, 70);
assertEqual(performanceTone(performanceBars[2]?.ratio ?? 0), 'meta');
assertEqual(performanceBars[2]?.percent, 86);
assertEqual(performanceTone(performanceBars[3]?.ratio ?? 0), 'below');
assertEqual(performanceBars[3]?.percent, 50);
assertEqual(performanceBars[3]?.ratio, 50);

const perfectWeek = new Map<string, DayMark>();
for (let index = 0; index < 7; index += 1) {
  perfectWeek.set(shiftDateKey('2026-10-05', index), { planned: 3, done: 3 });
}
const perfectBars = recentWeekAverages(perfectWeek, weekToday);
assertEqual(perfectBars[2]?.ratio, 100);
assertEqual(perfectBars[2]?.percent, 100);
assertEqual(performanceTone(perfectBars[2]?.ratio ?? 0), 'excellence');

assertEqual(weekStartMonday('2026-01-04'), '2025-12-29');
const yearTurn = new Map<string, DayMark>();
yearTurn.set('2025-12-31', { planned: 2, done: 2 });
yearTurn.set('2026-01-01', { planned: 2, done: 2 });
const turned = recentWeekAverages(yearTurn, '2026-01-04');
assertEqual(turned[3]?.start, '2025-12-29');
assertEqual(turned[3]?.ratio, 200 / 7);
assertEqual(performanceTone(turned[3]?.ratio ?? 0), 'below');
const sundayBars = recentWeekAverages(new Map(), '2026-10-11');
const mondayBars = recentWeekAverages(new Map(), '2026-10-12');
assertEqual(sundayBars[3]?.start, '2026-10-05');
assertEqual(mondayBars[3]?.start, '2026-10-12');
assertEqual(sundayBars.every((bar) => bar.ratio === null), true);
assertEqual(mondayBars.every((bar) => bar.percent === null), true);

console.log('constancy-ok');
