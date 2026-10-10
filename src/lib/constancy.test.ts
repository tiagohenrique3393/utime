import { bestStreak, currentStreak, dayOutcome, keepsStreak, marksFromLogs, monthCells, perfectDay, yearExcellence, type DayLog } from '@/lib/constancy';
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

console.log('constancy-ok');
