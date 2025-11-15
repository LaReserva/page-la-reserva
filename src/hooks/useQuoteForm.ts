// src/hooks/useQuoteForm.ts --modificar en la documen
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { QuoteFormData } from '@/utils/validators';

export function useQuoteForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<QuoteFormData>({
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

      // Validación manual básica
      if (!data.name || data.name.length < 2) {
        throw new Error('Nombre muy corto');
      }
      if (!data.email || !data.email.includes('@')) {
        throw new Error('Email inválido');
      }
      if (!data.phone || data.phone.length < 9) {
        throw new Error('Teléfono inválido');
      }
      if (!data.eventType) {
        throw new Error('Selecciona un tipo de evento');
      }
      if (!data.eventDate) {
        throw new Error('Fecha requerida');
      }
      if (data.guestCount < 25 || data.guestCount > 500) {
        throw new Error('Cantidad de invitados debe estar entre 25 y 500');
      }

      console.log('Datos validados:', data);
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSuccess(true);
      form.reset();
    } catch (err: any) {
      setError(err.message || 'Error al enviar cotización');
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