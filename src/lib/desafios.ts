export const CHALLENGE_DURATIONS = [7, 14, 21, 30] as const;
export const CLAUSE_VERSION = 'desafios-1';
export const COMMITMENT_LIMIT = 120;
export const SIGNATURE_NAME_LIMIT = 80;
export const PILLARS = ['corpo', 'mente', 'espirito'] as const;

export type ChallengeDuration = (typeof CHALLENGE_DURATIONS)[number];
export type ChallengePillar = (typeof PILLARS)[number];
export type ChallengeStatus = 'active' | 'concluded' | 'rescinded' | 'replaced';

export type ChallengeFrequency =
  | { kind: 'daily' }
  | { kind: 'weekdays'; days: number[] }
  | { kind: 'weekly'; times: number }
  | { kind: 'deadline'; date: string };

export type ChallengeCommitment = {
  pillar: ChallengePillar;
  text: string;
  frequency: ChallengeFrequency;
};

export type ChallengeObligation = {
  pillar: ChallengePillar;
  dueOn: string;
  windowStart: string;
  windowEnd: string;
  requiredCount: number;
};

export type ChallengeCheckin = {
  pillar: ChallengePillar;
  date: string;
};

export type ChallengeDraft = {
  durationDays: ChallengeDuration | null;
  commitments: ChallengeCommitment[];
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export function isChallengeDuration(value: number | null | undefined): value is ChallengeDuration {
  return value === 7 || value === 14 || value === 21 || value === 30;
}

export function isChallengePillar(value: string | null | undefined): value is ChallengePillar {
  return value === 'corpo' || value === 'mente' || value === 'espirito';
}

export function addDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  const text = next.toISOString().slice(0, 10);
  return text;
}

export function dayDistance(start: string, end: string) {
  const [startYear, startMonth, startDay] = start.split('-').map(Number);
  const [endYear, endMonth, endDay] = end.split('-').map(Number);
  return Math.round((Date.UTC(endYear, endMonth - 1, endDay) - Date.UTC(startYear, startMonth - 1, startDay)) / 86400000);
}

export function weekday(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function contractSpan(startsOn: string, durationDays: ChallengeDuration) {
  return { startsOn, endsOn: addDays(startsOn, durationDays - 1), durationDays };
}

export function datesBetween(start: string, end: string) {
  const dates: string[] = [];
  if (!datePattern.test(start) || !datePattern.test(end) || start > end) {
    return dates;
  }
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    dates.push(cursor);
    if (dates.length > 40) {
      break;
    }
  }
  return dates;
}

function cleanDays(days: readonly number[]) {
  return [...new Set(days.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))].sort((left, right) => left - right);
}

function obligation(pillar: ChallengePillar, dueOn: string, windowStart: string, windowEnd: string, requiredCount: number): ChallengeObligation {
  return { pillar, dueOn, windowStart, windowEnd, requiredCount };
}

export function buildObligations(commitments: readonly ChallengeCommitment[], startsOn: string, durationDays: number): { ok: true; obligations: ChallengeObligation[] } | { ok: false; message: string } {
  if (!datePattern.test(startsOn) || !isChallengeDuration(durationDays)) {
    return { ok: false, message: 'Escolha uma duração de 7, 14, 21 ou 30 dias.' };
  }
  if (commitments.length !== 3) {
    return { ok: false, message: 'Informe os três compromissos.' };
  }
  const seen = new Set<ChallengePillar>();
  const obligations: ChallengeObligation[] = [];
  const span = contractSpan(startsOn, durationDays);
  for (const commitment of commitments) {
    if (!isChallengePillar(commitment.pillar) || seen.has(commitment.pillar)) {
      return { ok: false, message: 'Os três pilares são obrigatórios.' };
    }
    seen.add(commitment.pillar);
    const text = commitment.text.trim();
    if (text.length < 1 || [...text].length > COMMITMENT_LIMIT) {
      return { ok: false, message: 'Escreva cada compromisso com até 120 caracteres.' };
    }
    const frequency = commitment.frequency;
    if (frequency.kind === 'daily') {
      for (const date of datesBetween(span.startsOn, span.endsOn)) {
        obligations.push(obligation(commitment.pillar, date, date, date, 1));
      }
    } else if (frequency.kind === 'weekdays') {
      const days = cleanDays(frequency.days);
      if (days.length === 0) {
        return { ok: false, message: 'Escolha ao menos um dia da semana.' };
      }
      const matches = datesBetween(span.startsOn, span.endsOn).filter((date) => days.includes(weekday(date)));
      if (matches.length === 0) {
        return { ok: false, message: 'Nenhum dia escolhido cai dentro do período.' };
      }
      for (const date of matches) {
        obligations.push(obligation(commitment.pillar, date, date, date, 1));
      }
    } else if (frequency.kind === 'weekly') {
      if (!Number.isInteger(frequency.times) || frequency.times < 1 || frequency.times > 7) {
        return { ok: false, message: 'Informe de 1 a 7 vezes por semana.' };
      }
      let monday = addDays(span.startsOn, -((weekday(span.startsOn) + 6) % 7));
      while (monday <= span.endsOn) {
        const windowStart = monday < span.startsOn ? span.startsOn : monday;
        const sunday = addDays(monday, 6);
        const windowEnd = sunday > span.endsOn ? span.endsOn : sunday;
        if (windowStart <= windowEnd) {
          const dayCount = dayDistance(windowStart, windowEnd) + 1;
          obligations.push(obligation(commitment.pillar, windowEnd, windowStart, windowEnd, Math.min(frequency.times, dayCount)));
        }
        monday = addDays(monday, 7);
      }
    } else if (frequency.kind === 'deadline') {
      if (!datePattern.test(frequency.date) || frequency.date < span.startsOn || frequency.date > span.endsOn) {
        return { ok: false, message: 'Escolha um prazo dentro do período.' };
      }
      obligations.push(obligation(commitment.pillar, frequency.date, span.startsOn, frequency.date, 1));
    } else {
      return { ok: false, message: 'Defina a frequência de cada compromisso.' };
    }
  }
  if (seen.size !== 3) {
    return { ok: false, message: 'Informe os três compromissos.' };
  }
  return { ok: true, obligations };
}

export function emptyCommitments(): ChallengeCommitment[] {
  return PILLARS.map((pillar) => ({ pillar, text: '', frequency: { kind: 'daily' } }));
}

export type SignatureStroke = { x: number; y: number }[];

export function signatureIsValid(mode: 'touch' | 'typed', name: string, strokes: readonly SignatureStroke[]) {
  if (mode === 'typed') {
    const text = name.trim();
    return [...text].length >= 2 && [...text].length <= SIGNATURE_NAME_LIMIT;
  }
  let points = 0;
  let usable = false;
  for (const stroke of strokes) {
    if (stroke.length >= 2) {
      usable = true;
    }
    for (const point of stroke) {
      points += 1;
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) {
        return false;
      }
    }
  }
  return usable && points <= 4000;
}

export function checkinsInWindow(checkins: readonly ChallengeCheckin[], pillar: ChallengePillar, start: string, end: string) {
  return checkins.filter((item) => item.pillar === pillar && item.date >= start && item.date <= end).length;
}

export type Settlement =
  | { action: 'keep' }
  | { action: 'rescind'; pillar: ChallengePillar; failedOn: string; reason: string }
  | { action: 'conclude' };

export function settleContract(input: {
  status: ChallengeStatus;
  endsOn: string;
  obligations: readonly ChallengeObligation[];
  checkins: readonly ChallengeCheckin[];
  today: string;
}): Settlement {
  if (input.status !== 'active') {
    return { action: 'keep' };
  }
  const missed = [...input.obligations]
    .filter((item) => item.windowEnd < input.today)
    .sort((left, right) => left.windowEnd.localeCompare(right.windowEnd) || left.pillar.localeCompare(right.pillar))
    .find((item) => checkinsInWindow(input.checkins, item.pillar, item.windowStart, item.windowEnd) < item.requiredCount);
  if (missed) {
    return { action: 'rescind', pillar: missed.pillar, failedOn: missed.windowEnd, reason: 'obrigação não cumprida' };
  }
  if (input.today > input.endsOn) {
    return { action: 'conclude' };
  }
  return { action: 'keep' };
}

export function canCheckIn(input: {
  status: ChallengeStatus;
  startsOn: string;
  endsOn: string;
  pillar: ChallengePillar;
  obligations: readonly ChallengeObligation[];
  checkins: readonly ChallengeCheckin[];
  today: string;
}) {
  if (input.status !== 'active') {
    return 'Este contrato não aceita novos registros.';
  }
  if (input.today < input.startsOn || input.today > input.endsOn) {
    return 'Este dia está fora do contrato.';
  }
  const open = input.obligations.some((item) => item.pillar === input.pillar && item.windowStart <= input.today && item.windowEnd >= input.today);
  if (!open) {
    return 'Não há obrigação exigível hoje.';
  }
  if (input.checkins.some((item) => item.pillar === input.pillar && item.date === input.today)) {
    return 'Este compromisso já foi registrado hoje.';
  }
  return '';
}

export function contractDayNumber(startsOn: string, endsOn: string, today: string) {
  const total = dayDistance(startsOn, endsOn) + 1;
  if (today <= startsOn) {
    return 1;
  }
  if (today >= endsOn) {
    return total;
  }
  return dayDistance(startsOn, today) + 1;
}

export function dayMarks(startsOn: string, durationDays: ChallengeDuration, pillar: ChallengePillar, checkins: readonly ChallengeCheckin[]) {
  return datesBetween(startsOn, addDays(startsOn, durationDays - 1)).map((date) => checkins.some((item) => item.pillar === pillar && item.date === date));
}

export function formatChallengeDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-');
  if (!year || !month || !day) {
    return dateKey;
  }
  return `${day}/${month}/${year}`;
}

export function obligationSummary(pillar: ChallengePillar, obligations: readonly ChallengeObligation[]) {
  const mine = obligations.filter((item) => item.pillar === pillar);
  if (mine.length === 0) {
    return 'Nenhuma data exigível.';
  }
  const daily = mine.every((item) => item.windowStart === item.windowEnd && item.requiredCount === 1);
  if (daily) {
    return `Datas exigíveis: ${mine.map((item) => formatChallengeDate(item.dueOn)).join(', ')}.`;
  }
  return mine
    .map((item) => `${formatChallengeDate(item.windowStart)} a ${formatChallengeDate(item.windowEnd)}: ${item.requiredCount} ${item.requiredCount === 1 ? 'registro' : 'registros'}.`)
    .join(' ');
}

export function applySettlement<T extends { status: ChallengeStatus }>(contract: T, settlement: Settlement, seenAt: string) {
  if (settlement.action === 'keep') {
    return contract;
  }
  if (settlement.action === 'conclude') {
    return { ...contract, status: 'concluded' as const, concludedAt: seenAt };
  }
  return {
    ...contract,
    status: 'rescinded' as const,
    rescindedAt: seenAt,
    failureOn: settlement.failedOn,
    failurePillar: settlement.pillar,
    failureReason: settlement.reason,
  };
}
