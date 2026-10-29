import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const memory = new Map<string, string>()

const storage = {
  getItem: async (key: string) => {
    if (typeof window === 'undefined') {
      return null
    }
    try {
      const value = await AsyncStorage.getItem(key)
      if (value != null) {
        return value
      }
    } catch {
      // No celular, o armazenamento do navegador pode falhar. A sessão desta aba fica na memória.
    }
    return memory.get(key) ?? null
  },
  setItem: async (key: string, value: string) => {
    memory.set(key, value)
    if (typeof window === 'undefined') {
      return
    }
    try {
      await AsyncStorage.setItem(key, value)
    } catch {
      // Mantém a sessão na memória quando o navegador recusa o armazenamento.
    }
  },
  removeItem: async (key: string) => {
    memory.delete(key)
    if (typeof window === 'undefined') {
      return
    }
    try {
      await AsyncStorage.removeItem(key)
    } catch {
      // A chave já foi removida da memória.
    }
  },
}

const PROJECT_URL = 'https://svsxqpejzqejcvlshost.supabase.co'
const STALE_HOST = 'crqxzqilnhghhctwnvta.supabase.co'

const PUBLIC_KEY = 'sb_publishable_vv5aJD1ZdOpZdk3t4M2jfA_e_7i7T2b'

function jwtRole(token: string) {
  const part = token.split('.')[1]
  if (!part) {
    return null
  }
  try {
    const padded = part.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (part.length % 4)) % 4)
    const payload = globalThis.atob(padded)
    const role = payload.match(/"role"\s*:\s*"([^"]+)"/)
    return role?.[1] ?? null
  } catch {
    return null
  }
}

function assertPublicKey(value: string) {
  if (value.startsWith('sb_secret_') || jwtRole(value) === 'service_role') {
    throw new Error('A configuração do Supabase usa uma chave secreta. O cliente só aceita a publishable key.')
  }
  if (value.startsWith('sb_publishable_') || jwtRole(value) === 'anon') {
    return
  }
  throw new Error('A chave pública do Supabase não está disponível. Defina EXPO_PUBLIC_SUPABASE_ANON_KEY com a publishable key.')
}

export function resolveSupabaseUrl(configured: string | undefined, projectUrl = PROJECT_URL, staleHost = STALE_HOST) {
  const value = configured?.trim() ?? ''
  if (!value || !/^https?:\/\//i.test(value)) {
    return projectUrl
  }
  try {
    if (new URL(value).hostname === staleHost) {
      return projectUrl
    }
  } catch {
    return projectUrl
  }
  return value.replace(/\/$/, '')
}

export function resolveSupabaseKey(candidates: Array<string | undefined>, fallback = PUBLIC_KEY) {
  for (const candidate of candidates) {
    const value = candidate?.trim() ?? ''
    if (!value || /^https?:\/\//i.test(value)) {
      continue
    }
    assertPublicKey(value)
    return value
  }
  assertPublicKey(fallback)
  return fallback
}

function supabaseUrl() {
  return resolveSupabaseUrl(process.env.EXPO_PUBLIC_SUPABASE_URL)
}

function supabaseKey() {
  return resolveSupabaseKey([
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    process.env.EXPO_PUBLIC_SUPABASE_KEY,
    process.env.EXPO_PUBLIC_SUPABASE_URL,
  ])
}


export const supabase = createClient(
  supabaseUrl(),
  supabaseKey(),
  {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  })
