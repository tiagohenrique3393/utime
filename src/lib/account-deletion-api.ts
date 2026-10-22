import { supabase } from '../../utils/supabase';
import {
  avatarFolderAllowed,
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
const photoError = 'Não foi possível remover a foto de perfil. Sua conta não foi excluída.';

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

async function removeOwnAvatarFiles(userId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const listed = await collectAvatarNames(userId, userId, 0);
  if (!listed.ok) {
    return { ok: false, message: photoError };
  }
  const plan = planOwnAvatarRemoval(userId, listed.names);
  if (plan.blocked) {
    return { ok: false, message: photoError };
  }
  for (let index = 0; index < plan.paths.length; index += avatarPageSize) {
    const batch = plan.paths.slice(index, index + avatarPageSize);
    if (batch.some((path) => !path.startsWith(`${userId}/`))) {
      return { ok: false, message: photoError };
    }
    const removed = await supabase.storage.from('avatars').remove(batch);
    if (removed.error || !removed.data) {
      return { ok: false, message: photoError };
    }
  }
  const again = await collectAvatarNames(userId, userId, 0);
  if (!again.ok) {
    return { ok: false, message: photoError };
  }
  const remaining = planOwnAvatarRemoval(userId, again.names);
  if (remaining.blocked || remaining.paths.length > 0) {
    return { ok: false, message: photoError };
  }
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
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const access = await getAccountAccess();
  if (!access.email) {
    return { ok: false, message: 'Entre novamente na sua conta. Nada foi excluído.' };
  }

  if (access.password) {
    const auth = await signInWithEmail(access.email, input.password);
    if (!auth.ok) {
      return { ok: false, message: auth.message };
    }
  } else if (access.google) {
    const { data } = await supabase.auth.getSession();
    if (!input.googleFresh || !isRecentSignIn(data.session?.user.last_sign_in_at)) {
      return { ok: false, message: 'Confirme com o Google nesta etapa. Sua conta não foi excluída.' };
    }
  } else {
    const auth = await signInWithEmail(access.email, input.password);
    if (!auth.ok) {
      return { ok: false, message: auth.message };
    }
  }

  const userId = getSessionUserId();
  if (!userId) {
    return { ok: false, message: 'Entre novamente na sua conta. Nada foi excluído.' };
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
  return { ok: false, message: 'Não foi possível concluir a exclusão. A conta não foi excluída.' };
}

export async function sessionSignInIsRecent() {
  const { data } = await supabase.auth.getSession();
  const email = data.session?.user.email ?? (await getSessionEmail().catch(() => ''));
  return {
    email,
    recent: isRecentSignIn(data.session?.user.last_sign_in_at),
  };
}
