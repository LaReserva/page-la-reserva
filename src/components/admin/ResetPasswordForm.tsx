import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { cn } from '@/utils/utils';
import { Lock, Loader2, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

// Schema específico para cambio de contraseña
const resetSchema = z.object({
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string().min(6, 'Confirma tu contraseña'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type ResetFormData = z.infer<typeof resetSchema>;

export function ResetPasswordForm() {
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
  });

  useEffect(() => {
    // Verificar si Supabase detectó el token de recuperación en la URL
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setErrorMsg('El enlace es inválido o ha expirado. Por favor solicita uno nuevo.');
      }
      setSessionChecked(true);
    });
  }, []);

  const onSubmit = async (data: ResetFormData) => {
    setErrorMsg(null);
    try {
      // Actualizamos la contraseña del usuario actual (que llegó via token)
      const { error } = await supabase.auth.updateUser({
        password: data.password
      });

      if (error) throw error;

      setIsSuccess(true);
      
      // Esperar 2 segundos y redirigir al login o al dashboard
      setTimeout(() => {
        window.location.href = '/admin/login';
      }, 3000);

    } catch (error: any) {
      console.error(error);
      setErrorMsg('No se pudo actualizar la contraseña. Inténtalo de nuevo.');
    }
  };

  if (!sessionChecked) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin text-secondary-400" size={32} />
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full border border-green-100">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} />
        </div>
        <h2 className="text-2xl font-bold text-secondary-900 mb-2">¡Contraseña Actualizada!</h2>
        <p className="text-secondary-500 text-sm">
          Tu contraseña ha sido cambiada exitosamente. <br/>
          Redirigiendo al login...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-secondary-100 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-secondary-900 to-secondary-700"></div>
      
      <div className="mb-6">
        <h2 className="text-2xl font-display font-bold text-secondary-900">Nueva Contraseña</h2>
        <p className="text-secondary-500 text-sm mt-1">
          Ingresa una contraseña segura para tu cuenta.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        
        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm flex gap-2 items-start">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="space-y-4">
          {/* Nueva Contraseña */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-secondary-600 uppercase tracking-wider">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                {...register('password')}
                className={cn(
                  "w-full pl-4 pr-10 py-2.5 bg-secondary-50 border rounded-lg outline-none transition-all focus:bg-white focus:ring-2",
                  errors.password 
                    ? "border-red-300 focus:ring-red-100" 
                    : "border-secondary-200 focus:ring-primary-100 focus:border-primary-500"
                )}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
          </div>

          {/* Confirmar Contraseña */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-secondary-600 uppercase tracking-wider">
              Confirmar Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                {...register('confirmPassword')}
                className={cn(
                  "w-full pl-4 pr-10 py-2.5 bg-secondary-50 border rounded-lg outline-none transition-all focus:bg-white focus:ring-2",
                  errors.confirmPassword 
                    ? "border-red-300 focus:ring-red-100" 
                    : "border-secondary-200 focus:ring-primary-100 focus:border-primary-500"
                )}
                placeholder="••••••••"
              />
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 pointer-events-none" size={18} />
            </div>
            {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-secondary-900 text-white font-bold py-3 rounded-lg hover:bg-secondary-800 transition-all disabled:opacity-70 flex justify-center items-center gap-2 mt-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Guardando...
            </>
          ) : (
            'Actualizar Contraseña'
          )}
        </button>
      </form>
    </div>
  );
}