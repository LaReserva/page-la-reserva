// src/hooks/useQuoteForm.ts
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { quoteSchema, type QuoteFormData } from '@/utils/validators';
import { supabase } from '@/lib/supabase';

export function useQuoteForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<QuoteFormData>({
    // @ts-ignore - Incompatibilidad temporal de tipos
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      eventType: '',
      eventDate: '',
      guestCount: 100,
      message: '',
    },
  });

  const onSubmit = async (data: QuoteFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const { data: newQuote, error: supabaseError } = await supabase
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

      if (supabaseError) throw supabaseError;

      // Notificar a los administradores vía Web Push
      fetch('/api/webhooks/supabase-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'quotes',
          record: {
            id: newQuote?.id,
            client_name: data.name,
            event_type: data.eventType,
          },
        }),
      }).catch((e) => console.error('Error enviando push de cotización:', e));

      setSuccess(true);
      form.reset();
    } catch (err) {
      setError('Error al enviar cotización. Por favor intenta de nuevo.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    form,
    isSubmitting,
    error,
    success,
    onSubmit: form.handleSubmit(onSubmit),
  };
}
