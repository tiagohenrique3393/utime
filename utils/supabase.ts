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

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_KEY!,
  {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  })
