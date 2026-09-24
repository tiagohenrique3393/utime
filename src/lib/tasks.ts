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
  if (!taskIds.has(id)) {
    return;
  }
  if (completed.has(id)) {
    completed.delete(id);
  } else {
    completed.add(id);
  }
  snapshot = [...completed].sort();
  persistTasks();
  emit();
}

export function useCompletedTaskIds() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
