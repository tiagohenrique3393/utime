import { shiftDateKey, weekdayIndex } from '@/lib/progress-view';

// Constância lê o plano gravado em habit_day_logs.
// Pelo menos 70% dos hábitos programados mantém a sequência; abaixo disso, o dia quebra.
// Exatamente 100% marca uma estrela e conta como um único dia de sequência.
// Dia sem hábito programado não é 100% e não quebra a sequência.
// O dia atual abaixo de 70%, ou ainda sem plano, continua aberto e não entra na conta.

export type DayMark = {
  planned: number;
  done: number;
};

export type DayLog = {
  dateKey: string;
  habitId: string;
  completed: boolean;
};

export type DayOutcome = 'future' | 'open' | 'empty' | 'miss' | 'keep' | 'star';

const monthLabels = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function monthLength(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function keepsStreak(done: number, planned: number) {
  return planned > 0 && done * 100 >= planned * 70;
}

export function perfectDay(done: number, planned: number) {
  return planned > 0 && done === planned;
}

function realDate(key: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    return false;
  }
  const [year, month, day] = key.split('-').map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day));
  return probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
}

export function marksFromLogs(rows: readonly DayLog[]) {
  const byDay = new Map<string, Map<string, boolean>>();
  for (const row of rows) {
    if (!realDate(row.dateKey) || !row.habitId) {
      continue;
    }
    const habits = byDay.get(row.dateKey) ?? new Map<string, boolean>();
    habits.set(row.habitId, row.completed);
    byDay.set(row.dateKey, habits);
  }
  const marks = new Map<string, DayMark>();
  for (const [key, habits] of byDay) {
    let done = 0;
    for (const completed of habits.values()) {
      if (completed) {
        done += 1;
      }
    }
    marks.set(key, { planned: habits.size, done });
  }
  return marks;
}

export function dayOutcome(mark: DayMark | null | undefined, dateKeyValue: string, today: string): DayOutcome {
  if (dateKeyValue > today) {
    return 'future';
  }
  const planned = mark?.planned ?? 0;
  const done = mark?.done ?? 0;
  if (planned <= 0) {
    return dateKeyValue === today ? 'open' : 'empty';
  }
  if (dateKeyValue === today && !keepsStreak(done, planned)) {
    return 'open';
  }
  if (perfectDay(done, planned)) {
    return 'star';
  }
  if (keepsStreak(done, planned)) {
    return 'keep';
  }
  return 'miss';
}

function counts(outcome: DayOutcome) {
  return outcome === 'keep' || outcome === 'star';
}

export function currentStreak(marks: ReadonlyMap<string, DayMark>, today: string) {
  let cursor = dayOutcome(marks.get(today), today, today) === 'open' ? shiftDateKey(today, -1) : today;
  let count = 0;
  for (let guard = 0; guard < 8000; guard += 1) {
    const outcome = dayOutcome(marks.get(cursor), cursor, today);
    if (counts(outcome)) {
      count += 1;
    } else if (outcome !== 'empty') {
      break;
    }
    cursor = shiftDateKey(cursor, -1);
  }
  return count;
}

export function bestStreak(marks: ReadonlyMap<string, DayMark>, today: string) {
  const keys = [...marks.keys()].filter((key) => key <= today).sort();
  const start = keys[0] ?? today;
  let best = 0;
  let run = 0;
  let cursor = start;
  for (let guard = 0; cursor <= today && guard < 8000; guard += 1) {
    const outcome = dayOutcome(marks.get(cursor), cursor, today);
    if (counts(outcome)) {
      run += 1;
      if (run > best) {
        best = run;
      }
    } else if (outcome === 'miss') {
      run = 0;
    }
    cursor = shiftDateKey(cursor, 1);
  }
  return best;
}

export function monthCells(year: number, month: number) {
  const first = dateKey(year, month, 1);
  const cells: (string | null)[] = [];
  for (let index = 0; index < weekdayIndex(first); index += 1) {
    cells.push(null);
  }
  const last = monthLength(year, month);
  for (let day = 1; day <= last; day += 1) {
    cells.push(dateKey(year, month, day));
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}

export function dayStatusLabel(outcome: DayOutcome) {
  if (outcome === 'star') {
    return 'Dia perfeito. Uma estrela.';
  }
  if (outcome === 'keep') {
    return 'Este dia entra na sequência.';
  }
  if (outcome === 'miss') {
    return 'Abaixo de 70%. Não entra na sequência.';
  }
  if (outcome === 'open') {
    return 'O dia ainda está em andamento.';
  }
  if (outcome === 'empty') {
    return 'Sem hábitos programados neste dia.';
  }
  return '';
}

export function yearExcellence(marks: ReadonlyMap<string, DayMark>, year: number, today: string) {
  const months = monthLabels.map((label, index) => {
    const month = index + 1;
    const opening = dateKey(year, month, 1);
    if (opening.slice(0, 7) > today.slice(0, 7)) {
      return { label, count: null as number | null };
    }
    let count = 0;
    const last = monthLength(year, month);
    for (let day = 1; day <= last; day += 1) {
      const key = dateKey(year, month, day);
      if (key > today) {
        break;
      }
      if (dayOutcome(marks.get(key), key, today) === 'star') {
        count += 1;
      }
    }
    return { label, count };
  });
  return {
    year,
    total: months.reduce((sum, month) => sum + (month.count ?? 0), 0),
    months,
  };
}
