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
  type HabitRelevance,
} from '@/lib/habit-catalog';
import {
  dailyPercent,
  loadHabitDayLogs,
  millisecondsUntilNextDate,
  setHabitCompleted,
  todayKey,
} from '@/lib/habit-day';
import { suggestedHabits } from '@/lib/suggested-habits';

export type DailyHabit = {
  id: string;
  userHabitId: string | null;
  catalogHabitId: string | null;
  label: string;
  period: HabitPeriod;
  pillar: HabitPillar;
  relevance: HabitRelevance | null;
};

export type DayLogRef = {
  habitId: string;
  completed: boolean;
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
let loadedLogs: DayLogRef[] = [];
let toggling = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function toDailyHabit(habit: ReturnType<typeof getUserHabits>[number]): DailyHabit {
  return {
    id: habit.id,
    userHabitId: habit.id,
    catalogHabitId: habit.catalogHabitId,
    label: habitTitle(habit, getCatalogHabits()),
    period: habit.period,
    pillar: habit.pillar,
    relevance: habit.relevance,
  };
}

function officialHabits(): DailyHabit[] {
  const saved = getUserHabits();
  return suggestedHabits.map((suggestion) => {
    const row = saved.find((habit) => habit.catalogHabitId === suggestion.id && habit.active);
    return {
      id: row?.id ?? `catalog:${suggestion.id}`,
      userHabitId: row?.id ?? null,
      catalogHabitId: suggestion.id,
      label: suggestion.label,
      period: suggestion.period,
      pillar: suggestion.pillar,
      relevance: row?.relevance ?? suggestion.relevance,
    };
  });
}

function personalHabits(): DailyHabit[] {
  return getUserHabits()
    .filter((habit) => habit.active)
    .map((habit) => toDailyHabit(habit));
}

export function habitsForDate(input: {
  dateKey: string;
  today: string;
  routine: readonly DailyHabit[];
  known: readonly DailyHabit[];
  logs: readonly DayLogRef[];
}) {
  const completedIds = input.logs.filter((row) => row.completed).map((row) => row.habitId);
  const past = input.dateKey !== '' && input.dateKey !== input.today;
  if (!past) {
    const ids = new Set(input.routine.map((habit) => habit.userHabitId).filter((id): id is string => id !== null));
    return {
      habits: [...input.routine],
      completedIds: completedIds.filter((id) => ids.has(id)),
    };
  }
  const loggedIds = new Set(input.logs.map((row) => row.habitId));
  const historical = input.known.filter((habit) => habit.userHabitId !== null && loggedIds.has(habit.userHabitId));
  if (historical.length === 0) {
    return { habits: [...input.routine], completedIds: [] as string[] };
  }
  const historicalIds = new Set(historical.map((habit) => habit.userHabitId as string));
  return {
    habits: historical,
    completedIds: completedIds.filter((id) => historicalIds.has(id)),
  };
}

function viewFor(dateKey: string) {
  return habitsForDate({
    dateKey,
    today: todayKey(),
    routine: resolveDailyHabits(),
    known: getUserHabits().map((habit) => toDailyHabit(habit)),
    logs: loadedLogs,
  });
}

function rememberLog(habitId: string, completed: boolean) {
  const index = loadedLogs.findIndex((row) => row.habitId === habitId);
  if (index >= 0) {
    loadedLogs[index] = { habitId, completed };
    return;
  }
  loadedLogs = [...loadedLogs, { habitId, completed }];
}

export function resolveDailyHabits(): DailyHabit[] {
  if (isHabitRoutinePersonalized()) {
    return personalHabits();
  }
  return officialHabits();
}

export function isDailyHabitDone(habit: DailyHabit, completed: ReadonlySet<string>) {
  if (habit.userHabitId !== null && completed.has(habit.userHabitId)) {
    return true;
  }
  return habit.userHabitId === null && habit.catalogHabitId !== null && completed.has(habit.catalogHabitId);
}

export function completedCount(habits: readonly DailyHabit[], completed: ReadonlySet<string>) {
  return habits.filter((habit) => isDailyHabitDone(habit, completed)).length;
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
    loadedLogs = [];
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
  const logs = await loadHabitDayLogs(userId, dateKey);
  if (ticket !== loadTicket || stamp !== revision || watchedUserId !== userId) {
    return;
  }
  loadedLogs = logs.rows;
  const view = viewFor(dateKey);
  publish({
    dateKey,
    habits: view.habits,
    completed: new Set(view.completedIds),
    personalized: isHabitRoutinePersonalized(),
    ready: true,
    notice: logs.ok ? '' : logs.message,
  });
}

function withCompletion(completed: ReadonlySet<string>, habit: DailyHabit, done: boolean) {
  const next = new Set(completed);
  const keys = [habit.userHabitId, habit.catalogHabitId].filter((key): key is string => key !== null);
  for (const key of keys) {
    if (done) {
      next.add(key);
    } else {
      next.delete(key);
    }
  }
  return next;
}

export async function toggleDailyHabit(habit: DailyHabit) {
  const userId = getSessionUserId();
  if (!userId || !snapshot.ready || toggling > 0) {
    return;
  }
  const dateKey = snapshot.dateKey || todayKey();
  if (!habit.userHabitId && !habit.catalogHabitId) {
    publish({ ...snapshot, notice: 'Não foi possível identificar este hábito.' });
    return;
  }
  const previousCompleted = snapshot.completed;
  const turningOn = !isDailyHabitDone(habit, previousCompleted);
  if (!habit.userHabitId && habit.catalogHabitId) {
    const catalog = getCatalogHabits();
    if (catalog.length > 0 && !catalog.some((item) => item.id === habit.catalogHabitId)) {
      publish({
        ...snapshot,
        notice: 'Não foi possível gravar. Este hábito ainda não está no catálogo.',
      });
      return;
    }
  }
  revision += 1;
  toggling += 1;
  publish({
    ...snapshot,
    completed: withCompletion(previousCompleted, habit, turningOn),
    notice: '',
  });
  try {
    let habitId = habit.userHabitId;
    if (!habitId && habit.catalogHabitId) {
      const ensured = await ensureCatalogHabit({
        id: habit.catalogHabitId,
        period: habit.period,
        pillar: habit.pillar,
        relevance: habit.relevance,
      });
      if (!ensured.ok || !ensured.habitId || watchedUserId !== userId || snapshot.dateKey !== dateKey) {
        publish({
          ...snapshot,
          dateKey,
          completed: previousCompleted,
          notice: ensured.message || 'Não foi possível gravar este hábito.',
        });
        return;
      }
      habitId = ensured.habitId;
    }
    if (!habitId) {
      publish({ ...snapshot, dateKey, completed: previousCompleted, notice: 'Não foi possível identificar este hábito.' });
      return;
    }
    const saved = await setHabitCompleted(userId, habitId, dateKey, turningOn);
    revision += 1;
    if (watchedUserId !== userId || snapshot.dateKey !== dateKey) {
      return;
    }
    if (!saved.ok) {
      const view = viewFor(dateKey);
      publish({
        ...snapshot,
        dateKey,
        habits: view.habits,
        completed: previousCompleted,
        notice: saved.message,
      });
      return;
    }
    rememberLog(habitId, turningOn);
    const view = viewFor(dateKey);
    publish({
      ...snapshot,
      dateKey,
      habits: view.habits,
      completed: new Set(view.completedIds),
      personalized: isHabitRoutinePersonalized(),
      notice: '',
    });
  } finally {
    toggling -= 1;
  }
}

subscribeHabitRoutine(() => {
  if (!snapshot.ready || toggling > 0) {
    return;
  }
  const view = viewFor(snapshot.dateKey);
  publish({
    ...snapshot,
    habits: view.habits,
    completed: new Set(view.completedIds),
    personalized: isHabitRoutinePersonalized(),
  });
});
