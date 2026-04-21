import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

let client: ReturnType<typeof createSupabaseClient<Database>> | null = null;

export function createClient() {
  if (client) return client;

  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? process.env['VITE_SUPABASE_URL'];
  const supabaseAnonKey =
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? process.env['VITE_SUPABASE_ANON_KEY'];

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  client = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey);
  return client;
}
