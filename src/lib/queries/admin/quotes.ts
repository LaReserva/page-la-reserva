import { supabaseAdmin } from '@/lib/supabase';

export async function getPendingQuotes() {
  const { data, error } = await supabaseAdmin
    .from('quotes')
    .select('*')
    .in('status', ['new', 'contacted'])
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}