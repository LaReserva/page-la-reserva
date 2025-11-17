// src/components/forms/QuoteForm.tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { quoteSchema, type QuoteFormData } from '@/utils/validators';
import { EVENT_TYPES } from '@/utils/constants';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/utils/utils';

export function QuoteForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<QuoteFormData>({
    // @ts-ignore - Incompatibilidad temporal de tipos
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      guestCount: 100,
    },
  });

  const onSubmit = async (data: QuoteFormData) => {
    try {
      setIsSubmitting(true);

      const { error } = await supabase.from('quotes').insert({
        client_name: data.name,
        client_email: data.email,
        client_phone: data.phone,
        event_type: data.eventType,
        event_date: data.eventDate,
        guest_count: data.guestCount,
        message: data.message,
        status: 'new',
      });

      if (error) throw error;

      showToast('¡Cotización enviada! Te contactaremos pronto.', 'success');
      reset();

      // Opcional: Trigger email via Edge Function
      // await fetch('/api/send-quote-email', { method: 'POST', body: JSON.stringify(data) });
    } catch (error) {
      console.error('Error:', error);
      showToast('Error al enviar cotización. Por favor intenta de nuevo.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Nombre */}
      <div>
        <label htmlFor="name" className="label">
          Nombre completo <span className="text-red-500">*</span>
        </label>
        <input
          {...register('name')}
          id="name"
          type="text"
          className={cn('input', errors.name && 'border-red-500')}
          placeholder="Juan Pérez"
        />
        {errors.name && (
          <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="label">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          {...register('email')}
          id="email"
          type="email"
          className={cn('input', errors.email && 'border-red-500')}
          placeholder="juan@ejemplo.com"
        />
        {errors.email && (
          <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
        )}
      </div>

      {/* Teléfono */}
      <div>
        <label htmlFor="phone" className="label">
          Teléfono / WhatsApp <span className="text-red-500">*</span>
        </label>
        <input
          {...register('phone')}
          id="phone"
          type="tel"
          className={cn('input', errors.phone && 'border-red-500')}
          placeholder="999 888 777"
        />
        {errors.phone && (
          <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>
        )}
      </div>

      {/* Tipo de Evento */}
      <div>
        <label htmlFor="eventType" className="label">
          Tipo de evento <span className="text-red-500">*</span>
        </label>
        <select
          {...register('eventType')}
          id="eventType"
          className={cn('input appearance-none', errors.eventType && 'border-red-500')}
        >
          <option value="">Selecciona un tipo</option>
          {EVENT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        {errors.eventType && (
          <p className="text-sm text-red-500 mt-1">{errors.eventType.message}</p>
        )}
      </div>

      {/* Fecha del Evento */}
      <div>
        <label htmlFor="eventDate" className="label">
          Fecha del evento <span className="text-red-500">*</span>
        </label>
        <input
          {...register('eventDate')}
          id="eventDate"
          type="date"
          min={new Date().toISOString().split('T')[0]}
          className={cn('input', errors.eventDate && 'border-red-500')}
        />
        {errors.eventDate && (
          <p className="text-sm text-red-500 mt-1">{errors.eventDate.message}</p>
        )}
      </div>

      {/* Número de Invitados */}
      <div>
        <label htmlFor="guestCount" className="label">
          Número de invitados <span className="text-red-500">*</span>
        </label>
        <input
          {...register('guestCount', { valueAsNumber: true })}
          id="guestCount"
          type="number"
          min={25}
          max={500}
          className={cn('input', errors.guestCount && 'border-red-500')}
        />
        {errors.guestCount && (
          <p className="text-sm text-red-500 mt-1">{errors.guestCount.message}</p>
        )}
        <p className="text-sm text-secondary-400 mt-1">Mínimo 25, máximo 500</p>
      </div>

      {/* Mensaje Opcional */}
      <div>
        <label htmlFor="message" className="label">
          Mensaje adicional (opcional)
        </label>
        <textarea
          {...register('message')}
          id="message"
          rows={4}
          className="input resize-none"
          placeholder="Cuéntanos más sobre tu evento..."
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary w-full"
      >
        {isSubmitting ? 'Enviando...' : 'Solicitar Cotización'}
      </button>

      <p className="text-sm text-secondary-400 text-center">
        Te contactaremos dentro de las próximas 24 horas
      </p>
    </form>
  );
}