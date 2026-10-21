import { clipComment, isExitReason, reauthReturnIsFresh, type ExitReason } from '@/lib/account-deletion';

const DRAFT_KEY = 'utime.account-exit-draft';
const REAUTH_KEY = 'utime.account-delete-reauth';

export type ExitDraft = {
  reason: ExitReason | null;
  comment: string;
};

const emptyDraft: ExitDraft = { reason: null, comment: '' };
let memory: ExitDraft = emptyDraft;

function readStorage(key: string) {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // A etapa segue na memória desta aba.
  }
}

function removeStorage(key: string) {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  try {
    sessionStorage.removeItem(key);
  } catch {
    // A chave já saiu da memória.
  }
}

function parseDraft(raw: string | null): ExitDraft {
  if (!raw) {
    return emptyDraft;
  }
  try {
    const parsed = JSON.parse(raw) as { reason?: unknown; comment?: unknown };
    const reason = typeof parsed.reason === 'string' && isExitReason(parsed.reason) ? parsed.reason : null;
    const comment = typeof parsed.comment === 'string' ? clipComment(parsed.comment) : '';
    return { reason, comment };
  } catch {
    return emptyDraft;
  }
}

export function readExitDraft(): ExitDraft {
  if (memory.reason || memory.comment) {
    return memory;
  }
  memory = parseDraft(readStorage(DRAFT_KEY));
  return memory;
}

export function writeExitDraft(draft: ExitDraft) {
  memory = {
    reason: draft.reason,
    comment: clipComment(draft.comment),
  };
  writeStorage(DRAFT_KEY, JSON.stringify(memory));
}

export function clearExitDraft() {
  memory = emptyDraft;
  removeStorage(DRAFT_KEY);
  removeStorage(REAUTH_KEY);
}

export function markAccountDeletionReturn(now = Date.now()) {
  writeStorage(REAUTH_KEY, String(now));
}

export function consumeAccountDeletionReturn(now = Date.now()) {
  const raw = readStorage(REAUTH_KEY);
  removeStorage(REAUTH_KEY);
  return reauthReturnIsFresh(raw, now);
}
