import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { readSupabaseConfig } from './config';

export const supabaseConfiguration = readSupabaseConfig({
  url: process.env.EXPO_PUBLIC_SUPABASE_URL,
  publishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});

let client: SupabaseClient | null = null;

/** Lazy creation keeps missing credentials and server rendering safe. */
export function getSupabaseClient(): SupabaseClient {
  if (supabaseConfiguration.status !== 'ready') throw new Error(supabaseConfiguration.message);
  if (client) return client;
  const storage = Platform.OS === 'web' ? {
    getItem: async (key: string) => typeof window === 'undefined' ? null : window.localStorage.getItem(key),
    setItem: async (key: string, value: string) => { if (typeof window !== 'undefined') window.localStorage.setItem(key, value); },
    removeItem: async (key: string) => { if (typeof window !== 'undefined') window.localStorage.removeItem(key); },
  } : AsyncStorage;
  client = createClient(supabaseConfiguration.config.url, supabaseConfiguration.config.publishableKey, {
    auth: { storage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false, lock: processLock },
  });
  return client;
}
