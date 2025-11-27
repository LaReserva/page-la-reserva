// src/components/forms/ContactForm.tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { contactSchema, type ContactFormData } from '@/utils/validators';
import { useToast, ToastProvider } from '@/components/ui/Toast'; // Importamos ToastProvider
import { cn } from '@/utils/utils';

// 1. Componente Interno (Lógica del formulario)
function ContactFormContent() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast(); // Ahora sí funcionará porque está dentro del Provider

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    // Usamos el 'as any' para evitar conflictos de tipado estrictos
    resolver: zodResolver(contactSchema as any),
  });

  const onSubmit = async (data: ContactFormData) => {
    try {
      setIsSubmitting(true);

      // Simulación de envío o llamada a API real
      // const response = await fetch('/api/contact', ...);
      
      // Simulamos éxito por ahora para probar
      await new Promise(resolve => setTimeout(resolve, 1000));

      showToast('¡Mensaje enviado! Te responderemos pronto.', 'success');
      reset();
    } catch (error) {
      console.error('Error:', error);
      showToast('Error al enviar mensaje. Intenta de nuevo.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Estilos base reutilizables
  const inputClasses = (hasError: boolean) => cn(
    'w-full px-4 py-3 border rounded-lg transition-all duration-200',
    'bg-white text-secondary-900 placeholder:text-secondary-400',
    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
    'disabled:bg-secondary-50 disabled:text-secondary-400 disabled:cursor-not-allowed',
    hasError 
      ? 'border-red-500 focus:ring-red-500 text-red-900 placeholder:text-red-300' 
      : 'border-secondary-200'
  );

  const labelClasses = "block text-sm font-semibold text-secondary-700 mb-2";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="name" className={labelClasses}>
          Nombre <span className="text-red-500">*</span>
        </label>
        <input
          {...register('name')}
          id="name"
          type="text"
          className={inputClasses(!!errors.name)}
          placeholder="Tu nombre"
        />
        {errors.name && (
          <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="email" className={labelClasses}>
          Email <span className="text-red-500">*</span>
        </label>
        <input
          {...register('email')}
          id="email"
          type="email"
          className={inputClasses(!!errors.email)}
          placeholder="tu@email.com"
        />
        {errors.email && (
          <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="phone" className={labelClasses}>
          Teléfono (opcional)
        </label>
        <input
          {...register('phone')}
          id="phone"
          type="tel"
          className={inputClasses(!!errors.phone)}
          placeholder="999 888 777"
        />
      </div>

      <div>
        <label htmlFor="subject" className={labelClasses}>
          Asunto <span className="text-red-500">*</span>
        </label>
        <input
          {...register('subject')}
          id="subject"
          type="text"
          className={inputClasses(!!errors.subject)}
          placeholder="¿En qué podemos ayudarte?"
        />
        {errors.subject && (
          <p className="text-sm text-red-500 mt-1">{errors.subject.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="message" className={labelClasses}>
          Mensaje <span className="text-red-500">*</span>
        </label>
        <textarea
          {...register('message')}
          id="message"
          rows={6}
          className={cn(inputClasses(!!errors.message), "resize-none")}
          placeholder="Escribe tu mensaje aquí..."
        />
        {errors.message && (
          <p className="text-sm text-red-500 mt-1">{errors.message.message}</p>
        )}
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

// 2. Componente Exportado (Wrapper con el Provider)
// Este es el que usa Astro y crea la "Isla" completa
export function ContactForm() {
  return (
    <ToastProvider>
      <ContactFormContent />
    </ToastProvider>
  );
}