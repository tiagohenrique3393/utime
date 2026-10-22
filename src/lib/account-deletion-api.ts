import { supabase } from '../../utils/supabase';
import {
  deletionFailureMessage,
  deletionOutcome,
  isRecentSignIn,
  localKeysForAccount,
  ownAvatarObjectPaths,
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

async function removeOwnAvatarFiles(userId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const names: string[] = [];
  for (let offset = 0; offset < avatarPageLimit; offset += avatarPageSize) {
    const listed = await supabase.storage.from('avatars').list(userId, {
      limit: avatarPageSize,
      offset,
    });
    if (listed.error) {
      return { ok: false, message: 'Não foi possível remover a foto de perfil. Sua conta não foi excluída.' };
    }
    const batch = listed.data ?? [];
    for (const item of batch) {
      if (item.name) {
        names.push(item.name);
      }
    }
    if (batch.length < avatarPageSize) {
      break;
    }
    if (offset + avatarPageSize >= avatarPageLimit) {
      return { ok: false, message: 'Não foi possível remover todos os arquivos da foto. Sua conta não foi excluída.' };
    }
  }

  const paths = ownAvatarObjectPaths(userId, names);
  if (paths.length === 0) {
    return { ok: true };
  }
  const removed = await supabase.storage.from('avatars').remove(paths);
  if (removed.error) {
    return { ok: false, message: 'Não foi possível remover a foto de perfil. Sua conta não foi excluída.' };
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
  return { ok: false, message: deletionFailureMessage(outcome) };
}

export async function sessionSignInIsRecent() {
  const { data } = await supabase.auth.getSession();
  const email = data.session?.user.email ?? (await getSessionEmail().catch(() => ''));
  return {
    email,
    recent: isRecentSignIn(data.session?.user.last_sign_in_at),
  };
}
