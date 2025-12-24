// src/components/forms/ContactForm.tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { contactSchema, type ContactFormData } from '@/utils/validators';
import { useToast, ToastProvider } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { cn } from '@/utils/utils';

function ContactFormContent() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema as any),
  });

  const onSubmit = async (data: ContactFormData) => {
    try {
      setIsSubmitting(true);

      // 1. PRIMERO: Guardar en Base de Datos (Respaldo seguro)
      // Usamos 'as any' temporalmente hasta que actualices los tipos de la BD
      const { error: dbError } = await supabase.from('contact_messages' as any).insert({
        name: data.name,
        email: data.email,
        phone: data.phone,
        subject: data.subject,
        message: data.message,
        status: 'new'
      } as any);

      if (dbError) throw new Error(`Error BD: ${dbError.message}`);

      // 2. SEGUNDO: Enviar el correo a través de nuestra API
      const response = await fetch('/api/send-contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        // Si falló el correo, lo registramos en consola pero no asustamos al usuario
        // porque ya se guardó en la BD.
        console.error('Error enviando email:', result.error);
        showToast('Mensaje guardado, pero hubo un problema con la notificación.', 'warning');
      } else {
        // Todo salió perfecto
        showToast('¡Mensaje enviado correctamente! Te responderemos pronto.', 'success');
      }

      reset();
    } catch (error: any) {
      console.error('Error general:', error);
      showToast('Error al enviar mensaje. Intenta de nuevo.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Estilos reutilizables (Sin cambios aquí)
  const inputClasses = (hasError: boolean) => cn(
    'w-full px-4 py-3 border rounded-lg transition-all duration-200',
    'bg-white text-secondary-900 placeholder:text-secondary-400',
    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
    'disabled:bg-secondary-50 disabled:text-secondary-400 disabled:cursor-not-allowed',
    hasError 
      ? 'border-red-500 focus:ring-red-500 text-red-900 placeholder:text-red-300' 
      : 'border-secondary-200'
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-semibold text-secondary-700 mb-2">
          Nombre <span className="text-red-500">*</span>
        </label>
        <input
          {...register('name')}
          id="name"
          type="text"
          className={inputClasses(!!errors.name)}
          placeholder="Tu nombre"
        />
        {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-secondary-700 mb-2">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          {...register('email')}
          id="email"
          type="email"
          className={inputClasses(!!errors.email)}
          placeholder="tu@email.com"
        />
        {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-semibold text-secondary-700 mb-2">
          Teléfono (opcional)
        </label>
        <input
          {...register('phone')}
          id="phone"
          type="tel"
          className={inputClasses(false)}
          placeholder="999 888 777"
        />
      </div>

      <div>
        <label htmlFor="subject" className="block text-sm font-semibold text-secondary-700 mb-2">
          Asunto <span className="text-red-500">*</span>
        </label>
        <input
          {...register('subject')}
          id="subject"
          type="text"
          className={inputClasses(!!errors.subject)}
          placeholder="¿En qué podemos ayudarte?"
        />
        {errors.subject && <p className="text-sm text-red-500 mt-1">{errors.subject.message}</p>}
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-semibold text-secondary-700 mb-2">
          Mensaje <span className="text-red-500">*</span>
        </label>
        <textarea
          {...register('message')}
          id="message"
          rows={6}
          className={cn(inputClasses(!!errors.message), "resize-none")}
          placeholder="Escribe tu mensaje aquí..."
        />
        {errors.message && <p className="text-sm text-red-500 mt-1">{errors.message.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full inline-flex items-center justify-center px-6 py-3 font-semibold rounded-full transition-all duration-200 uppercase tracking-wider text-sm bg-gradient-to-r from-primary-500 to-accent-500 text-secondary-900 hover:from-primary-600 hover:to-accent-600 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Enviando...' : 'Enviar Mensaje'}
      </button>
    </form>
  );
}

export function ContactForm() {
  return (
    <ToastProvider>
      <ContactFormContent />
    </ToastProvider>
  );
}