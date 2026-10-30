import { supabase } from '../../utils/supabase';
import { isAvatarPath, withAvatars } from '@/lib/avatar';
import { circleFailureMessage } from '@/lib/circle-errors';
import type { CirclePeriod, FriendRelation } from '@/lib/circle';

export type CircleState = {
  enrolled: boolean;
  handle: string;
  joinedAt: string | null;
  alta: number;
  media: number;
  baixa: number;
  ready: boolean;
  returning: boolean;
};

export type CircleEntry = {
  userId: string;
  name: string;
  handle: string;
  score: number;
  position: number;
  podiums: number;
  firsts: number;
  avatarPath?: string | null;
};

export type CirclePerson = {
  userId: string;
  name: string;
  handle: string;
  added?: boolean;
  relation: FriendRelation;
  avatarPath?: string | null;
};

export type CircleHonor = {
  kind: CirclePeriod;
  start: string;
  score: number;
  position: number;
  closedAt: string;
};

type StateRow = {
  enrolled: boolean;
  handle: string | null;
  joined_at: string | null;
  alta_count: number;
  media_count: number;
  baixa_count: number;
  ready: boolean;
  returning?: boolean;
};

type BoardRow = {
  user_id: string;
  display_name: string;
  handle: string | null;
  score: number;
  rank_position: number;
  podium_count: number;
  first_count: number;
};

type PersonRow = {
  user_id: string;
  display_name: string;
  handle: string | null;
  added?: boolean;
  relation?: string;
};

type HonorRow = {
  period_kind: CirclePeriod;
  period_start: string;
  score: number;
  rank_position: number;
  closed_at: string;
};

const emptyState = { enrolled: false, handle: '', joinedAt: null, alta: 0, media: 0, baixa: 0, ready: false, returning: false } satisfies CircleState;

function friendRelation(row: PersonRow): FriendRelation {
  if (row.relation === 'friend' || row.relation === 'sent' || row.relation === 'received' || row.relation === 'none') {
    return row.relation;
  }
  if (row.added === false) {
    return 'none';
  }
  return 'friend';
}

export { circleFailureMessage, circleUnavailable } from '@/lib/circle-errors';

export function circleErrorMessage(error: { code?: string; message?: string } | null) {
  return circleFailureMessage(error, 'load');
}

function person(row: PersonRow): CirclePerson {
  const relation = friendRelation(row);
  return {
    userId: row.user_id,
    name: row.display_name,
    handle: row.handle ?? '',
    added: relation === 'friend',
    relation,
  };
}

export async function fetchCircleState() {
  const { data, error } = await supabase.rpc('circle_state');
  if (error) {
    throw error;
  }
  const row = (Array.isArray(data) ? data[0] : data) as StateRow | null;
  if (!row) {
    return emptyState;
  }
  return {
    enrolled: row.enrolled === true,
    handle: row.handle ?? '',
    joinedAt: row.joined_at,
    alta: Number(row.alta_count) || 0,
    media: Number(row.media_count) || 0,
    baixa: Number(row.baixa_count) || 0,
    ready: row.ready === true,
    returning: row.returning === true,
  } satisfies CircleState;
}

export async function enrollCircle() {
  const { error } = await supabase.rpc('circle_enroll');
  if (error) {
    throw error;
  }
}

export async function leaveCircle() {
  const { error } = await supabase.rpc('circle_leave');
  if (error) {
    throw error;
  }
}

export async function fetchCircleBoard(kind: CirclePeriod, start: string, scope: 'todos' | 'amigos') {
  const { data, error } = await supabase.rpc('circle_board', {
    period_kind: kind,
    period_start: start,
    scope,
  });
  if (error) {
    throw error;
  }
  return ((data ?? []) as BoardRow[]).map((row) => ({
    userId: row.user_id,
    name: row.display_name,
    handle: row.handle ?? '',
    score: Number(row.score) || 0,
    position: row.rank_position,
    podiums: row.podium_count,
    firsts: row.first_count,
  })) satisfies CircleEntry[];
}

export async function searchCircle(query: string) {
  const { data, error } = await supabase.rpc('circle_search', { query });
  if (error) {
    throw error;
  }
  return ((data ?? []) as PersonRow[]).map(person);
}

export async function addCircleFriend(friendId: string) {
  const { error } = await supabase.rpc('circle_add_friend', { friend_id: friendId });
  if (error) {
    throw error;
  }
}

export async function removeCircleFriend(friendId: string) {
  const { error } = await supabase.rpc('circle_remove_friend', { friend_id: friendId });
  if (error) {
    throw error;
  }
}

export async function acceptCircleFriend(friendId: string) {
  const { error } = await supabase.rpc('circle_accept_friend', { friend_id: friendId });
  if (error) {
    throw error;
  }
}

export async function declineCircleFriend(friendId: string) {
  const { error } = await supabase.rpc('circle_decline_friend', { friend_id: friendId });
  if (error) {
    throw error;
  }
}

export async function fetchCircleHistory(kind: CirclePeriod) {
  const { data, error } = await supabase.rpc('circle_history', { kind });
  if (error) {
    throw error;
  }
  return ((data ?? []) as HonorRow[]).map((row) => ({
    kind: row.period_kind,
    start: row.period_start,
    score: Number(row.score) || 0,
    position: row.rank_position,
    closedAt: row.closed_at,
  })) satisfies CircleHonor[];
}

export async function fetchCircleFaces() {
  const { data, error } = await supabase.rpc('circle_friend_faces');
  if (error) {
    throw error;
  }
  return ((data ?? []) as PersonRow[]).map(person);
}

export async function fetchAvatarMap(ids: readonly string[]) {
  const unique = [...new Set(ids.filter(Boolean))].slice(0, 200);
  if (unique.length === 0) {
    return new Map<string, string>();
  }
  const { data, error } = await supabase.rpc('circle_avatars', { ids: unique });
  if (error) {
    return null;
  }
  const paths = new Map<string, string>();
  for (const row of (data ?? []) as { user_id?: string; avatar_path?: string | null }[]) {
    if (typeof row.user_id === 'string' && typeof row.avatar_path === 'string' && isAvatarPath(row.avatar_path)) {
      paths.set(row.user_id, row.avatar_path);
    }
  }
  return paths;
}

export function applyAvatars<T extends { userId: string; avatarPath?: string | null }>(rows: readonly T[], paths: ReadonlyMap<string, string>) {
  return withAvatars(rows, paths);
}
