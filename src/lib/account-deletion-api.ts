import { supabase } from '../../utils/supabase';
import {
  accessTokenIsFresh,
  avatarFolderAllowed,
  deletionMessages,
  deletionOutcome,
  isRecentSignIn,
  localKeysForAccount,
  planOwnAvatarRemoval,
  surveyPayload,
  type ExitReason,
} from '@/lib/account-deletion';
import { clearExitDraft } from '@/lib/account-deletion-draft';
import { applySessionOwner, getSessionEmail, getSessionUserId, signInWithEmail, signOut } from '@/lib/accounts';

export type AccountAccess = {
  email: string;
  password: boolean;
  google: boolean;
};

export async function getAccountAccess(): Promise<AccountAccess> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { email: '', password: false, google: false };
  }
  const providers = new Set((data.user.identities ?? []).map((identity) => identity.provider));
  const email = data.user.email ?? '';
  const google = providers.has('google');
  const password = providers.has('email') || (providers.size === 0 && email.length > 0);
  return { email, password, google };
}

function browserKeys() {
  if (typeof localStorage === 'undefined') {
    return [];
  }
  const keys: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key) {
      keys.push(key);
    }
  }
  return keys;
}

export function clearLocalAccountResidue(userId: string) {
  if (!userId || typeof localStorage === 'undefined') {
    return;
  }
  for (const key of localKeysForAccount(userId, browserKeys())) {
    localStorage.removeItem(key);
  }
}

const avatarPageSize = 100;
const avatarPageLimit = 1000;
const avatarDepthLimit = 4;
async function listAvatarFolder(prefix: string): Promise<{ ok: true; entries: { name: string; id: string | null }[] } | { ok: false }> {
  const entries: { name: string; id: string | null }[] = [];
  for (let offset = 0; offset < avatarPageLimit; offset += avatarPageSize) {
    const listed = await supabase.storage.from('avatars').list(prefix, {
      limit: avatarPageSize,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (listed.error) {
      return { ok: false };
    }
    const batch = listed.data ?? [];
    for (const item of batch) {
      if (!item.name) {
        return { ok: false };
      }
      entries.push({ name: item.name, id: item.id });
    }
    if (batch.length < avatarPageSize) {
      return { ok: true, entries };
    }
  }
  return { ok: false };
}

async function collectAvatarNames(userId: string, prefix: string, depth: number): Promise<{ ok: true; names: string[] } | { ok: false }> {
  if (!avatarFolderAllowed(userId, prefix, depth, avatarDepthLimit)) {
    return { ok: false };
  }
  const listed = await listAvatarFolder(prefix);
  if (!listed.ok) {
    return { ok: false };
  }
  const base = prefix === userId ? '' : prefix.slice(userId.length + 1);
  const names: string[] = [];
  for (const entry of listed.entries) {
    const relative = base ? `${base}/${entry.name}` : entry.name;
    if (planOwnAvatarRemoval(userId, [relative]).blocked) {
      return { ok: false };
    }
    if (entry.id === null) {
      const nested = await collectAvatarNames(userId, `${userId}/${relative}`, depth + 1);
      if (!nested.ok) {
        return { ok: false };
      }
      names.push(...nested.names);
      continue;
    }
    names.push(relative);
  }
  return { ok: true, names };
}

async function removeOwnAvatarFiles(userId: string): Promise<
  | { ok: true; removedFiles: boolean }
  | { ok: false; phase: 'before-removal' | 'partial-removal'; message: string }
> {
  const listed = await collectAvatarNames(userId, userId, 0);
  if (!listed.ok) {
    return { ok: false, phase: 'before-removal', message: deletionMessages.beforeRemoval };
  }
  const plan = planOwnAvatarRemoval(userId, listed.names);
  if (plan.blocked) {
    return { ok: false, phase: 'before-removal', message: deletionMessages.beforeRemoval };
  }
  if (plan.paths.length === 0) {
    return { ok: true, removedFiles: false };
  }
  let removedAny = false;
  for (let index = 0; index < plan.paths.length; index += avatarPageSize) {
    const batch = plan.paths.slice(index, index + avatarPageSize);
    if (batch.some((path) => !path.startsWith(`${userId}/`))) {
      return {
        ok: false,
        phase: removedAny ? 'partial-removal' : 'before-removal',
        message: removedAny ? deletionMessages.partialRemoval : deletionMessages.beforeRemoval,
      };
    }
    const removed = await supabase.storage.from('avatars').remove(batch);
    if (removed.error || !removed.data) {
      return { ok: false, phase: 'partial-removal', message: deletionMessages.partialRemoval };
    }
    removedAny = true;
  }
  const again = await collectAvatarNames(userId, userId, 0);
  if (!again.ok) {
    return { ok: false, phase: 'partial-removal', message: deletionMessages.partialRemoval };
  }
  const remaining = planOwnAvatarRemoval(userId, again.names);
  if (remaining.blocked || remaining.paths.length > 0) {
    return { ok: false, phase: 'partial-removal', message: deletionMessages.partialRemoval };
  }
  return { ok: true, removedFiles: removedAny };
}

async function assertFreshOwnSession(expectedUserId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const current = await supabase.auth.getSession();
  const currentSession = current.data.session;
  if (
    currentSession?.access_token &&
    accessTokenIsFresh(currentSession.access_token) &&
    currentSession.user.id === expectedUserId
  ) {
    applySessionOwner(expectedUserId);
    return { ok: true };
  }
  const refreshed = await supabase.auth.refreshSession();
  const session = refreshed.data.session;
  if (!session?.access_token || !accessTokenIsFresh(session.access_token) || session.user.id !== expectedUserId) {
    return {
      ok: false,
      message: 'Confirme sua identidade novamente. Nenhum arquivo foi removido e sua conta permanece.',
    };
  }
  applySessionOwner(session.user.id);
  return { ok: true };
}

async function finishDeletedSession(userId: string | null) {
  if (userId) {
    clearLocalAccountResidue(userId);
  }
  clearExitDraft();
  try {
    await signOut();
  } catch {
    await applySessionOwner(null);
  }
}

export async function deleteOwnAccount(input: {
  reason: ExitReason | null;
  comment: string;
  password: string;
  googleFresh: boolean;
}): Promise<{ ok: true } | { ok: false; phase: 'before-removal' | 'partial-removal' | 'after-removal' | 'unknown'; message: string }> {
  const identified = await supabase.auth.getUser();
  const expectedUserId = identified.data.user?.id ?? '';
  const access = await getAccountAccess();
  if (identified.error || !expectedUserId || !access.email || identified.data.user?.email !== access.email) {
    return { ok: false, phase: 'before-removal', message: deletionMessages.beforeRemoval };
  }

  if (access.password) {
    const auth = await signInWithEmail(access.email, input.password);
    if (!auth.ok) {
      return { ok: false, phase: 'before-removal', message: auth.message };
    }
  } else if (access.google) {
    const { data } = await supabase.auth.getSession();
    if (!input.googleFresh || !isRecentSignIn(data.session?.user.last_sign_in_at) || data.session?.user.id !== expectedUserId) {
      return {
        ok: false,
        phase: 'before-removal',
        message: 'Confirme com o Google nesta etapa. Nenhum arquivo foi removido e sua conta permanece.',
      };
    }
  } else {
    const auth = await signInWithEmail(access.email, input.password);
    if (!auth.ok) {
      return { ok: false, phase: 'before-removal', message: auth.message };
    }
  }

  const fresh = await assertFreshOwnSession(expectedUserId);
  if (!fresh.ok) {
    return { ok: false, phase: 'before-removal', message: fresh.message };
  }
  const userId = getSessionUserId();
  if (userId !== expectedUserId) {
    return { ok: false, phase: 'before-removal', message: deletionMessages.beforeRemoval };
  }
  const avatars = await removeOwnAvatarFiles(userId);
  if (!avatars.ok) {
    return avatars;
  }
  const payload = surveyPayload(input.reason, input.comment);
  const { error } = await supabase.rpc('delete_own_account', payload);
  const outcome = deletionOutcome(error);
  if (outcome === 'deleted') {
    await finishDeletedSession(userId);
    return { ok: true };
  }
  if (avatars.removedFiles) {
    return { ok: false, phase: 'after-removal', message: deletionMessages.afterRemoval };
  }
  return { ok: false, phase: 'before-removal', message: deletionMessages.beforeRemoval };
}

export async function sessionSignInIsRecent() {
  const { data } = await supabase.auth.getSession();
  const email = data.session?.user.email ?? (await getSessionEmail().catch(() => ''));
  return {
    email,
    recent: isRecentSignIn(data.session?.user.last_sign_in_at),
  };
}
