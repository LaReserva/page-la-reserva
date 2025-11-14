import { supabase } from '@/lib/supabase';

export async function getPortfolioImages(limit: number = 12) {
  const { data, error } = await supabase
    .from('event_images')
    .select(`
      *,
      event:events(event_type, event_date, status)
    `)
    .eq('events.status', 'completed')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data;
}