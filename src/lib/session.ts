import * as Linking from 'expo-linking';

import { supabase } from '../../utils/supabase';
import { applySessionOwner } from '@/lib/accounts';

const RECOVERY_URL_KEY = 'utime.recovery-url';

let pendingRecovery = false;

function readStashedRecoveryUrl() {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }
  const value = sessionStorage.getItem(RECOVERY_URL_KEY);
  if (!value) {
    return null;
  }
  sessionStorage.removeItem(RECOVERY_URL_KEY);
  return value;
}

function isRecoveryUrl(url: string, hash: URLSearchParams, query: URLSearchParams) {
  return (
    hash.get('type') === 'recovery' ||
    query.get('type') === 'recovery' ||
    url.includes('/redefinir-senha')
  );
}

function readParams(url: string) {
  const hashStart = url.indexOf('#');
  const queryStart = url.indexOf('?');
  const hash = hashStart >= 0 ? url.slice(hashStart + 1) : '';
  const query =
    queryStart >= 0 ? url.slice(queryStart + 1, hashStart >= 0 ? hashStart : undefined) : '';
  return {
    hash: new URLSearchParams(hash),
    query: new URLSearchParams(query),
  };
}

export async function establishSessionFromUrl(url: string) {
  const { hash, query } = readParams(url);
  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');
  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error || !data.session) {
      return false;
    }
    pendingRecovery = isRecoveryUrl(url, hash, query);
    await applySessionOwner(data.session.user.id);
    return true;
  }

  const tokenHash = query.get('token_hash');
  if (tokenHash && query.get('type') === 'recovery') {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'recovery',
    });
    if (error || !data.session) {
      return false;
    }
    pendingRecovery = true;
    await applySessionOwner(data.session.user.id);
    return true;
  }

  const code = query.get('code');
  if (!code) {
    return false;
  }
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) {
    return false;
  }
  pendingRecovery = isRecoveryUrl(url, hash, query);
  await applySessionOwner(data.session.user.id);
  return true;
}

export function notePasswordRecovery() {
  pendingRecovery = true;
}

export function hasPendingRecovery() {
  return pendingRecovery;
}

export function consumeRecoveryRedirect() {
  const pending = pendingRecovery;
  pendingRecovery = false;
  return pending;
}

async function captureSessionFromUrl() {
  const stashed = readStashedRecoveryUrl();
  if (typeof window === 'undefined') {
    const initialUrl = stashed ?? (await Linking.getInitialURL());
    return initialUrl ? establishSessionFromUrl(initialUrl) : false;
  }

  const established = await establishSessionFromUrl(stashed ?? window.location.href);
  if (!established) {
    return false;
  }
  const query = new URLSearchParams(window.location.search);
  query.delete('code');
  query.delete('type');
  query.delete('token_hash');
  const nextQuery = query.toString();
  const path = window.location.pathname === '/redefinir-senha' ? '/redefinir-senha' : window.location.pathname;
  window.history.replaceState(null, '', `${path}${nextQuery ? `?${nextQuery}` : ''}`);
  return true;
}

export async function prepareAuth() {
  await captureSessionFromUrl();
  const { data } = await supabase.auth.getSession();
  await applySessionOwner(data.session?.user.id ?? null);
  return data.session;
}
