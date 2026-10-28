import { isOwnAvatarPath } from '@/lib/avatar';

export const SURVEY_VERSION = '1';
export const COMMENT_LIMIT = 2000;
export const CONFIRM_PHRASE = 'EXCLUIR';
export const REAUTH_WINDOW_MS = 5 * 60 * 1000;
export const REAUTH_RETURN_MS = 10 * 60 * 1000;
export const JWT_WINDOW_MS = 10 * 60 * 1000;

export const deletionMessages = {
  beforeRemoval: 'A exclusão foi interrompida. Nenhum arquivo foi removido e sua conta permanece.',
  partialRemoval: 'A remoção das fotos ficou incompleta. Sua conta não foi excluída. Tente novamente.',
  afterRemoval: 'As fotos foram removidas, mas a conta não foi excluída. Entre novamente e tente outra vez.',
  unknown: 'Não foi possível confirmar a exclusão. Sua conta pode continuar existindo. Entre novamente antes de tentar outra vez.',
} as const;

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
    return 'Confirme sua identidade novamente. Nenhum arquivo foi removido e sua conta permanece.';
  }
  return deletionMessages.unknown;
}

export function accessTokenIssuedAt(token: string | null | undefined) {
  if (!token) {
    return null;
  }
  const part = token.split('.')[1];
  if (!part || token.split('.').length < 2) {
    return null;
  }
  try {
    const padded = part.replace(/-/g, '+').replace(/_/g, '/');
    const base64 = padded + '='.repeat((4 - (padded.length % 4)) % 4);
    const decoded = globalThis.atob(base64);
    const payload = JSON.parse(decoded) as { iat?: unknown };
    if (typeof payload.iat !== 'number' || !Number.isFinite(payload.iat)) {
      return null;
    }
    return payload.iat * 1000;
  } catch {
    return null;
  }
}

export function accessTokenIsFresh(token: string | null | undefined, now = Date.now()) {
  const issued = accessTokenIssuedAt(token);
  if (issued === null) {
    return false;
  }
  const elapsed = now - issued;
  return elapsed >= 0 && elapsed <= JWT_WINDOW_MS;
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

function isSafeRelativePath(name: string) {
  if (!name || name.startsWith('/') || name.includes('\\') || name.includes('\0')) {
    return false;
  }
  const parts = name.split('/');
  return parts.every((part) => part.length > 0 && part !== '.' && part !== '..');
}

export function avatarFolderAllowed(userId: string, prefix: string, depth: number, depthLimit = 4) {
  if (!userId || depth > depthLimit) {
    return false;
  }
  return prefix === userId || prefix.startsWith(`${userId}/`);
}

export function planOwnAvatarRemoval(userId: string, names: readonly string[]) {
  if (!userId) {
    return { paths: [] as string[], blocked: names.length > 0 };
  }
  const paths: string[] = [];
  for (const name of names) {
    if (!isSafeRelativePath(name)) {
      return { paths: [], blocked: true };
    }
    const path = `${userId}/${name}`;
    if (!path.startsWith(`${userId}/`) || path.slice(userId.length + 1) !== name) {
      return { paths: [], blocked: true };
    }
    paths.push(path);
  }
  return { paths, blocked: false };
}

export function ownAvatarObjectPaths(userId: string, names: readonly string[]) {
  const plan = planOwnAvatarRemoval(userId, names);
  if (plan.blocked) {
    return [];
  }
  return plan.paths.filter((path) => isOwnAvatarPath(userId, path));
}
