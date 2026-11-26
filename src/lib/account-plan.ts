import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { accountPlanFromValue, type AccountPlan } from '@/lib/account-plan-value';
import { getSessionUserId, useSessionUserId } from '@/lib/session-user';
import { supabase } from '../../utils/supabase';

export type { AccountPlan } from '@/lib/account-plan-value';
export { accountPlanFromValue, isPremiumPlan } from '@/lib/account-plan-value';

type PlanSnapshot = {
  plan: AccountPlan;
  notice: string;
};

let ownerId: string | null = null;
const serverSnapshot: PlanSnapshot = { plan: 'unknown', notice: '' };
let snapshot: PlanSnapshot = serverSnapshot;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function replaceSnapshot(next: PlanSnapshot) {
  if (snapshot.plan === next.plan && snapshot.notice === next.notice) {
    return;
  }
  snapshot = next;
  emit();
}

export function subscribeAccountPlan(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAccountPlanSnapshot() {
  return snapshot;
}

export function clearAccountPlan() {
  ownerId = null;
  replaceSnapshot({ plan: 'unknown', notice: '' });
}

function noticeFor(error: { message?: string } | null) {
  const text = (error?.message ?? '').toLowerCase();
  if (text.includes('jwt') || text.includes('session')) {
    return 'Sua sessão expirou. Entre novamente.';
  }
  if (text.includes('failed to fetch') || text.includes('network') || text.includes('timeout')) {
    return 'A conexão falhou. Tente de novo.';
  }
  return 'Não foi possível confirmar o plano agora.';
}

function planFromRow(value: unknown): Exclude<AccountPlan, 'unknown'> {
  return accountPlanFromValue(value);
}

async function readPlanFromRpc() {
  const { data, error } = await supabase.rpc('utime_my_plan');
  if (error) {
    return { plan: null as string | null, error };
  }
  if (typeof data === 'string') {
    return { plan: data, error: null };
  }
  return { plan: null as string | null, error: null };
}

async function readPlanFromTable(userId: string) {
  const { data, error } = await supabase.from('profiles').select('plan').eq('user_id', userId).maybeSingle();
  if (error) {
    return { plan: null as string | null, error };
  }
  return { plan: data?.plan ?? null, error: null };
}

export async function loadAccountPlan(userId: string) {
  if (!userId || getSessionUserId() !== userId) {
    return getAccountPlanSnapshot().plan;
  }

  const rpc = await readPlanFromRpc();
  if (getSessionUserId() !== userId) {
    return getAccountPlanSnapshot().plan;
  }
  if (!rpc.error && rpc.plan != null) {
    ownerId = userId;
    replaceSnapshot({ plan: planFromRow(rpc.plan), notice: '' });
    return getAccountPlanSnapshot().plan;
  }

  const table = await readPlanFromTable(userId);
  if (getSessionUserId() !== userId) {
    return getAccountPlanSnapshot().plan;
  }
  if (table.error) {
    replaceSnapshot({
      plan: ownerId === userId ? snapshot.plan : 'unknown',
      notice: noticeFor(table.error ?? rpc.error),
    });
    return getAccountPlanSnapshot().plan;
  }

  ownerId = userId;
  // Sem linha visível, assume gratuito até o perfil existir — não inventa Premium.
  replaceSnapshot({ plan: planFromRow(table.plan), notice: '' });
  return getAccountPlanSnapshot().plan;
}

function rememberOwner(userId: string) {
  if (ownerId === userId) {
    return;
  }
  ownerId = userId;
  replaceSnapshot({ plan: 'unknown', notice: '' });
}

export function useAccountPlan() {
  const current = useSyncExternalStore(subscribeAccountPlan, getAccountPlanSnapshot, () => serverSnapshot);
  const userId = useSessionUserId();
  useEffect(() => {
    if (!userId) {
      clearAccountPlan();
      return;
    }
    let active = true;
    rememberOwner(userId);
    const refresh = () => {
      if (active) {
        void loadAccountPlan(userId);
      }
    };
    refresh();
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        refresh();
      }
    });
    const onOnline = () => refresh();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', onOnline);
    }
    return () => {
      active = false;
      appState.remove();
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', onOnline);
      }
    };
  }, [userId]);
  return current;
}
