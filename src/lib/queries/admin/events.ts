import { supabaseAdmin } from '@/lib/supabase';
import { startOfMonth, endOfMonth } from 'date-fns';

export async function getEventsThisMonth() {
  const start = startOfMonth(new Date());
  const end = endOfMonth(new Date());
  
  const { data, error } = await supabaseAdmin
    .from('events')
    .select(`
      *,
      client:clients(name, email, phone)
    `)
    .gte('event_date', start.toISOString().split('T')[0])
    .lte('event_date', end.toISOString().split('T')[0])
    .order('event_date', { ascending: true });
  
  if (error) throw error;
  return data;
}