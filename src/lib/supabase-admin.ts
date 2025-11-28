// src/lib/supabase-admin.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types';

// ✅ La URL ahora es pública, pero la KEY sigue siendo la privada
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase Service Key');
}

export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);