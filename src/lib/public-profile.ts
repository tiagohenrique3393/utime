import { supabase } from '../../utils/supabase';
import { getSessionUserId } from '@/lib/accounts';
import { isAvatarPath } from '@/lib/avatar';
import type { FriendRelation } from '@/lib/circle';
import type { JourneyId } from '@/lib/profile';
import { handleIssue, normalizeHandle } from '@/lib/username';

export type HandleStatus = 'available' | 'taken' | 'invalid' | 'current' | 'error';

export type OwnIdentity = {
  handle: string;
  bio: string;
  bioReady: boolean;
  ok: boolean;
};

export type PublicProfile = {
  userId: string;
  name: string;
  handle: string;
  journey: JourneyId | null;
  bio: string;
  weekRank: number | null;
  podiums: number;
  firsts: number;
  relation: FriendRelation | 'self';
  avatarPath: string | null;
};

type PublicRow = {
  user_id: string;
  display_name: string;
  handle: string | null;
  journey: string | null;
  bio: string | null;
  week_rank: number | null;
  podium_count: number | null;
  first_count: number | null;
  relation: string | null;
  avatar_path: string | null;
};

function missingFunction(error: { code?: string; message?: string } | null) {
  const text = `${error?.code ?? ''} ${error?.message ?? ''}`.toLowerCase();
  return text.includes('pgrst202') || text.includes('could not find the function') || text.includes('schema cache');
}

export function identityErrorMessage(error: { code?: string; message?: string } | null) {
  const text = `${error?.code ?? ''} ${error?.message ?? ''}`.toLowerCase();
  if (text.includes('handle taken') || text.includes('23505') || text.includes('duplicate')) {
    return 'Este nome de usuário já está em uso.';
  }
  if (text.includes('invalid handle')) {
    return 'Esse nome de usuário não segue as regras.';
  }
  if (text.includes('profile missing')) {
    return 'Não foi possível encontrar o seu perfil.';
  }
  if (text.includes('invalid bio')) {
    return 'A apresentação pode ter no máximo 160 caracteres.';
  }
  if (missingFunction(error) || (text.includes('bio') && text.includes('column'))) {
    return 'Esta alteração ainda depende do SQL do perfil no Supabase.';
  }
  if (text.includes('auth required') || text.includes('jwt')) {
    return 'Sua sessão expirou. Entre novamente.';
  }
  return 'Não foi possível salvar agora.';
}

export async function loadOwnIdentity(): Promise<OwnIdentity> {
  const userId = getSessionUserId();
  if (!userId) {
    return { handle: '', bio: '', bioReady: false, ok: false };
  }
  const withBio = await supabase.from('profiles').select('public_handle,bio').eq('user_id', userId).maybeSingle();
  if (!withBio.error && withBio.data) {
    const row = withBio.data as { public_handle?: string | null; bio?: string | null };
    return {
      handle: row.public_handle ?? '',
      bio: row.bio ?? '',
      bioReady: true,
      ok: true,
    };
  }
  const handleOnly = await supabase.from('profiles').select('public_handle').eq('user_id', userId).maybeSingle();
  if (handleOnly.error || !handleOnly.data) {
    return { handle: '', bio: '', bioReady: false, ok: false };
  }
  const row = handleOnly.data as { public_handle?: string | null };
  return {
    handle: row.public_handle ?? '',
    bio: '',
    bioReady: false,
    ok: true,
  };
}

export async function checkHandle(raw: string): Promise<HandleStatus> {
  if (handleIssue(raw)) {
    return 'invalid';
  }
  const { data, error } = await supabase.rpc('profile_handle_status', { candidate: normalizeHandle(raw) });
  if (error || typeof data !== 'string') {
    return 'error';
  }
  if (data === 'available' || data === 'taken' || data === 'invalid' || data === 'current') {
    return data;
  }
  return 'error';
}

export async function saveHandle(raw: string) {
  const candidate = normalizeHandle(raw);
  if (handleIssue(candidate)) {
    return { ok: false as const, message: 'Esse nome de usuário não segue as regras.' };
  }
  const { data, error } = await supabase.rpc('profile_set_handle', { candidate });
  if (error || typeof data !== 'string') {
    return { ok: false as const, message: identityErrorMessage(error) };
  }
  return { ok: true as const, handle: data };
}

export async function saveBio(raw: string) {
  const value = raw.trim();
  if (value.length > 160) {
    return { ok: false as const, message: 'A apresentação pode ter no máximo 160 caracteres.' };
  }
  const { error } = await supabase.rpc('profile_set_bio', { value });
  if (error) {
    return { ok: false as const, message: identityErrorMessage(error) };
  }
  return { ok: true as const, bio: value };
}

function relationOf(value: string | null): PublicProfile['relation'] {
  if (value === 'self' || value === 'friend' || value === 'sent' || value === 'received' || value === 'none') {
    return value;
  }
  return 'none';
}

function journeyOf(value: string | null): JourneyId | null {
  if (value === 'metime' || value === 'womantime') {
    return value;
  }
  return null;
}

export async function fetchPublicProfile(userId: string) {
  const { data, error } = await supabase.rpc('profile_public', { target: userId });
  if (error) {
    return { ok: false as const, missing: missingFunction(error), message: identityErrorMessage(error) };
  }
  const row = (Array.isArray(data) ? data[0] : data) as PublicRow | undefined;
  if (!row?.user_id) {
    return { ok: false as const, missing: false, message: 'Perfil não encontrado.' };
  }
  const avatarPath = typeof row.avatar_path === 'string' && isAvatarPath(row.avatar_path) ? row.avatar_path : null;
  const weekRank = row.week_rank === null || row.week_rank === undefined ? null : Number(row.week_rank);
  return {
    ok: true as const,
    profile: {
      userId: row.user_id,
      name: row.display_name,
      handle: row.handle ?? '',
      journey: journeyOf(row.journey),
      bio: row.bio ?? '',
      weekRank: Number.isFinite(weekRank) ? weekRank : null,
      podiums: Number(row.podium_count) || 0,
      firsts: Number(row.first_count) || 0,
      relation: relationOf(row.relation),
      avatarPath,
    } satisfies PublicProfile,
  };
}
