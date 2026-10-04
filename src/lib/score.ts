import { DAY_COUNT, completedIdsForDay, periods, type JourneyBoard } from '@/lib/tasks';

/**
 * UTime Score is a competitive point total. It is not the personal progress percentage.
 * Each known habit completed on a journey day is worth 10 points.
 * The same habit on the same day counts once. Weights stay in step with supabase/ranking.sql.
 */
export const SCORE_WEIGHTS = {
  habit: 10,
} as const;

function habitCount(source: JourneyBoard, day: number) {
  const ids = new Set(completedIdsForDay(source, day));
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

export function utimeScore(source: JourneyBoard) {
  let habits = 0;
  for (let day = 1; day <= DAY_COUNT; day += 1) {
    habits += habitCount(source, day);
  }
  return habits * SCORE_WEIGHTS.habit;
}
