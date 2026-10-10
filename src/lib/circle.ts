import { shiftDateKey, weekdayIndex } from '@/lib/progress-view';

export const CIRCLE_POINTS = 10;

export const officialTaskIds = [
  'manha-agradecimento',
  'manha-banho',
  'manha-cafe',
  'manha-leitura',
  'manha-agua',
  'tarde-almoco',
  'tarde-atividade',
  'tarde-lanche',
  'tarde-assistir',
  'tarde-agua',
  'noite-jantar',
  'noite-agua',
  'noite-leitura',
  'noite-ceia',
  'noite-oracao',
] as const;

const official = new Set<string>(officialTaskIds);

export type CirclePeriod = 'semana' | 'mes' | 'ano';

export type CircleEvent = {
  taskId: string;
  occurredOn: string;
};

const monthNames = [
  'JANEIRO',
  'FEVEREIRO',
  'MARÇO',
  'ABRIL',
  'MAIO',
  'JUNHO',
  'JULHO',
  'AGOSTO',
  'SETEMBRO',
  'OUTUBRO',
  'NOVEMBRO',
  'DEZEMBRO',
];

export function isOfficialTask(taskId: string) {
  return official.has(taskId);
}

export function periodStart(kind: CirclePeriod, day: string) {
  if (kind === 'semana') {
    return shiftDateKey(day, -((weekdayIndex(day) + 6) % 7));
  }
  if (kind === 'mes') {
    return `${day.slice(0, 7)}-01`;
  }
  return `${day.slice(0, 4)}-01-01`;
}

export function periodEnd(kind: CirclePeriod, start: string) {
  if (kind === 'semana') {
    return shiftDateKey(start, 7);
  }
  if (kind === 'mes') {
    const year = Number(start.slice(0, 4));
    const month = Number(start.slice(5, 7));
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    return `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
  }
  return `${Number(start.slice(0, 4)) + 1}-01-01`;
}

export function shiftPeriod(kind: CirclePeriod, start: string, delta: number) {
  if (delta === 0) {
    return start;
  }
  const step = delta > 0 ? 1 : -1;
  let cursor = start;
  for (let index = 0; index < Math.abs(delta); index += 1) {
    cursor = step > 0 ? periodEnd(kind, cursor) : periodStart(kind, shiftDateKey(cursor, -1));
  }
  return cursor;
}

export function periodLabel(kind: CirclePeriod, start: string) {
  const end = shiftDateKey(periodEnd(kind, start), -1);
  if (kind === 'ano') {
    return start.slice(0, 4);
  }
  if (kind === 'mes') {
    const month = Number(start.slice(5, 7));
    return `${monthNames[month - 1]} DE ${start.slice(0, 4)}`;
  }
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  const endMonth = monthNames[Number(end.slice(5, 7)) - 1];
  if (sameMonth) {
    return `${Number(start.slice(8, 10))} A ${Number(end.slice(8, 10))} DE ${endMonth} DE ${end.slice(0, 4)}`;
  }
  const startMonth = monthNames[Number(start.slice(5, 7)) - 1];
  return `${Number(start.slice(8, 10))} DE ${startMonth} A ${Number(end.slice(8, 10))} DE ${endMonth} DE ${end.slice(0, 4)}`;
}

export function periodScore(events: readonly CircleEvent[], start: string, end: string) {
  const seen = new Set<string>();
  for (const event of events) {
    if (!official.has(event.taskId) || event.occurredOn < start || event.occurredOn >= end) {
      continue;
    }
    seen.add(`${event.taskId}|${event.occurredOn}`);
  }
  return seen.size * CIRCLE_POINTS;
}

const accentFrom = 'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ';
const accentTo = 'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN';

export type CircleLog = {
  catalogHabitId: string | null;
  completed: boolean;
  occurredOn: string;
};

export function publicHandleCandidate(firstName: string, userId: string, taken: ReadonlySet<string>) {
  let base = '';
  for (const char of firstName.trim()) {
    const index = accentFrom.indexOf(char);
    base += index >= 0 ? accentTo[index] : char;
  }
  base = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (base === '') {
    base = 'participante';
  }
  base = base.slice(0, 24).replace(/^-+|-+$/g, '');
  if (base === '') {
    base = 'participante';
  }
  if (!taken.has(base)) {
    return base;
  }
  const suffix = userId.replace(/-/g, '').slice(-4);
  const stem = base.slice(0, 19).replace(/-+$/g, '');
  return `${stem === '' ? 'participante' : stem}-${suffix}`;
}

export function competitionRank(scores: readonly number[]) {
  return scores.map((score) => 1 + scores.filter((other) => other > score).length);
}

export function membershipOverlapsPeriod(joinedAt: string, leftAt: string | null, start: string, end: string) {
  const startAt = `${start}T03:00:00.000Z`;
  const finishAt = `${end}T03:00:00.000Z`;
  if (joinedAt >= finishAt) {
    return false;
  }
  if (leftAt !== null && leftAt <= startAt) {
    return false;
  }
  return true;
}

export function scoreFromLogs(logs: readonly CircleLog[], start: string, end: string) {
  const seen = new Set<string>();
  for (const log of logs) {
    if (!log.completed || log.catalogHabitId === null || !official.has(log.catalogHabitId)) {
      continue;
    }
    if (log.occurredOn < start || log.occurredOn >= end) {
      continue;
    }
    seen.add(`${log.catalogHabitId}|${log.occurredOn}`);
  }
  return seen.size * CIRCLE_POINTS;
}

export function completionCreatesEvent(input: {
  operation: 'insert' | 'update';
  completed: boolean;
  occurredOn: string;
  previousOccurredOn?: string;
  today: string;
}) {
  if (!input.completed || input.occurredOn !== input.today) {
    return false;
  }
  if (input.operation === 'insert') {
    return true;
  }
  return input.previousOccurredOn === input.today;
}

export function completionRemovesEvent(completed: boolean, frozen: boolean) {
  return !completed && !frozen;
}

export function achievementTotals(results: readonly { rank: number; score: number }[]) {
  return {
    podiums: results.filter((result) => result.rank <= 3 && result.score > 0).length,
    firsts: results.filter((result) => result.rank === 1 && result.score > 0).length,
  };
}

export function honorLabel(kind: CirclePeriod, count: number, place: 'podium' | 'first') {
  if (place === 'first') {
    return count === 1 ? 'VEZ EM 1º LUGAR' : 'VEZES EM 1º LUGAR';
  }
  const noun = kind === 'semana' ? 'SEMANA' : kind === 'mes' ? 'MÊS' : 'ANO';
  const plural = kind === 'semana' ? 'SEMANAS' : kind === 'mes' ? 'MESES' : 'ANOS';
  return `${count === 1 ? noun : plural} NO PÓDIO`;
}
