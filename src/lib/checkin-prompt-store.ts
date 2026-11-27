import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '../../utils/supabase';
import { checkinPromptKey, type CheckinKind, type CheckinPromptStatus } from '@/lib/checkin-flow';
import type { MoodPeriod } from '@/lib/mood-score';

type PromptRecord = {
  status: CheckinPromptStatus;
  localDate: string;
  kind: CheckinKind;
  periodKey: string;
};

const memory = new Map<string, PromptRecord>();

function periodKeyFor(kind: CheckinKind, period: MoodPeriod | null) {
  return kind === 'mood' && period ? period : '';
}

function storageKey(userId: string, key: string) {
  return `utime:checkin-prompt:${userId}:${key}`;
}

function missingTable(error: { message?: string; code?: string } | null) {
  const text = `${error?.code ?? ''} ${error?.message ?? ''}`.toLowerCase();
  return (
    text.includes('checkin_prompt_state') ||
    text.includes('pgrst205') ||
    text.includes('42p01') ||
    text.includes('does not exist') ||
    text.includes('schema cache')
  );
}

export function promptStatusSnapshot(
  userId: string,
  kind: CheckinKind,
  localDate: string,
  period: MoodPeriod | null = null,
): CheckinPromptStatus | null {
  const key = checkinPromptKey(kind, localDate, period);
  return memory.get(`${userId}:${key}`)?.status ?? null;
}

export function isPromptClosed(
  userId: string,
  kind: CheckinKind,
  localDate: string,
  period: MoodPeriod | null = null,
) {
  const status = promptStatusSnapshot(userId, kind, localDate, period);
  return status === 'answered' || status === 'dismissed';
}

export async function loadPromptState(
  userId: string,
  kind: CheckinKind,
  localDate: string,
  period: MoodPeriod | null = null,
) {
  const key = checkinPromptKey(kind, localDate, period);
  const memKey = `${userId}:${key}`;
  if (memory.has(memKey)) {
    return memory.get(memKey)!;
  }
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId, key));
    if (raw) {
      const parsed = JSON.parse(raw) as PromptRecord;
      if (parsed?.status) {
        memory.set(memKey, parsed);
        return parsed;
      }
    }
  } catch {
    // fallback remoto
  }
  const periodKey = periodKeyFor(kind, period);
  const { data, error } = await supabase
    .from('checkin_prompt_state')
    .select('status, local_date, kind, period_key')
    .eq('user_id', userId)
    .eq('kind', kind)
    .eq('local_date', localDate)
    .eq('period_key', periodKey)
    .maybeSingle();
  if (error && !missingTable(error)) {
    return null;
  }
  if (data && typeof (data as { status?: string }).status === 'string') {
    const row = data as { status: CheckinPromptStatus; local_date: string; kind: CheckinKind; period_key: string };
    const record: PromptRecord = {
      status: row.status,
      localDate: row.local_date,
      kind: row.kind,
      periodKey: row.period_key ?? '',
    };
    memory.set(memKey, record);
    return record;
  }
  return null;
}

export async function rememberPromptState(
  userId: string,
  kind: CheckinKind,
  localDate: string,
  status: CheckinPromptStatus,
  period: MoodPeriod | null = null,
) {
  const key = checkinPromptKey(kind, localDate, period);
  const memKey = `${userId}:${key}`;
  const periodKey = periodKeyFor(kind, period);
  const record: PromptRecord = { status, localDate, kind, periodKey };
  memory.set(memKey, record);
  try {
    await AsyncStorage.setItem(storageKey(userId, key), JSON.stringify(record));
  } catch {
    // memória local basta para a sessão
  }
  const payload = {
    user_id: userId,
    kind,
    local_date: localDate,
    period_key: periodKey,
    status,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('checkin_prompt_state').upsert(payload, {
    onConflict: 'user_id,kind,local_date,period_key',
  });
  if (error && !missingTable(error)) {
    return { ok: false as const, message: 'Não foi possível registrar o prompt.' };
  }
  return { ok: true as const, message: '' };
}

export function clearPromptMemory() {
  memory.clear();
}
