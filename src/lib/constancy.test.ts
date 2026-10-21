import { applyTodayRoutine, bestStreak, currentStreak, dayOutcome, keepsStreak, marksFromLogs, monthCells, monthGrid, monthScore, perfectDay, recentWeekScores, weekStartMonday, yearExcellence, type DayLog } from '@/lib/constancy';
import { isWritableDay, todayKey } from '@/lib/habit-day';
import { shiftDateKey } from '@/lib/progress-view';

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
assertEqual(octoberScore.monthPercent, 6);

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
assertEqual(fourOfOctober.monthPercent, 13);

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

console.log('constancy-ok');
