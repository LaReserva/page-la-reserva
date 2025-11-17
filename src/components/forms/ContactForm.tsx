// src/components/forms/ContactForm.tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { contactSchema, type ContactFormData } from '@/utils/validators';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/utils/utils';

export function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    // @ts-ignore - Incompatibilidad temporal de tipos
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    try {
      setIsSubmitting(true);

      // Enviar a API endpoint o directamente
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Error al enviar');

      showToast('¡Mensaje enviado! Te responderemos pronto.', 'success');
      reset();
    } catch (error) {
      console.error('Error:', error);
      showToast('Error al enviar mensaje. Intenta de nuevo.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="name" className="label">
          Nombre <span className="text-red-500">*</span>
        </label>
        <input
          {...register('name')}
          id="name"
          type="text"
          className={cn('input', errors.name && 'border-red-500')}
          placeholder="Tu nombre"
        />
        {errors.name && (
          <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="label">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          {...register('email')}
          id="email"
          type="email"
          className={cn('input', errors.email && 'border-red-500')}
          placeholder="tu@email.com"
        />
        {errors.email && (
          <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="phone" className="label">
          Teléfono (opcional)
        </label>
        <input
          {...register('phone')}
          id="phone"
          type="tel"
          className="input"
          placeholder="999 888 777"
        />
      </div>

      <div>
        <label htmlFor="subject" className="label">
          Asunto <span className="text-red-500">*</span>
        </label>
        <input
          {...register('subject')}
          id="subject"
          type="text"
          className={cn('input', errors.subject && 'border-red-500')}
          placeholder="¿En qué podemos ayudarte?"
        />
        {errors.subject && (
          <p className="text-sm text-red-500 mt-1">{errors.subject.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="message" className="label">
          Mensaje <span className="text-red-500">*</span>
        </label>
        <textarea
          {...register('message')}
          id="message"
          rows={6}
          className={cn('input resize-none', errors.message && 'border-red-500')}
          placeholder="Escribe tu mensaje aquí..."
        />
        {errors.message && (
          <p className="text-sm text-red-500 mt-1">{errors.message.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary w-full"
      >
        {isSubmitting ? 'Enviando...' : 'Enviar Mensaje'}
      </button>
    </form>
  );
}