import { DAY_COUNT, completedIdsForDay, periods, type JourneyBoard } from '@/lib/tasks';

/**
 * UTime Score is a competitive point total. It is not the personal progress percentage.
 * Weights are mirrored in supabase/ranking.sql and must stay in step with that function.
 */
export const SCORE_WEIGHTS = {
  habit: 10,
  period: 25,
  activeDay: 20,
  streakDay: 30,
} as const;

function idsForDay(source: JourneyBoard, day: number) {
  return new Set(completedIdsForDay(source, day));
}

function habitCount(source: JourneyBoard, day: number) {
  const ids = idsForDay(source, day);
  let count = 0;
  for (const period of periods) {
    for (const task of period.tasks) {
      if (ids.has(task.id)) {
        count += 1;
      }
    }
  }
  return count;
}

function fulfilledPeriodCount(source: JourneyBoard, day: number) {
  const ids = idsForDay(source, day);
  let count = 0;
  for (const period of periods) {
    if (period.tasks.every((task) => ids.has(task.id))) {
      count += 1;
    }
  }
  return count;
}

export function longestActiveStreak(source: JourneyBoard) {
  let longest = 0;
  let current = 0;
  for (let day = 1; day <= DAY_COUNT; day += 1) {
    if (habitCount(source, day) > 0) {
      current += 1;
      if (current > longest) {
        longest = current;
      }
    } else {
      current = 0;
    }
  }
  return longest;
}

export function utimeScore(source: JourneyBoard) {
  let habits = 0;
  let periodsDone = 0;
  let activeDays = 0;
  for (let day = 1; day <= DAY_COUNT; day += 1) {
    const count = habitCount(source, day);
    habits += count;
    if (count > 0) {
      activeDays += 1;
    }
    periodsDone += fulfilledPeriodCount(source, day);
  }
  const streak = longestActiveStreak(source);
  return (
    habits * SCORE_WEIGHTS.habit +
    periodsDone * SCORE_WEIGHTS.period +
    activeDays * SCORE_WEIGHTS.activeDay +
    streak * SCORE_WEIGHTS.streakDay
  );
}
