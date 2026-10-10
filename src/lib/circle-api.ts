import { supabase } from '../../utils/supabase';
import type { CirclePeriod } from '@/lib/circle';

export type CircleState = {
  enrolled: boolean;
  handle: string;
  joinedAt: string | null;
};

export type CircleEntry = {
  userId: string;
  name: string;
  handle: string;
  score: number;
  position: number;
  podiums: number;
  firsts: number;
};

export type CirclePerson = {
  userId: string;
  name: string;
  handle: string;
  added?: boolean;
};

type StateRow = {
  enrolled: boolean;
  handle: string | null;
  joined_at: string | null;
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
};

function missingCircle(error: { code?: string; message?: string } | null) {
  const text = `${error?.code ?? ''} ${error?.message ?? ''}`.toLowerCase();
  return text.includes('pgrst202') || text.includes('circle_') || text.includes('could not find the function') || text.includes('schema cache');
}

export function circleUnavailable(error: { code?: string; message?: string } | null) {
  return missingCircle(error);
}

export function circleErrorMessage(error: { code?: string; message?: string } | null) {
  const text = `${error?.code ?? ''} ${error?.message ?? ''}`.toLowerCase();
  if (text.includes('friend unavailable')) {
    return 'Essa pessoa não está participando do ranking.';
  }
  if (missingCircle(error)) {
    return 'O Círculo ainda não está disponível.';
  }
  return 'Não foi possível carregar o Círculo.';
}

function person(row: PersonRow): CirclePerson {
  return {
    userId: row.user_id,
    name: row.display_name,
    handle: row.handle ?? '',
    added: row.added === true,
  };
}

export async function fetchCircleState() {
  const { data, error } = await supabase.rpc('circle_state');
  if (error) {
    throw error;
  }
  const row = (Array.isArray(data) ? data[0] : data) as StateRow | null;
  if (!row) {
    return { enrolled: false, handle: '', joinedAt: null } satisfies CircleState;
  }
  return {
    enrolled: row.enrolled === true,
    handle: row.handle ?? '',
    joinedAt: row.joined_at,
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
    score: row.score,
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

export async function fetchCircleFaces() {
  const { data, error } = await supabase.rpc('circle_friend_faces');
  if (error) {
    throw error;
  }
  return ((data ?? []) as PersonRow[]).map(person);
}
