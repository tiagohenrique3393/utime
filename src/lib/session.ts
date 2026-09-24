import { supabase } from '../../utils/supabase';
import { applySessionOwner } from '@/lib/accounts';

let pendingRecovery = false;

export function hasPendingRecovery() {
  return pendingRecovery;
}

export function consumeRecoveryRedirect() {
  const pending = pendingRecovery;
  pendingRecovery = false;
  return pending;
}

async function captureSessionFromUrl() {
  if (typeof window === 'undefined') {
    return false;
  }

  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');
  if (accessToken && refreshToken) {
    const type = hash.get('type');
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    if (error) {
      return false;
    }
    pendingRecovery = type === 'recovery';
    return true;
  }

  const query = new URLSearchParams(window.location.search);
  const code = query.get('code');
  if (!code) {
    return false;
  }

  const type = query.get('type');
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  query.delete('code');
  query.delete('type');
  const nextQuery = query.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`);
  if (error) {
    return false;
  }
  pendingRecovery = type === 'recovery';
  return true;
}

export async function prepareAuth() {
  await captureSessionFromUrl();
  const { data } = await supabase.auth.getSession();
  applySessionOwner(data.session?.user.id ?? null);
  return data.session;
}
