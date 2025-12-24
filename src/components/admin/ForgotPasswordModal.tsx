import { useState } from 'react';
// ✅ 1. Importamos 'Resolver' para tipar manualmente la salida del validador
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { X, Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/utils/utils';

// 1. Schema
const forgotSchema = z.object({
  email: z.string().email('Ingresa un correo válido'),
});

// 2. Tipo
type ForgotFormData = z.infer<typeof forgotSchema>;

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // ✅ 3. Usamos el Genérico <ForgotFormData> para mantener el tipado fuerte en el resto del form
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting }, 
    reset 
  } = useForm<ForgotFormData>({
    // ✅ 4. SOLUCIÓN FINAL: Casting explícito a 'Resolver<ForgotFormData>'
    // Esto elimina el error rojo porque forzamos la compatibilidad de tipos
    // sin perder la seguridad (no es un 'any').
    resolver: zodResolver(forgotSchema) as Resolver<ForgotFormData>,
    defaultValues: {
      email: ''
    }
  });

  const onSubmit = async (data: ForgotFormData) => {
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/admin/reset-password`,
      });

      if (error) throw error;
      
      setIsSuccess(true);
      reset();
    } catch (error: any) {
      console.error(error);
      setErrorMsg('No se pudo enviar el correo. Inténtalo más tarde.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-secondary-100 flex justify-between items-center bg-secondary-50/50">
          <h3 className="text-lg font-bold text-secondary-900">Recuperar Contraseña</h3>
          <button onClick={onClose} className="text-secondary-400 hover:text-secondary-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {isSuccess ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={32} />
              </div>
              <div>
                <h4 className="text-xl font-bold text-secondary-900">¡Correo enviado!</h4>
                <p className="text-secondary-500 mt-2 text-sm">
                  Revisa tu bandeja de entrada. Hemos enviado un enlace para restablecer tu contraseña.
                </p>
              </div>
              <button 
                onClick={onClose}
                className="mt-4 px-6 py-2 bg-secondary-900 text-white rounded-lg font-medium hover:bg-secondary-800 transition-colors"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <p className="text-sm text-secondary-600">
                Ingresa tu correo electrónico asociado a la cuenta.
              </p>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm flex gap-2 items-start">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-secondary-500">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={18} />
                  <input
                    type="email"
                    {...register('email')}
                    className={cn(
                      "w-full pl-10 pr-4 py-2.5 bg-secondary-50 border rounded-lg outline-none transition-all focus:bg-white focus:ring-2",
                      errors.email 
                        ? "border-red-300 focus:ring-red-100" 
                        : "border-secondary-200 focus:ring-primary-100 focus:border-primary-500"
                    )}
                    placeholder="ejemplo@lareserva.pe"
                  />
                </div>
                {errors.email && <p className="text-xs text-red-500 mt-1 font-medium">{errors.email.message}</p>}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-secondary-200 text-secondary-700 rounded-lg font-medium hover:bg-secondary-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/30 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar enlace'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}