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

function supabaseUrl() {
  const configured = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim()
  if (!configured) {
    return PROJECT_URL
  }
  try {
    if (new URL(configured).hostname === STALE_HOST) {
      return PROJECT_URL
    }
  } catch {
    return PROJECT_URL
  }
  return configured.replace(/\/$/, '')
}

function supabaseKey() {
  return (
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_KEY ||
    ''
  )
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
