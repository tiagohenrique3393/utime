import { getSessionUserId } from '@/lib/session-user';
import {
  ensureCatalogHabit,
  getCatalogHabits,
  getUserHabits,
  habitTitle,
  hydrateHabitRoutine,
  isHabitRoutinePersonalized,
  subscribeHabitRoutine,
  type HabitPeriod,
  type HabitPillar,
} from '@/lib/habit-catalog';
import {
  dailyPercent,
  loadCompletedHabitIds,
  millisecondsUntilNextDate,
  setHabitCompleted,
  todayKey,
} from '@/lib/habit-day';
import { periods, pillars } from '@/lib/tasks';

export type DailyHabit = {
  id: string;
  userHabitId: string | null;
  catalogHabitId: string | null;
  label: string;
  period: HabitPeriod;
  pillar: HabitPillar;
};

type DailySnapshot = {
  dateKey: string;
  habits: readonly DailyHabit[];
  completed: ReadonlySet<string>;
  personalized: boolean;
  ready: boolean;
  notice: string;
};

const emptyCompleted = new Set<string>();

let snapshot: DailySnapshot = {
  dateKey: '',
  habits: [],
  completed: emptyCompleted,
  personalized: false,
  ready: false,
  notice: '',
};
let revision = 0;
let loadTicket = 0;
let watchedUserId: string | null = null;
let midnightTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

const pillarByTask = new Map<string, HabitPillar>();
for (const pillar of pillars) {
  for (const task of pillar.tasks) {
    pillarByTask.set(task.id, pillar.id);
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

function officialHabits(): DailyHabit[] {
  const saved = getUserHabits();
  return periods.flatMap((period) =>
    period.tasks.map((task) => {
      const row = saved.find((habit) => habit.catalogHabitId === task.id && habit.active);
      return {
        id: row?.id ?? `catalog:${task.id}`,
        userHabitId: row?.id ?? null,
        catalogHabitId: task.id,
        label: task.label,
        period: period.id,
        pillar: pillarByTask.get(task.id) ?? 'corpo',
      };
    }),
  );
}

function personalHabits(): DailyHabit[] {
  const catalog = getCatalogHabits();
  return getUserHabits()
    .filter((habit) => habit.active)
    .map((habit) => ({
      id: habit.id,
      userHabitId: habit.id,
      catalogHabitId: habit.catalogHabitId,
      label: habitTitle(habit, catalog),
      period: habit.period,
      pillar: habit.pillar,
    }));
}

export function resolveDailyHabits(): DailyHabit[] {
  if (isHabitRoutinePersonalized()) {
    return personalHabits();
  }
  return officialHabits();
}

export function completedCount(habits: readonly DailyHabit[], completed: ReadonlySet<string>) {
  return habits.filter((habit) => habit.userHabitId !== null && completed.has(habit.userHabitId)).length;
}

export function dailyCounts(habits: readonly DailyHabit[], completed: ReadonlySet<string>) {
  const total = habits.length;
  const done = completedCount(habits, completed);
  return { total, done, percent: dailyPercent(total, done) };
}

export function pillarDailyPercent(habits: readonly DailyHabit[], completed: ReadonlySet<string>, pillar: HabitPillar) {
  const group = habits.filter((habit) => habit.pillar === pillar);
  return dailyPercent(group.length, completedCount(group, completed));
}

function publish(next: DailySnapshot) {
  snapshot = next;
  emit();
}

export function subscribeDailyBoard(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDailyBoard() {
  return snapshot;
}

export function pauseCalendarWatch() {
  if (midnightTimer) {
    clearTimeout(midnightTimer);
    midnightTimer = null;
  }
}

export function watchCalendarDate(userId: string) {
  watchedUserId = userId;
  pauseCalendarWatch();
  midnightTimer = setTimeout(() => {
    midnightTimer = null;
    if (watchedUserId !== userId) {
      return;
    }
    void refreshDailyBoard(userId).finally(() => {
      if (watchedUserId === userId) {
        watchCalendarDate(userId);
      }
    });
  }, millisecondsUntilNextDate() + 400);
}

export async function refreshDailyBoard(userId: string, requestedDate?: string) {
  const stamp = revision;
  const ticket = ++loadTicket;
  const dateKey = requestedDate ?? todayKey();
  watchedUserId = userId;
  if (snapshot.dateKey !== dateKey) {
    publish({
      dateKey,
      habits: [],
      completed: emptyCompleted,
      personalized: isHabitRoutinePersonalized(),
      ready: false,
      notice: '',
    });
  }
  await hydrateHabitRoutine(userId);
  if (ticket !== loadTicket || stamp !== revision || watchedUserId !== userId) {
    return;
  }
  const habits = resolveDailyHabits();
  const logs = habits.length === 0 ? { ok: true as const, ids: [] as string[], message: '' } : await loadCompletedHabitIds(userId, dateKey);
  if (ticket !== loadTicket || stamp !== revision || watchedUserId !== userId) {
    return;
  }
  publish({
    dateKey,
    habits,
    completed: new Set(logs.ids),
    personalized: isHabitRoutinePersonalized(),
    ready: true,
    notice: logs.ok ? '' : logs.message,
  });
}

export async function toggleDailyHabit(habit: DailyHabit) {
  const userId = getSessionUserId();
  if (!userId || !snapshot.ready) {
    return;
  }
  const dateKey = snapshot.dateKey || todayKey();
  revision += 1;
  let habitId = habit.userHabitId;
  if (!habitId && habit.catalogHabitId) {
    const ensured = await ensureCatalogHabit({
      id: habit.catalogHabitId,
      period: habit.period,
      pillar: habit.pillar,
    });
    if (!ensured.ok || !ensured.habitId || watchedUserId !== userId) {
      publish({ ...snapshot, notice: ensured.message });
      return;
    }
    habitId = ensured.habitId;
  }
  if (!habitId) {
    return;
  }
  const completed = !snapshot.completed.has(habitId);
  const saved = await setHabitCompleted(userId, habitId, dateKey, completed);
  revision += 1;
  if (watchedUserId !== userId || snapshot.dateKey !== dateKey) {
    return;
  }
  if (!saved.ok) {
    publish({ ...snapshot, habits: resolveDailyHabits(), notice: saved.message });
    return;
  }
  const next = new Set(snapshot.completed);
  if (completed) {
    next.add(habitId);
  } else {
    next.delete(habitId);
  }
  publish({
    ...snapshot,
    habits: resolveDailyHabits(),
    completed: next,
    personalized: isHabitRoutinePersonalized(),
    notice: '',
  });
}

subscribeHabitRoutine(() => {
  if (!snapshot.ready) {
    return;
  }
  publish({
    ...snapshot,
    habits: resolveDailyHabits(),
    personalized: isHabitRoutinePersonalized(),
  });
});
