import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { accountPlanFromValue, type AccountPlan } from '@/lib/account-plan-value';
import { getSessionUserId } from '@/lib/session-user';
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

export async function loadAccountPlan(userId: string) {
  const { data, error } = await supabase.from('profiles').select('plan').eq('user_id', userId).maybeSingle();
  if (getSessionUserId() !== userId) {
    return getAccountPlanSnapshot().plan;
  }
  if (error) {
    replaceSnapshot({
      plan: ownerId === userId ? snapshot.plan : 'unknown',
      notice: noticeFor(error),
    });
    return getAccountPlanSnapshot().plan;
  }
  ownerId = userId;
  replaceSnapshot({ plan: accountPlanFromValue(data?.plan), notice: '' });
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
  const userId = getSessionUserId();
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
    return () => {
      active = false;
      appState.remove();
    };
  }, [userId]);
  return current;
}
