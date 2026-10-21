export const SURVEY_VERSION = '1';
export const COMMENT_LIMIT = 2000;
export const CONFIRM_PHRASE = 'EXCLUIR';
export const REAUTH_WINDOW_MS = 5 * 60 * 1000;
export const REAUTH_RETURN_MS = 10 * 60 * 1000;

export const exitReasons = [
  { id: 'prefer_not', label: 'Prefiro não informar.' },
  { id: 'infrequent', label: 'Não utilizo o aplicativo com frequência.' },
  { id: 'features', label: 'Não gostei das funcionalidades.' },
  { id: 'premium_price', label: 'O Premium é muito caro.' },
  { id: 'other_app', label: 'Prefiro utilizar outro aplicativo.' },
  { id: 'technical', label: 'Estou enfrentando problemas técnicos.' },
  { id: 'other', label: 'Outro motivo.' },
] as const;

export type ExitReason = (typeof exitReasons)[number]['id'];

const reasonIds = new Set<string>(exitReasons.map((item) => item.id));

export function isExitReason(value: string | null | undefined): value is ExitReason {
  return typeof value === 'string' && reasonIds.has(value);
}

export function clipComment(value: string) {
  return Array.from(value).slice(0, COMMENT_LIMIT).join('');
}

export function sanitizeExitComment(value: string | null | undefined) {
  const clipped = clipComment(value ?? '').trim();
  if (!clipped) {
    return null;
  }
  const withoutEmail = clipped.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[removido]');
  const withoutPhone = withoutEmail.replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, '[removido]');
  const cleaned = withoutPhone.replace(/\s{2,}/g, ' ').trim();
  return cleaned.length > 0 ? cleaned : null;
}

export function surveyPayload(reason: ExitReason | null, comment: string) {
  return {
    reason,
    note: reason === 'other' ? sanitizeExitComment(comment) : null,
    survey_version: SURVEY_VERSION,
  };
}

export function canContinueSurvey(_reason: ExitReason | null, _comment: string) {
  return true;
}

export function phraseMatches(value: string) {
  return value.trim().toLocaleUpperCase('pt-BR') === CONFIRM_PHRASE;
}

export function isRecentSignIn(iso: string | null | undefined, now = Date.now()) {
  if (!iso) {
    return false;
  }
  const at = Date.parse(iso);
  if (Number.isNaN(at)) {
    return false;
  }
  const elapsed = now - at;
  return elapsed >= 0 && elapsed <= REAUTH_WINDOW_MS;
}

export function reauthReturnIsFresh(raw: string | null, now = Date.now()) {
  if (!raw) {
    return false;
  }
  const at = Number(raw);
  if (!Number.isFinite(at)) {
    return false;
  }
  const elapsed = now - at;
  return elapsed >= 0 && elapsed <= REAUTH_RETURN_MS;
}

export type DeletionOutcome = 'deleted' | 'unavailable' | 'denied' | 'failed';

export function deletionOutcome(error: { message?: string; code?: string } | null): DeletionOutcome {
  if (!error) {
    return 'deleted';
  }
  const code = error.code ?? '';
  const text = `${code} ${error.message ?? ''}`.toLowerCase();
  if (code === 'P0002' || text.includes('account missing')) {
    return 'deleted';
  }
  if (code === '28000' || text.includes('auth required') || text.includes('jwt')) {
    return 'denied';
  }
  if (
    code === 'PGRST202' ||
    code === '42883' ||
    text.includes('could not find the function') ||
    text.includes('schema cache')
  ) {
    return 'unavailable';
  }
  return 'failed';
}

export function deletionFailureMessage(outcome: Exclude<DeletionOutcome, 'deleted'>) {
  if (outcome === 'unavailable') {
    return 'A exclusão ainda não foi ativada no servidor. Sua conta permanece intacta.';
  }
  if (outcome === 'denied') {
    return 'Confirme sua identidade novamente. Sua conta não foi excluída.';
  }
  return 'Não foi possível excluir a conta. Nada foi apagado. Tente novamente.';
}

const accountKeyPrefixes = [
  'youtime.profile.',
  'youtime.tasks.',
  'youtime.journey.',
  'youtime.pillar-insights.',
  'utime-day-celebration:',
];

export function localKeysForAccount(userId: string, keys: readonly string[]) {
  if (!userId) {
    return [];
  }
  return keys.filter((key) => {
    if (key === `youtime.profile.${userId}` || key === `youtime.tasks.${userId}` || key === `youtime.journey.${userId}`) {
      return true;
    }
    if (key === `youtime.pillar-insights.${userId}`) {
      return true;
    }
    if (key.startsWith(`utime-day-celebration:${userId}:`)) {
      return true;
    }
    return false;
  }).filter((key) => accountKeyPrefixes.some((prefix) => key.startsWith(prefix)));
}
