// src/lib/queries/quotes.ts
import { supabase } from '@/lib/supabase';
import type { QuoteFormData } from '@/utils/validators';

export async function createQuote(data: QuoteFormData) {
  const { data: quote, error } = await supabase
    .from('quotes')
    .insert({
      client_name: data.name,
      client_email: data.email,
      client_phone: data.phone,
      event_type: data.eventType,
      event_date: data.eventDate,
      guest_count: data.guestCount,
      message: data.message,
      status: 'new',
    })
    .select()
    .single();
  
  if (error) throw error;
  return quote;
}