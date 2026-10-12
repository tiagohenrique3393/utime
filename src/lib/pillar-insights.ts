import { clampPercent, equilibriumMean, isPercent, pillarIds, type PillarId, type PillarPercents } from '@/lib/pillar-balance';
import { insightLibrary, type InsightCategory, type InsightDraft, type InsightPeriod, type InsightRule } from '@/lib/pillar-insight-library';

export type { InsightCategory, InsightPeriod };

export type InsightFacts = {
  period: InsightPeriod;
  current: PillarPercents;
  previous: PillarPercents | null;
  partial: boolean;
  recordedDays: number;
  habits: Record<PillarId, number>;
};

export type InsightMessage = InsightDraft;

export type InsightSlot = {
  signature: string;
  messageId: string;
  seen: string[];
};

export type HabitCue = {
  pillar: PillarId;
  label: string;
  catalogHabitId: string | null;
  doneToday: boolean | null;
};

const names: Record<PillarId, string> = {
  corpo: 'Corpo',
  mente: 'Mente',
  espirito: 'Espírito',
};

const catalogAction: Record<string, string> = {
  'corpo-atividade': 'Retome um hábito de movimento.',
  'corpo-refeicao': 'Cuide de uma refeição equilibrada.',
  'corpo-hidratacao': 'Retome a meta de hidratação.',
  'corpo-higiene': 'Retome o cuidado de higiene.',
  'mente-estudo': 'Reserve um momento para estudar.',
  'mente-leitura': 'Reserve um momento para leitura.',
  'mente-prioridades': 'Defina as prioridades do dia.',
  'espirito-meditacao': 'Dedique alguns minutos à reflexão.',
  'espirito-atencao': 'Dedique atenção a alguém importante.',
  'espirito-gratidao': 'Registre algo pelo qual é grato.',
};

const neutralCue: Record<PillarId, string> = {
  corpo: 'Comece com um cuidado simples do corpo.',
  mente: 'Escolha um momento curto de estudo ou leitura.',
  espirito: 'Reserve um minuto de presença.',
};

const ownCue: Record<PillarId, string> = {
  corpo: 'Retome um hábito de corpo já cadastrado.',
  mente: 'Retome um hábito de mente já cadastrado.',
  espirito: 'Retome um hábito de espírito já cadastrado.',
};

function allFinite(values: PillarPercents) {
  return pillarIds.every((id) => isPercent(values[id]));
}

function meanOf(values: PillarPercents) {
  return equilibriumMean([values.corpo, values.mente, values.espirito]);
}

function spreadOf(values: PillarPercents) {
  if (!allFinite(values)) {
    return null;
  }
  const numbers = pillarIds.map((id) => values[id] as number);
  return Math.max(...numbers) - Math.min(...numbers);
}

function strictExtreme(values: PillarPercents, direction: 'low' | 'high') {
  if (!allFinite(values)) {
    return null;
  }
  const ranked = pillarIds.map((id) => ({ id, value: values[id] as number }));
  const mark = direction === 'low' ? Math.min(...ranked.map((item) => item.value)) : Math.max(...ranked.map((item) => item.value));
  const found = ranked.filter((item) => item.value === mark);
  return found.length === 1 ? found[0].id : null;
}

function delta(facts: InsightFacts, pillar: PillarId) {
  if (!facts.previous || !isPercent(facts.current[pillar]) || !isPercent(facts.previous[pillar])) {
    return null;
  }
  return (facts.current[pillar] as number) - (facts.previous[pillar] as number);
}

function meanDelta(facts: InsightFacts) {
  if (!facts.previous) {
    return null;
  }
  const current = meanOf(facts.current);
  const previous = meanOf(facts.previous);
  if (current == null || previous == null) {
    return null;
  }
  return current - previous;
}

export function insightRuleMatches(rule: InsightRule, facts: InsightFacts) {
  if (rule.kind === 'insufficient') {
    return facts.recordedDays === 0 || !allFinite(facts.current);
  }
  if (!allFinite(facts.current) || facts.recordedDays === 0) {
    return false;
  }
  const mean = meanOf(facts.current) ?? 0;
  const spread = spreadOf(facts.current) ?? 0;
  if (rule.kind === 'start') {
    return facts.recordedDays <= 4 && mean < 18 && spread <= 25;
  }
  if (rule.kind === 'balanced') {
    return spread <= 8 && mean >= 50;
  }
  if (rule.kind === 'gap') {
    const high = facts.current[rule.high] as number;
    const low = facts.current[rule.low] as number;
    return strictExtreme(facts.current, 'high') === rule.high && strictExtreme(facts.current, 'low') === rule.low && high - low >= 18;
  }
  if (rule.kind === 'attention') {
    const value = facts.current[rule.pillar] as number;
    return strictExtreme(facts.current, 'low') === rule.pillar && value <= 48 && spread >= 12;
  }
  if (rule.kind === 'evolving') {
    const value = facts.current[rule.pillar] as number;
    return strictExtreme(facts.current, 'high') === rule.pillar && value >= 62 && spread >= 8;
  }
  if (rule.kind === 'milestone') {
    const lowest = Math.min(...pillarIds.map((id) => facts.current[id] as number));
    return lowest >= 75 || mean >= 80;
  }
  if (rule.kind === 'reflection') {
    if (facts.period !== rule.period || facts.recordedDays < 1) {
      return false;
    }
    return rule.closed ? !facts.partial : true;
  }
  const previousMean = facts.previous ? meanOf(facts.previous) : null;
  const moved = meanDelta(facts);
  if (rule.kind === 'recovery') {
    return previousMean != null && previousMean <= 45 && moved != null && moved >= 10;
  }
  if (rule.kind === 'progress') {
    return moved != null && moved >= 6;
  }
  if (rule.kind === 'two-up') {
    const deltas = pillarIds.map((id) => delta(facts, id));
    if (deltas.some((value) => value == null)) {
      return false;
    }
    const behind = delta(facts, rule.behind) as number;
    const rising = pillarIds.filter((id) => (delta(facts, id) as number) >= 5);
    return behind <= 0 && rising.length === 2 && !rising.includes(rule.behind);
  }
  return false;
}

export function eligibleInsights(facts: InsightFacts) {
  return insightLibrary.filter((message) => message.periods.includes(facts.period) && insightRuleMatches(message.rule, facts));
}

export function insightSignature(facts: InsightFacts) {
  const pack = (values: PillarPercents | null) =>
    pillarIds.map((id) => (values && isPercent(values[id]) ? String(Math.round(clampPercent(values[id] as number))) : 'x')).join('.');
  const habits = pillarIds.map((id) => String(facts.habits[id] ?? 0)).join('.');
  return [facts.period, pack(facts.current), pack(facts.previous), facts.partial ? 'p' : 'c', String(facts.recordedDays), habits].join('|');
}

const fallbackMessage: InsightMessage = {
  id: 'base-leitura',
  category: 'dados-insuficientes',
  periods: ['dia', 'semana', 'mes', 'ano'],
  priority: 0,
  insight: 'Os registros deste período ainda não formam uma leitura estável.',
  action: 'Continue marcando apenas o que você concluir de verdade.',
  rule: { kind: 'insufficient' },
};

function ordered(messages: readonly InsightMessage[]) {
  return [...messages].sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id));
}

export function selectInsight(facts: InsightFacts, slot: InsightSlot | null) {
  const signature = insightSignature(facts);
  const eligible = eligibleInsights(facts);
  const pool = eligible.length > 0 ? eligible : [fallbackMessage];
  if (slot && slot.signature === signature) {
    const same = pool.find((message) => message.id === slot.messageId);
    if (same) {
      return { message: same, slot, changed: false as const };
    }
  }
  const ranked = ordered(pool);
  const seen = new Set(slot?.seen ?? []);
  const lastId = slot?.messageId ?? null;
  const unseen = ranked.filter((message) => message.id !== lastId && !seen.has(message.id));
  const alternate = ranked.filter((message) => message.id !== lastId);
  const pick = (unseen.length > 0 ? unseen : alternate.length > 0 ? alternate : ranked)[0] ?? fallbackMessage;
  const seenNext = [...(slot?.seen ?? []), pick.id].filter((id, index, list) => list.indexOf(id) === index).slice(-80);
  return {
    message: pick,
    changed: true as const,
    slot: { signature, messageId: pick.id, seen: seenNext },
  };
}

export function insightHeading(period: 'semana' | 'mes' | 'ano') {
  if (period === 'mes') {
    return { insight: 'Insight do mês', focus: 'Foco do mês' };
  }
  if (period === 'ano') {
    return { insight: 'Insight do ano', focus: 'Foco do ano' };
  }
  return { insight: 'Insight da semana', focus: 'Foco da semana' };
}

function actionForCue(cue: HabitCue) {
  if (cue.catalogHabitId && catalogAction[cue.catalogHabitId]) {
    return catalogAction[cue.catalogHabitId];
  }
  const label = cue.label.trim();
  if (label.length > 0 && label.length <= 42) {
    return `Retome: ${label}.`;
  }
  return ownCue[cue.pillar];
}

export function adjustAdvice(pillar: PillarId, cues: readonly HabitCue[]) {
  const mine = cues.filter((cue) => cue.pillar === pillar);
  if (mine.length === 0) {
    return neutralCue[pillar];
  }
  const pending = mine.find((cue) => cue.doneToday === false);
  if (pending) {
    return actionForCue(pending);
  }
  if (mine.every((cue) => cue.doneToday === true)) {
    return 'O essencial de hoje neste pilar já foi feito.';
  }
  return actionForCue(mine[0]);
}

export function pillarLabel(pillar: PillarId) {
  return names[pillar];
}
