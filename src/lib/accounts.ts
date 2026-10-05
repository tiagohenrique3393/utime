import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from '../../utils/supabase';
import { establishSessionFromUrl } from '@/lib/session';
import { setProfileOwner } from '@/lib/profile';
import { hydrateAccount } from '@/lib/sync';
import { setTaskOwner } from '@/lib/tasks';

WebBrowser.maybeCompleteAuthSession();

export type AuthResult = {
  ok: boolean;
  message: string;
  next?: 'app' | 'confirm';
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function authErrorMessage(message: string) {
  const text = message.toLowerCase();
  if (text.includes('already registered') || text.includes('already been registered')) {
    return 'Já existe uma conta com este e-mail.';
  }
  if (text.includes('invalid login') || text.includes('invalid credentials')) {
    return 'E-mail ou senha incorretos.';
  }
  if (text.includes('email not confirmed')) {
    return 'Confirme seu e-mail antes de entrar.';
  }
  if (text.includes('password') && text.includes('6')) {
    return 'A senha precisa ter ao menos 6 caracteres.';
  }
  if (text.includes('rate limit') || text.includes('too many')) {
    return 'Muitas tentativas. Aguarde um pouco e tente de novo.';
  }
  return 'Não foi possível concluir agora. Tente novamente.';
}

export function appRedirect(path: string) {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }
  return Linking.createURL(path, { scheme: 'youtime' });
}

export function oauthRedirectTo() {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/`;
  }
  return Linking.createURL('/', { scheme: 'youtime' });
}

let sessionUserId: string | null = null;

export function getSessionUserId() {
  return sessionUserId;
}

export async function getSessionEmail() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  return data.session?.user.email ?? '';
}

let hydration: { userId: string; promise: Promise<void> } | null = null;

export function applySessionOwner(userId: string | null) {
  sessionUserId = userId;
  setProfileOwner(userId);
  setTaskOwner(userId);
  if (!userId) {
    hydration = null;
    return Promise.resolve();
  }
  if (hydration?.userId === userId) {
    return hydration.promise;
  }
  const promise = hydrateAccount(userId);
  hydration = { userId, promise };
  return promise;
}

export async function signUpWithEmail(email: string, password: string): Promise<AuthResult> {
  const normalized = normalizeEmail(email);

  if (!validateEmail(normalized)) {
    return { ok: false, message: 'Informe um e-mail válido.' };
  }

  if (password.length < 6) {
    return { ok: false, message: 'A senha precisa ter ao menos 6 caracteres.' };
  }

  const { data, error } = await supabase.auth.signUp({
    email: normalized,
    password,
    options: { emailRedirectTo: appRedirect('/') },
  });

  if (error) {
    return { ok: false, message: authErrorMessage(error.message) };
  }

  if (!data.session) {
    return {
      ok: true,
      next: 'confirm',
      message: 'Enviamos um e-mail para confirmar sua conta. Depois, entre com seu e-mail e senha.',
    };
  }

  await applySessionOwner(data.user?.id ?? null);
  return { ok: true, next: 'app', message: 'Conta criada.' };
}

function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const normalized = normalizeEmail(email);

  if (!validateEmail(normalized)) {
    return { ok: false, message: 'Informe um e-mail válido.' };
  }

  if (password.length < 6) {
    return { ok: false, message: 'A senha precisa ter ao menos 6 caracteres.' };
  }

  try {
    const { data, error } = await withDeadline(
      supabase.auth.signInWithPassword({
        email: normalized,
        password,
      }),
      15000,
    );

    if (error || !data.session) {
      return { ok: false, message: authErrorMessage(error?.message ?? 'invalid credentials') };
    }

    await withDeadline(Promise.resolve(applySessionOwner(data.user?.id ?? null)), 8000).catch(() => undefined);
    return { ok: true, next: 'app', message: 'Entrada confirmada.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    return { ok: false, message: authErrorMessage(message || 'timeout') };
  }
}

function supabaseErrorText(error: { message: string; code?: string }) {
  return error.code ? `${error.message} (${error.code})` : error.message;
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  const normalized = normalizeEmail(email);

  if (!validateEmail(normalized)) {
    return { ok: false, message: 'Informe um e-mail válido.' };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(normalized, {
    redirectTo: 'https://utime.app.br/redefinir-senha',
  });

  if (error) {
    const text = error.message.toLowerCase();
    if (text.includes('rate limit') || text.includes('too many')) {
      return { ok: false, message: 'Muitas tentativas. Aguarde um pouco e tente de novo.' };
    }
    return { ok: false, message: 'Não foi possível enviar o e-mail de recuperação. Tente novamente.' };
  }

  return {
    ok: true,
    message: 'Enviamos o e-mail de recuperação. Abra o link para definir uma nova senha.',
  };
}

export async function updatePassword(password: string): Promise<AuthResult> {
  if (password.length < 6) {
    return { ok: false, message: 'A senha precisa ter ao menos 6 caracteres.' };
  }

  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    return { ok: false, message: 'Abra o link recebido por e-mail neste aparelho.' };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    const text = error.message.toLowerCase();
    if (text.includes('password') && text.includes('6')) {
      return { ok: false, message: 'A senha precisa ter ao menos 6 caracteres.' };
    }
    if (text.includes('rate limit') || text.includes('too many')) {
      return { ok: false, message: 'Muitas tentativas. Aguarde um pouco e tente de novo.' };
    }
    return { ok: false, message: 'Não foi possível salvar a nova senha. Tente novamente.' };
  }

  return { ok: true, next: 'app', message: 'Nova senha salva com sucesso.' };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  await applySessionOwner(null);
}

export async function signInWithGoogle(): Promise<AuthResult> {
  const redirectTo = oauthRedirectTo();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: Platform.OS !== 'web',
    },
  });

  if (error) {
    return { ok: false, message: supabaseErrorText(error) };
  }

  if (Platform.OS === 'web') {
    return { ok: true, message: 'Redirecionando para o Google.' };
  }

  if (!data.url) {
    return { ok: false, message: 'Não foi possível abrir o Google.' };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') {
    return { ok: false, message: 'A entrada com Google foi cancelada.' };
  }

  const established = await establishSessionFromUrl(result.url);
  if (!established) {
    return { ok: false, message: 'Não foi possível concluir a entrada com Google.' };
  }

  return { ok: true, next: 'app', message: 'Entrada com Google confirmada.' };
}
