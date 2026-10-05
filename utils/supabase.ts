import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const storage = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') {
      return Promise.resolve(null)
    }
    return AsyncStorage.getItem(key)
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') {
      return Promise.resolve()
    }
    return AsyncStorage.setItem(key, value)
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') {
      return Promise.resolve()
    }
    return AsyncStorage.removeItem(key)
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
