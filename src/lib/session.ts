import * as Linking from 'expo-linking';

import { supabase } from '../../utils/supabase';
import { applySessionOwner } from '@/lib/accounts';

let pendingRecovery = false;

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
    pendingRecovery = hash.get('type') === 'recovery';
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
  pendingRecovery = query.get('type') === 'recovery';
  await applySessionOwner(data.session.user.id);
  return true;
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
  if (typeof window === 'undefined') {
    const initialUrl = await Linking.getInitialURL();
    return initialUrl ? establishSessionFromUrl(initialUrl) : false;
  }

  const established = await establishSessionFromUrl(window.location.href);
  if (!established) {
    return false;
  }
  const query = new URLSearchParams(window.location.search);
  query.delete('code');
  query.delete('type');
  const nextQuery = query.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`);
  return true;
}

export async function prepareAuth() {
  await captureSessionFromUrl();
  const { data } = await supabase.auth.getSession();
  await applySessionOwner(data.session?.user.id ?? null);
  return data.session;
}
