// src/lib/supabase.ts

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Cliente para uso general (cliente y servidor)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Cliente con service key (SOLO para servidor)
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  import.meta.env.SUPABASE_SERVICE_KEY || supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);