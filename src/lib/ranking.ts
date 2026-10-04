import { supabase } from '../../utils/supabase';

export type RankingEntry = {
  userId: string;
  name: string;
  score: number;
  position: number;
};

type RankingRow = {
  user_id: string;
  display_name: string;
  score: number;
  rank_position: number;
};

function isRankingRow(value: unknown): value is RankingRow {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const row = value as RankingRow;
  return (
    typeof row.user_id === 'string' &&
    typeof row.display_name === 'string' &&
    typeof row.score === 'number' &&
    typeof row.rank_position === 'number'
  );
}

export function rankingErrorMessage(error: { code?: string; message?: string }) {
  const message = (error.message ?? '').toLowerCase();
  if (error.code === 'PGRST202' || message.includes('utime_ranking') || message.includes('could not find the function')) {
    return 'O ranking ainda não está disponível.';
  }
  return 'Não foi possível carregar o ranking.';
}

export async function fetchRanking(): Promise<RankingEntry[]> {
  const { data, error } = await supabase.rpc('utime_ranking');
  if (error) {
    throw error;
  }
  if (!Array.isArray(data)) {
    return [];
  }
  return data.filter(isRankingRow).map((row) => ({
    userId: row.user_id,
    name: row.display_name,
    score: row.score,
    position: row.rank_position,
  }));
}
