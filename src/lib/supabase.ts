// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types'; // ✅ Usamos el alias

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables (Client)');
}

export const supabase = createClient<Database>(
  supabaseUrl as string, 
  supabaseAnonKey as string
);