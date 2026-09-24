type Account = {
  email: string;
  password: string;
  provider: 'email' | 'google';
};

const STORAGE_KEY = 'youtime.preview.accounts';
let accounts = new Map<string, Account>();

function persistAccounts() {
  try {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...accounts.entries()]));
  } catch {
    // A prévia nativa guarda as contas só na memória da sessão.
  }
}

function restoreAccounts() {
  try {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }
    const entries = JSON.parse(raw) as [string, Account][];
    accounts = new Map(entries);
  } catch {
    accounts = new Map();
  }
}

restoreAccounts();

const GOOGLE_PREVIEW_EMAIL = 'google.preview@youtime.app';

export type AuthResult = {
  ok: boolean;
  message: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function signUpWithEmail(email: string, password: string): AuthResult {
  const normalized = normalizeEmail(email);

  if (!validateEmail(normalized)) {
    return { ok: false, message: 'Informe um e-mail válido.' };
  }

  if (password.length < 6) {
    return { ok: false, message: 'A senha precisa ter ao menos 6 caracteres.' };
  }

  if (accounts.has(normalized)) {
    return { ok: false, message: 'Já existe uma conta com este e-mail.' };
  }

  accounts.set(normalized, { email: normalized, password, provider: 'email' });
  persistAccounts();
  return { ok: true, message: 'Conta criada. Você já pode entrar.' };
}

export function signInWithEmail(email: string, password: string): AuthResult {
  const normalized = normalizeEmail(email);

  if (!validateEmail(normalized)) {
    return { ok: false, message: 'Informe um e-mail válido.' };
  }

  if (password.length < 6) {
    return { ok: false, message: 'A senha precisa ter ao menos 6 caracteres.' };
  }

  restoreAccounts();
  const account = accounts.get(normalized);
  if (!account || account.provider !== 'email' || account.password !== password) {
    return { ok: false, message: 'E-mail ou senha incorretos.' };
  }

  return { ok: true, message: 'Entrada confirmada.' };
}

export function continueWithGoogle(mode: 'signup' | 'login'): AuthResult {
  if (mode === 'signup') {
    accounts.set(GOOGLE_PREVIEW_EMAIL, {
      email: GOOGLE_PREVIEW_EMAIL,
      password: '',
      provider: 'google',
    });
    persistAccounts();
    return { ok: true, message: 'Conta Google conectada nesta prévia.' };
  }

  restoreAccounts();
  if (!accounts.has(GOOGLE_PREVIEW_EMAIL)) {
    return { ok: false, message: 'Nenhuma conta Google nesta prévia. Crie uma no cadastro.' };
  }

  return { ok: true, message: 'Entrada com Google confirmada.' };
}
