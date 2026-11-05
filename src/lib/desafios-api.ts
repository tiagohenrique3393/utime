import { supabase } from '../../utils/supabase';
import {
  emptyCommitments,
  isChallengeDuration,
  isChallengePillar,
  type ChallengeCheckin,
  type ChallengeCommitment,
  type ChallengeDraft,
  type ChallengeDuration,
  type ChallengeFrequency,
  type ChallengeObligation,
  type ChallengePillar,
  type ChallengeStatus,
  type SignatureStroke,
} from '@/lib/desafios';

export type ChallengePlan = 'free' | 'premium' | 'unavailable';

export type ActiveChallenge = {
  id: string;
  status: ChallengeStatus;
  durationDays: ChallengeDuration;
  startsOn: string;
  endsOn: string;
  signedAt: string;
  clauseVersion: string;
  signatureMode: 'touch' | 'typed';
  signatureText: string;
  signatureStrokes: SignatureStroke[];
  commitments: ChallengeCommitment[];
  obligations: ChallengeObligation[];
  checkins: ChallengeCheckin[];
  failureOn: string | null;
  failurePillar: ChallengePillar | null;
  failureReason: string | null;
  concludedAt: string | null;
  rescindedAt: string | null;
};

export type ChallengeHistoryItem = {
  id: string;
  status: ChallengeStatus;
  durationDays: ChallengeDuration;
  startsOn: string;
  endsOn: string;
  signedAt: string;
  closedAt: string;
};

export type ChallengeSnapshot = {
  plan: ChallengePlan;
  today: string;
  firstName: string;
  draft: ChallengeDraft;
  active: ActiveChallenge | null;
  notice: { id: string; failedOn: string; pillar: ChallengePillar } | null;
  counts: { concluded: number; rescinded: number };
  history: ChallengeHistoryItem[];
  message: string;
};

const emptySnapshot: ChallengeSnapshot = {
  plan: 'unavailable',
  today: '',
  firstName: '',
  draft: { durationDays: null, commitments: emptyCommitments() },
  active: null,
  notice: null,
  counts: { concluded: 0, rescinded: 0 },
  history: [],
  message: '',
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function text(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function frequency(value: unknown): ChallengeFrequency {
  const item = record(value);
  const kind = item?.kind;
  if (kind === 'weekdays' && Array.isArray(item?.days)) {
    const days = item.days.filter((day): day is number => typeof day === 'number' && day >= 0 && day <= 6);
    return { kind: 'weekdays', days };
  }
  if (kind === 'weekly' && typeof item?.times === 'number') {
    return { kind: 'weekly', times: item.times };
  }
  if (kind === 'deadline' && typeof item?.date === 'string') {
    return { kind: 'deadline', date: item.date };
  }
  return { kind: 'daily' };
}

function commitments(value: unknown): ChallengeCommitment[] {
  const source = Array.isArray(value) ? value : [];
  const found = new Map<ChallengePillar, ChallengeCommitment>();
  for (const entry of source) {
    const item = record(entry);
    const pillar = text(item?.pillar);
    if (!isChallengePillar(pillar) || found.has(pillar)) {
      continue;
    }
    found.set(pillar, { pillar, text: text(item?.text), frequency: frequency(item?.frequency) });
  }
  return emptyCommitments().map((item) => found.get(item.pillar) ?? item);
}

function obligations(value: unknown): ChallengeObligation[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry) => {
    const item = record(entry);
    const pillar = text(item?.pillar);
    if (!isChallengePillar(pillar)) {
      return [];
    }
    const required = item?.requiredCount;
    return [{
      pillar,
      dueOn: text(item?.dueOn),
      windowStart: text(item?.windowStart),
      windowEnd: text(item?.windowEnd),
      requiredCount: typeof required === 'number' ? required : 1,
    }];
  });
}

function checkins(value: unknown): ChallengeCheckin[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry) => {
    const item = record(entry);
    const pillar = text(item?.pillar);
    if (!isChallengePillar(pillar) || !text(item?.date)) {
      return [];
    }
    return [{ pillar, date: text(item?.date) }];
  });
}

function strokes(value: unknown): SignatureStroke[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((stroke) => {
    if (!Array.isArray(stroke)) {
      return [];
    }
    const points = stroke.flatMap((point) => {
      const item = record(point);
      if (typeof item?.x !== 'number' || typeof item?.y !== 'number') {
        return [];
      }
      return [{ x: item.x, y: item.y }];
    });
    return [points];
  });
}

function activeContract(value: unknown): ActiveChallenge | null {
  const item = record(value);
  const duration = typeof item?.durationDays === 'number' && isChallengeDuration(item.durationDays) ? item.durationDays : null;
  if (!item || typeof item.id !== 'string' || duration == null) {
    return null;
  }
  const status = text(item.status);
  if (status !== 'active' && status !== 'concluded' && status !== 'rescinded' && status !== 'replaced') {
    return null;
  }
  return {
    id: item.id,
    status,
    durationDays: duration,
    startsOn: text(item.startsOn),
    endsOn: text(item.endsOn),
    signedAt: text(item.signedAt),
    clauseVersion: text(item.clauseVersion),
    signatureMode: item.signatureMode === 'touch' ? 'touch' : 'typed',
    signatureText: text(item.signatureText),
    signatureStrokes: strokes(item.signatureStrokes),
    commitments: commitments(item.commitments),
    obligations: obligations(item.obligations),
    checkins: checkins(item.checkins),
    failureOn: text(item.failureOn) || null,
    failurePillar: isChallengePillar(text(item.failurePillar)) ? text(item.failurePillar) as ChallengePillar : null,
    failureReason: text(item.failureReason) || null,
    concludedAt: text(item.concludedAt) || null,
    rescindedAt: text(item.rescindedAt) || null,
  };
}

function history(value: unknown): ChallengeHistoryItem[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry) => {
    const item = record(entry);
    const duration = typeof item?.durationDays === 'number' && isChallengeDuration(item.durationDays) ? item.durationDays : null;
    const status = text(item?.status);
    if (!item || typeof item.id !== 'string' || duration == null) {
      return [];
    }
    if (status !== 'active' && status !== 'concluded' && status !== 'rescinded' && status !== 'replaced') {
      return [];
    }
    return [{
      id: item.id,
      status,
      durationDays: duration,
      startsOn: text(item.startsOn),
      endsOn: text(item.endsOn),
      signedAt: text(item.signedAt),
      closedAt: text(item.closedAt),
    }];
  });
}

function snapshot(value: unknown, fallback: string): ChallengeSnapshot {
  const item = record(value);
  if (!item) {
    return { ...emptySnapshot, message: fallback };
  }
  const draft = record(item.draft);
  const duration = typeof draft?.durationDays === 'number' && isChallengeDuration(draft.durationDays) ? draft.durationDays : null;
  const notice = record(item.notice);
  const counts = record(item.counts);
  return {
    plan: item.plan === 'free' ? 'free' : 'premium',
    today: text(item.today),
    firstName: text(item.firstName),
    draft: {
      durationDays: duration,
      commitments: commitments(draft?.commitments),
    },
    active: activeContract(item.active),
    notice: notice && typeof notice.id === 'string' && isChallengePillar(text(notice.pillar))
      ? { id: notice.id, failedOn: text(notice.failedOn), pillar: text(notice.pillar) as ChallengePillar }
      : null,
    counts: {
      concluded: typeof counts?.concluded === 'number' ? counts.concluded : 0,
      rescinded: typeof counts?.rescinded === 'number' ? counts.rescinded : 0,
    },
    history: history(item.history),
    message: '',
  };
}

function failure(error: { message?: string; code?: string } | null, fallback: string) {
  const message = `${error?.code ?? ''} ${error?.message ?? ''}`.toLowerCase();
  if (message.includes('pgrst202') || message.includes('does not exist') || message.includes('42883') || message.includes('42p01')) {
    return 'Desafios ainda não está disponível nesta conta.';
  }
  if (error?.message && !message.includes('pgrst')) {
    return error.message;
  }
  return fallback;
}

export async function loadChallengeState(): Promise<ChallengeSnapshot> {
  const { data, error } = await supabase.rpc('challenge_state');
  if (error) {
    return { ...emptySnapshot, message: failure(error, 'Não foi possível carregar os desafios.') };
  }
  return snapshot(data, 'Não foi possível carregar os desafios.');
}

export async function saveChallengeDraft(draft: ChallengeDraft) {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) {
    return 'Entre na sua conta para salvar o rascunho.';
  }
  const { error } = await supabase.from('challenge_drafts').upsert(
    {
      user_id: userId,
      duration_days: draft.durationDays,
      commitments: draft.commitments,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  return error ? failure(error, 'Não foi possível guardar o rascunho.') : '';
}

export async function signChallenge(input: {
  clientKey: string;
  durationDays: ChallengeDuration;
  commitments: ChallengeCommitment[];
  signatureMode: 'touch' | 'typed';
  signatureText: string;
  signatureStrokes: SignatureStroke[];
}) {
  const { data, error } = await supabase.rpc('challenge_sign', {
    client_key: input.clientKey,
    duration_days: input.durationDays,
    commitments: input.commitments,
    signature_mode: input.signatureMode,
    signature_text: input.signatureMode === 'typed' ? input.signatureText : null,
    signature_strokes: input.signatureMode === 'touch' ? input.signatureStrokes : null,
    accepted: true,
  });
  if (error || typeof data !== 'string') {
    return { id: '', message: failure(error, 'Não foi possível assinar o contrato. Nada foi iniciado.') };
  }
  return { id: data, message: '' };
}

export async function checkInChallenge(contractId: string, pillar: ChallengePillar) {
  const { error } = await supabase.rpc('challenge_checkin', { contract_id: contractId, pillar });
  return error ? failure(error, 'Não foi possível registrar o compromisso.') : '';
}

export async function acknowledgeChallenge(contractId: string) {
  const { error } = await supabase.rpc('challenge_acknowledge', { contract_id: contractId });
  return error ? failure(error, 'Não foi possível confirmar a leitura. O aviso continua pendente.') : '';
}

export async function replaceChallenge(contractId: string) {
  const { error } = await supabase.rpc('challenge_replace', { contract_id: contractId });
  return error ? failure(error, 'Não foi possível encerrar o contrato atual.') : '';
}

export async function loadChallengeContract(contractId: string) {
  const { data, error } = await supabase.rpc('challenge_contract', { contract_id: contractId });
  if (error) {
    return { contract: null, message: failure(error, 'Não foi possível abrir o contrato.') };
  }
  return { contract: activeContract(data), message: activeContract(data) ? '' : 'Não foi possível abrir o contrato.' };
}
