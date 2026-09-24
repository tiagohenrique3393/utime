import { useSyncExternalStore } from 'react';

export type TaskPeriod = {
  id: 'manha' | 'tarde' | 'noite';
  title: string;
  tasks: { id: string; label: string }[];
};

export const periods: TaskPeriod[] = [
  {
    id: 'manha',
    title: 'Manhã',
    tasks: [
      { id: 'manha-agradecimento', label: 'Agradecimento e organização' },
      { id: 'manha-banho', label: 'Tomar um banho' },
      { id: 'manha-cafe', label: 'Tomar um café' },
      { id: 'manha-leitura', label: 'Leitura e reflexão' },
      { id: 'manha-agua', label: 'Beber 1 L de água' },
    ],
  },
  {
    id: 'tarde',
    title: 'Tarde',
    tasks: [
      { id: 'tarde-almoco', label: 'Almoçar' },
      { id: 'tarde-atividade', label: 'Realizar atividade física' },
      { id: 'tarde-lanche', label: 'Lanche da tarde' },
      { id: 'tarde-assistir', label: 'Assistir algo produtivo' },
      { id: 'tarde-agua', label: 'Beber 1 L de água' },
    ],
  },
  {
    id: 'noite',
    title: 'Noite',
    tasks: [
      { id: 'noite-jantar', label: 'Jantar' },
      { id: 'noite-agua', label: 'Beber 1 L de água' },
      { id: 'noite-leitura', label: 'Leitura e reflexão' },
      { id: 'noite-ceia', label: 'Ceia' },
      { id: 'noite-oracao', label: 'Oração e organização' },
    ],
  },
];

export const TASK_TOTAL = periods.reduce((sum, period) => sum + period.tasks.length, 0);

export type PillarId = 'corpo' | 'mente' | 'espirito';

export const pillars: {
  id: PillarId;
  label: string;
  text: string;
  tasks: { id: string; label: string }[];
}[] = [
  {
    id: 'corpo',
    label: 'Corpo',
    text: 'Cuide da sua energia, da sua saúde e da sua capacidade de agir.',
    tasks: [
      { id: 'manha-banho', label: 'Tomar um banho' },
      { id: 'manha-cafe', label: 'Tomar um café' },
      { id: 'manha-agua', label: 'Beber 1 L de água da manhã' },
      { id: 'tarde-almoco', label: 'Almoçar' },
      { id: 'tarde-atividade', label: 'Realizar atividade física' },
      { id: 'tarde-lanche', label: 'Lanche da tarde' },
      { id: 'tarde-agua', label: 'Beber 1 L de água da tarde' },
      { id: 'noite-jantar', label: 'Jantar' },
      { id: 'noite-agua', label: 'Beber 1 L de água da noite' },
      { id: 'noite-ceia', label: 'Ceia' },
    ],
  },
  {
    id: 'mente',
    label: 'Mente',
    text: 'Fortaleça seus pensamentos, seu conhecimento e suas decisões.',
    tasks: [
      { id: 'manha-leitura', label: 'Leitura e reflexão da manhã' },
      { id: 'tarde-assistir', label: 'Assistir algo produtivo' },
      { id: 'noite-leitura', label: 'Leitura e reflexão da noite' },
    ],
  },
  {
    id: 'espirito',
    label: 'Espírito',
    text: 'Reserve tempo para a fé, a gratidão e o seu propósito.',
    tasks: [
      { id: 'manha-agradecimento', label: 'Agradecimento e organização' },
      { id: 'noite-oracao', label: 'Oração e organização' },
    ],
  },
];

export function pillarStats(completedIds: readonly string[], pillarId: PillarId) {
  const pillar = pillars.find((item) => item.id === pillarId);
  const tasks = pillar?.tasks ?? [];
  const done = tasks.filter((task) => completedIds.includes(task.id)).length;
  return {
    done,
    total: tasks.length,
    percent: tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100),
  };
}

const taskIds = new Set(periods.flatMap((period) => period.tasks.map((task) => task.id)));

const STORAGE_KEY = 'youtime.preview.tasks';
const emptySnapshot: readonly string[] = [];

let completed = new Set<string>();
let snapshot: readonly string[] = emptySnapshot;
let restored = false;
const listeners = new Set<() => void>();

function persistTasks() {
  try {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // A prévia nativa guarda as tarefas só na memória da sessão.
  }
}

function restoreTasks() {
  if (restored) {
    return;
  }
  restored = true;
  try {
    if (typeof localStorage === 'undefined') {
      return;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return;
    }
    const ids = parsed.filter((id): id is string => typeof id === 'string' && taskIds.has(id));
    completed = new Set(ids);
    snapshot = [...completed].sort();
  } catch {
    completed = new Set();
    snapshot = emptySnapshot;
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  restoreTasks();
  return snapshot;
}

function getServerSnapshot() {
  return emptySnapshot;
}

export function progressPercent(completedCount: number) {
  return Math.round((completedCount / TASK_TOTAL) * 100);
}

export function toggleTask(id: string) {
  restoreTasks();
  restoreJourney();
  if (!taskIds.has(id)) {
    return;
  }
  if (completed.has(id)) {
    completed.delete(id);
  } else {
    completed.add(id);
  }
  snapshot = [...completed].sort();
  board = { ...board, dayOne: snapshot };
  persistTasks();
  emit();
  emitBoard();
}

export function useCompletedTaskIds() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export const DAY_COUNT = 30;

export type DayStatus = 'locked' | 'green' | 'yellow' | 'red';

export type JourneyBoard = {
  dayOne: readonly string[];
  tasksByDay: Readonly<Record<string, readonly string[]>>;
  started: readonly number[];
  testMode: boolean;
};

const JOURNEY_KEY = 'youtime.preview.journey';

const serverBoard: JourneyBoard = {
  dayOne: emptySnapshot,
  tasksByDay: {},
  started: [1],
  testMode: false,
};

let board: JourneyBoard = serverBoard;
let journeyRestored = false;
const boardListeners = new Set<() => void>();

function emitBoard() {
  boardListeners.forEach((listener) => listener());
}

function persistJourney() {
  try {
    if (typeof localStorage === 'undefined') {
      return;
    }
    const tasks: Record<string, readonly string[]> = {};
    for (const [day, ids] of Object.entries(board.tasksByDay)) {
      if (ids.length > 0) {
        tasks[day] = ids;
      }
    }
    localStorage.setItem(
      JOURNEY_KEY,
      JSON.stringify({
        testMode: board.testMode,
        started: board.started.filter((day) => day !== 1),
        tasks,
      }),
    );
  } catch {
    // A prévia nativa guarda a jornada só na memória da sessão.
  }
}

function withDayOne(days: number[]) {
  return days.includes(1) ? [...days].sort((a, b) => a - b) : [1, ...days].sort((a, b) => a - b);
}

function restoreJourney() {
  if (journeyRestored) {
    return;
  }
  journeyRestored = true;

  let testMode = false;
  let started: number[] = [];
  let tasksByDay: Record<string, readonly string[]> = {};

  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(JOURNEY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          testMode?: unknown;
          started?: unknown;
          tasks?: unknown;
        };
        testMode = parsed.testMode === true;
        if (Array.isArray(parsed.started)) {
          started = parsed.started.filter(
            (day): day is number => typeof day === 'number' && day >= 2 && day <= DAY_COUNT,
          );
        }
        if (parsed.tasks && typeof parsed.tasks === 'object') {
          for (const [day, ids] of Object.entries(parsed.tasks as Record<string, unknown>)) {
            const dayNumber = Number(day);
            if (!Number.isInteger(dayNumber) || dayNumber < 2 || dayNumber > DAY_COUNT || !Array.isArray(ids)) {
              continue;
            }
            tasksByDay[day] = ids.filter((id): id is string => typeof id === 'string' && taskIds.has(id)).sort();
          }
        }
      }
    }
  } catch {
    testMode = false;
    started = [];
    tasksByDay = {};
  }

  board = {
    dayOne: snapshot,
    tasksByDay,
    started: withDayOne(started),
    testMode: __DEV__ && testMode,
  };
}

function subscribeBoard(listener: () => void) {
  boardListeners.add(listener);
  return () => boardListeners.delete(listener);
}

function getBoardSnapshot() {
  restoreTasks();
  restoreJourney();
  return board;
}

function getBoardServerSnapshot() {
  return serverBoard;
}

export function useJourneyBoard() {
  return useSyncExternalStore(subscribeBoard, getBoardSnapshot, getBoardServerSnapshot);
}

export function isDayUnlocked(day: number, testMode: boolean) {
  if (day === 1) {
    return true;
  }
  return day >= 2 && day <= DAY_COUNT && __DEV__ && testMode;
}

export function dayStatus(percent: number, locked: boolean): DayStatus {
  if (locked) {
    return 'locked';
  }
  if (percent >= 70) {
    return 'green';
  }
  if (percent >= 51) {
    return 'yellow';
  }
  return 'red';
}

export function completedIdsForDay(source: JourneyBoard, day: number) {
  if (day === 1) {
    return source.dayOne;
  }
  return source.tasksByDay[String(day)] ?? emptySnapshot;
}

export function dayProgress(source: JourneyBoard, day: number) {
  return progressPercent(completedIdsForDay(source, day).length);
}

export function overallProgress(source: JourneyBoard) {
  const days = source.started.filter((day) => isDayUnlocked(day, source.testMode));
  if (days.length === 0) {
    return 0;
  }
  const total = days.reduce((sum, day) => sum + dayProgress(source, day), 0);
  return Math.round(total / days.length);
}

export function completedDayCount(source: JourneyBoard) {
  let count = 0;
  for (let day = 1; day <= DAY_COUNT; day += 1) {
    if (isDayUnlocked(day, source.testMode) && dayProgress(source, day) === 100) {
      count += 1;
    }
  }
  return count;
}

export function markDayStarted(day: number) {
  restoreTasks();
  restoreJourney();
  if (!isDayUnlocked(day, board.testMode) || board.started.includes(day)) {
    return;
  }
  board = { ...board, started: withDayOne([...board.started, day]) };
  persistJourney();
  emitBoard();
}

export function setTestMode(enabled: boolean) {
  if (!__DEV__) {
    return;
  }
  restoreTasks();
  restoreJourney();
  if (board.testMode === enabled) {
    return;
  }
  board = { ...board, testMode: enabled };
  persistJourney();
  emitBoard();
}

export function toggleDayTask(day: number, id: string) {
  if (day === 1) {
    toggleTask(id);
    return;
  }
  restoreTasks();
  restoreJourney();
  if (!isDayUnlocked(day, board.testMode) || !taskIds.has(id)) {
    return;
  }
  const key = String(day);
  const current = new Set(board.tasksByDay[key] ?? []);
  if (current.has(id)) {
    current.delete(id);
  } else {
    current.add(id);
  }
  const nextIds = [...current].sort();
  const tasksByDay = { ...board.tasksByDay };
  if (nextIds.length === 0) {
    delete tasksByDay[key];
  } else {
    tasksByDay[key] = nextIds;
  }
  board = {
    ...board,
    tasksByDay,
    started: board.started.includes(day) ? board.started : withDayOne([...board.started, day]),
  };
  persistJourney();
  emitBoard();
}
