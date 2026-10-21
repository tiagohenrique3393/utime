import AsyncStorage from '@react-native-async-storage/async-storage';

import { celebrationStorageKey, type CelebrationKind, type SeenCelebrations } from '@/lib/day-celebration';
import { supabase } from '../../utils/supabase';

const empty: SeenCelebrations = { meta: false, excelencia: false };
let remoteReady: boolean | null = null;

function parseSeen(raw: string | null): SeenCelebrations {
  if (!raw) {
    return empty;
  }
  return {
    meta: raw.split(',').includes('meta'),
    excelencia: raw.split(',').includes('excelencia'),
  };
}

function serialize(seen: SeenCelebrations) {
  return [seen.meta ? 'meta' : '', seen.excelencia ? 'excelencia' : ''].filter(Boolean).join(',');
}

function mergeSeen(left: SeenCelebrations, right: SeenCelebrations): SeenCelebrations {
  return {
    meta: left.meta || right.meta,
    excelencia: left.excelencia || right.excelencia,
  };
}

function remoteMissing(error: { message?: string; code?: string } | null) {
  if (!error) {
    return false;
  }
  const text = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase();
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    error.code === 'PGRST204' ||
    text.includes('schema cache') ||
    text.includes('does not exist') ||
    text.includes('could not find')
  );
}

async function readLocal(userId: string, day: string) {
  try {
    return parseSeen(await AsyncStorage.getItem(celebrationStorageKey(userId, day)));
  } catch {
    return empty;
  }
}

async function writeLocal(userId: string, day: string, seen: SeenCelebrations) {
  try {
    await AsyncStorage.setItem(celebrationStorageKey(userId, day), serialize(seen));
  } catch {
    // O registro remoto continua sendo a fonte quando a tabela existir.
  }
}

async function readRemote(userId: string, day: string): Promise<SeenCelebrations | null> {
  if (remoteReady === false) {
    return null;
  }
  const result = await supabase.from('day_celebrations').select('kind').eq('user_id', userId).eq('day', day);
  if (result.error) {
    if (remoteMissing(result.error)) {
      remoteReady = false;
    }
    return null;
  }
  remoteReady = true;
  const kinds = new Set((result.data ?? []).map((row) => String((row as { kind?: string }).kind)));
  return {
    meta: kinds.has('meta'),
    excelencia: kinds.has('excelencia'),
  };
}

export async function loadDayCelebrations(userId: string, day: string): Promise<SeenCelebrations> {
  const local = await readLocal(userId, day);
  const remote = await readRemote(userId, day);
  const seen = remote ? mergeSeen(local, remote) : local;
  if (remote && (seen.meta !== remote.meta || seen.excelencia !== remote.excelencia)) {
    await writeLocal(userId, day, seen);
    if (seen.meta && !remote.meta) {
      await rememberDayCelebration(userId, day, 'meta');
    }
    if (seen.excelencia && !remote.excelencia) {
      await rememberDayCelebration(userId, day, 'excelencia');
    }
  }
  return seen;
}

export async function rememberDayCelebration(userId: string, day: string, kind: CelebrationKind) {
  const local = await readLocal(userId, day);
  await writeLocal(userId, day, { ...local, [kind]: true });
  if (remoteReady === false) {
    return;
  }
  const result = await supabase.from('day_celebrations').insert({ user_id: userId, day, kind });
  if (!result.error || result.error.code === '23505') {
    remoteReady = true;
    return;
  }
  if (remoteMissing(result.error)) {
    remoteReady = false;
  }
}
