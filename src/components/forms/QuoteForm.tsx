// src/components/forms/QuoteForm.tsx
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { quoteSchema, type QuoteFormData } from '@/utils/validators';
import { EVENT_TYPES, PACKAGES } from '@/utils/constants';
import { supabase } from '@/lib/supabase';
import { useToast, ToastProvider } from '@/components/ui/Toast';
import { cn } from '@/utils/utils';

function QuoteFormContent() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch, // Agregamos watch para depurar si cambia el valor
    formState: { errors },
  } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema as any),
    defaultValues: {
      guestCount: 100,
      message: '',
      interestedPackage: '',
    },
  });

  // ✅ EFECTO MEJORADO: Leer URL y forzar selección
  useEffect(() => {
    // 1. Leemos los parámetros
    const params = new URLSearchParams(window.location.search);
    const packageSlug = params.get('package');

    // console.log("📦 URL Package param:", packageSlug); // Debug 1

    if (packageSlug) {
      // 2. Verificamos que el paquete exista en nuestra lista para evitar errores
      const isValidPackage = PACKAGES.some(p => p.slug === packageSlug);
      
      if (isValidPackage) {
        // console.log("✅ Paquete válido encontrado. Seleccionando:", packageSlug); // Debug 2
        
        // 3. Forzamos la actualización del valor
        setValue('interestedPackage', packageSlug, { 
          shouldValidate: true, 
          shouldDirty: true,
          shouldTouch: true 
        });
      } else {
        console.warn("⚠️ El paquete de la URL no existe en la lista de constantes:", packageSlug);
      }
    }
  }, [setValue]);

  const onSubmit = async (data: QuoteFormData) => {
    try {
      setIsSubmitting(true);
      console.log("📝 Enviando datos:", data); // Debug envío

      const { error } = await supabase.from('quotes').insert({
        client_name: data.name,
        client_email: data.email,
        client_phone: data.phone,
        event_type: data.eventType,
        event_date: data.eventDate,
        guest_count: Number(data.guestCount),
        message: data.message || null,
        status: 'new',
        interested_package: data.interestedPackage || null, // Asegúrate que tu BD tenga esta columna
      } as any);

      if (error) throw error;

      showToast('¡Cotización enviada! Te contactaremos pronto.', 'success');
      reset();

    } catch (error: any) {
      console.error('Error:', error);
      showToast(error.message || 'Error al enviar cotización.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Estilos base
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
      
      {/* Datos Personales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="name" className={labelClasses}>Nombre completo <span className="text-red-500">*</span></label>
          <input {...register('name')} id="name" type="text" className={inputClasses(!!errors.name)} placeholder="Juan Pérez" />
          {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label htmlFor="phone" className={labelClasses}>Teléfono <span className="text-red-500">*</span></label>
          <input {...register('phone')} id="phone" type="tel" className={inputClasses(!!errors.phone)} placeholder="999 888 777" />
          {errors.phone && <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="email" className={labelClasses}>Email <span className="text-red-500">*</span></label>
        <input {...register('email')} id="email" type="email" className={inputClasses(!!errors.email)} placeholder="juan@ejemplo.com" />
        {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>}
      </div>

      {/* Detalles del Evento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="relative">
          <label htmlFor="eventType" className={labelClasses}>Tipo de evento <span className="text-red-500">*</span></label>
          <div className="relative">
            <select {...register('eventType')} id="eventType" className={cn(inputClasses(!!errors.eventType), "appearance-none")}>
              <option value="">Selecciona un tipo</option>
              {EVENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-secondary-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
          {errors.eventType && <p className="text-sm text-red-500 mt-1">{errors.eventType.message}</p>}
        </div>

        <div>
          <label htmlFor="eventDate" className={labelClasses}>Fecha del evento <span className="text-red-500">*</span></label>
          <input {...register('eventDate')} id="eventDate" type="date" min={new Date().toISOString().split('T')[0]} className={inputClasses(!!errors.eventDate)} />
          {errors.eventDate && <p className="text-sm text-red-500 mt-1">{errors.eventDate.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="guestCount" className={labelClasses}>Número de invitados <span className="text-red-500">*</span></label>
          <input {...register('guestCount', { valueAsNumber: true })} id="guestCount" type="number" min={25} max={500} className={inputClasses(!!errors.guestCount)} />
          {errors.guestCount && <p className="text-sm text-red-500 mt-1">{errors.guestCount.message}</p>}
        </div>

        {/* Paquete de Interés */}
        <div className="relative">
          <label htmlFor="interestedPackage" className={labelClasses}>Paquete de interés (Opcional)</label>
          <div className="relative">
            <select 
              {...register('interestedPackage')} 
              id="interestedPackage" 
              className={cn(inputClasses(false), "appearance-none")}
            >
              <option value="">Estoy indeciso / Personalizado</option>
              {PACKAGES.map((pkg) => (
                <option key={pkg.slug} value={pkg.slug}>
                  {pkg.name} (S/ {pkg.price})
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-secondary-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="message" className={labelClasses}>Mensaje adicional</label>
        <textarea {...register('message')} id="message" rows={4} className={cn(inputClasses(!!errors.message), "resize-none")} placeholder="Cuéntanos más sobre tu evento..." />
      </div>

      <button type="submit" disabled={isSubmitting} className="w-full inline-flex items-center justify-center px-6 py-3 font-semibold rounded-full transition-all duration-200 uppercase tracking-wider text-sm bg-gradient-to-r from-primary-500 to-accent-500 text-secondary-900 hover:from-primary-600 hover:to-accent-600 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
        {isSubmitting ? 'Enviando...' : 'Solicitar Cotización'}
      </button>
    </form>
  );
}

export function QuoteForm() {
  return (
    <ToastProvider>
      <QuoteFormContent />
    </ToastProvider>
  );
}