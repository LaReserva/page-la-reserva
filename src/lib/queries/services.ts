// src/lib/queries/services.ts
import { supabase } from '@/lib/supabase';

export async function getActiveServices() {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('active', true)
    .order('order_index', { ascending: true });
  
  if (error) throw error;
  return data;
}