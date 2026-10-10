import { shiftDateKey, weekdayIndex } from '@/lib/progress-view';
import { suggestedHabits } from '@/lib/suggested-habits';

export const personalCatalogIds = suggestedHabits.map((habit) => habit.id);

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
const personalCatalog = new Set<string>(personalCatalogIds);

export type CircleRelevance = 'alta' | 'media' | 'baixa';

export const essentialSlots = { alta: 2, media: 4, baixa: 4 } as const;
export const essentialPoints = { alta: 20, media: 10, baixa: 5 } as const;
export const extraPoints = { alta: 5, media: 2.5, baixa: 1 } as const;
export const BONUS_CAP = 10;
export const DAY_CAP = 110;

export type CirclePeriod = 'semana' | 'mes' | 'ano';

export type RankCompletion = {
  habitId: string;
  catalogHabitId: string | null;
  relevance: CircleRelevance | null;
  occurredOn: string;
  completed: boolean;
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

export function isPersonalCatalogHabit(catalogHabitId: string | null) {
  return catalogHabitId !== null && personalCatalog.has(catalogHabitId);
}

export function dayScore(counts: { alta: number; media: number; baixa: number }) {
  const alta = Math.max(0, Math.floor(counts.alta));
  const media = Math.max(0, Math.floor(counts.media));
  const baixa = Math.max(0, Math.floor(counts.baixa));
  const essential = Math.min(alta, essentialSlots.alta) * essentialPoints.alta
    + Math.min(media, essentialSlots.media) * essentialPoints.media
    + Math.min(baixa, essentialSlots.baixa) * essentialPoints.baixa;
  const bonus = Math.min(
    BONUS_CAP,
    Math.max(alta - essentialSlots.alta, 0) * extraPoints.alta
      + Math.max(media - essentialSlots.media, 0) * extraPoints.media
      + Math.max(baixa - essentialSlots.baixa, 0) * extraPoints.baixa,
  );
  return Math.min(DAY_CAP, Math.round((essential + bonus) * 10) / 10);
}

export function scoreCompletions(rows: readonly RankCompletion[], start: string, end: string) {
  const days = new Map<string, { alta: Set<string>; media: Set<string>; baixa: Set<string> }>();
  for (const row of rows) {
    if (!row.completed || row.relevance === null || isPersonalCatalogHabit(row.catalogHabitId)) {
      continue;
    }
    if (row.occurredOn < start || row.occurredOn >= end) {
      continue;
    }
    const day = days.get(row.occurredOn) ?? { alta: new Set<string>(), media: new Set<string>(), baixa: new Set<string>() };
    day[row.relevance].add(row.habitId);
    days.set(row.occurredOn, day);
  }
  let total = 0;
  for (const day of days.values()) {
    total += dayScore({ alta: day.alta.size, media: day.media.size, baixa: day.baixa.size });
  }
  return Math.round(total * 10) / 10;
}

export function requirementGaps(counts: { alta: number; media: number; baixa: number }) {
  const altaMissing = Math.max(essentialSlots.alta - Math.max(0, counts.alta), 0);
  const mediaMissing = Math.max(essentialSlots.media - Math.max(0, counts.media), 0);
  const baixaMissing = Math.max(essentialSlots.baixa - Math.max(0, counts.baixa), 0);
  return {
    altaMissing,
    mediaMissing,
    baixaMissing,
    ready: altaMissing === 0 && mediaMissing === 0 && baixaMissing === 0,
  };
}

function missingPhrase(count: number, level: string) {
  return `${count} ${count === 1 ? 'hábito' : 'hábitos'} de relevância ${level}`;
}

export function requirementMessage(counts: { alta: number; media: number; baixa: number }) {
  const gaps = requirementGaps(counts);
  if (gaps.ready) {
    return 'A rotina tem os hábitos exigidos. A entrada no ranking continua voluntária.';
  }
  const parts = [
    gaps.altaMissing > 0 ? missingPhrase(gaps.altaMissing, 'alta') : '',
    gaps.mediaMissing > 0 ? missingPhrase(gaps.mediaMissing, 'média') : '',
    gaps.baixaMissing > 0 ? missingPhrase(gaps.baixaMissing, 'baixa') : '',
  ].filter((part) => part !== '');
  const missing = gaps.altaMissing + gaps.mediaMissing + gaps.baixaMissing;
  const verb = missing === 1 ? 'Falta' : 'Faltam';
  if (parts.length === 1) {
    return `${verb} ${parts[0]}.`;
  }
  const last = parts[parts.length - 1];
  return `${verb} ${parts.slice(0, -1).join(', ')} e ${last}.`;
}

export function formatCirclePoints(score: number) {
  const rounded = Math.round(score * 10) / 10;
  if (!Number.isFinite(rounded)) {
    return '0';
  }
  if (Number.isInteger(rounded)) {
    return String(rounded);
  }
  return rounded.toFixed(1).replace('.', ',');
}

const accentFrom = 'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ';
const accentTo = 'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN';

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

export function completionCreatesEvent(input: {
  operation: 'insert' | 'update';
  completed: boolean;
  occurredOn: string;
  previousOccurredOn?: string;
  today: string;
  relevance: CircleRelevance | null;
  catalogHabitId: string | null;
}) {
  if (!input.completed || input.relevance === null || isPersonalCatalogHabit(input.catalogHabitId)) {
    return false;
  }
  if (input.occurredOn !== input.today) {
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
