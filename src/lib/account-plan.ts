import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { accountPlanFromValue, type AccountPlan } from '@/lib/account-plan-value';
import { getSessionUserId, setSessionUserId, useSessionUserId } from '@/lib/session-user';
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

function planFromRpcData(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value === 'object' && 'utime_my_plan' in value) {
    const nested = (value as { utime_my_plan?: unknown }).utime_my_plan;
    return typeof nested === 'string' ? nested : null;
  }
  return null;
}

async function resolveActorUserId(expectedUserId: string) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.id) {
    return { userId: null as string | null, error };
  }
  const jwtUserId = data.user.id;
  if (jwtUserId !== expectedUserId) {
    // O store local ficou dessincronizado do JWT — o token é a fonte da verdade.
    setSessionUserId(jwtUserId);
  }
  return { userId: jwtUserId, error: null };
}

async function readPlanFromRpc() {
  const { data, error } = await supabase.rpc('utime_my_plan');
  if (error) {
    return { plan: null as string | null, error };
  }
  return { plan: planFromRpcData(data), error: null };
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

  const actor = await resolveActorUserId(userId);
  if (actor.error || !actor.userId) {
    replaceSnapshot({
      plan: ownerId === userId ? snapshot.plan : 'unknown',
      notice: noticeFor(actor.error),
    });
    return getAccountPlanSnapshot().plan;
  }
  const activeUserId = actor.userId;
  if (getSessionUserId() !== activeUserId) {
    return getAccountPlanSnapshot().plan;
  }

  const rpc = await readPlanFromRpc();
  if (getSessionUserId() !== activeUserId) {
    return getAccountPlanSnapshot().plan;
  }
  if (!rpc.error && rpc.plan != null) {
    ownerId = activeUserId;
    replaceSnapshot({ plan: accountPlanFromValue(rpc.plan), notice: '' });
    return getAccountPlanSnapshot().plan;
  }

  const table = await readPlanFromTable(activeUserId);
  if (getSessionUserId() !== activeUserId) {
    return getAccountPlanSnapshot().plan;
  }
  if (table.error) {
    replaceSnapshot({
      plan: ownerId === activeUserId ? snapshot.plan : 'unknown',
      notice: noticeFor(table.error ?? rpc.error),
    });
    return getAccountPlanSnapshot().plan;
  }

  ownerId = activeUserId;
  replaceSnapshot({ plan: accountPlanFromValue(table.plan), notice: '' });
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
