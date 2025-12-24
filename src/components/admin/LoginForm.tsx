import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from '@/utils/validators';
import { supabase } from '@/lib/supabase';
import { cn } from '@/utils/utils';
import { Eye, EyeOff, Loader2, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import { ForgotPasswordModal } from './ForgotPasswordModal';

export function LoginForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema as any),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setServerError(null);

    try {
      // 1. Login con Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          throw new Error('El correo o la contraseña son incorrectos.');
        }
        throw authError;
      }

      // 2. Verificación de Rol (Seguridad extra)
      const { data: adminUser, error: roleError } = await supabase
        .from('admin_users')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (roleError || !adminUser) {
        // Si entra aquí, el usuario existe en Auth pero no en la tabla admin_users
        await supabase.auth.signOut();
        throw new Error('Usuario no autorizado para acceder al panel.');
      }

      // 3. Éxito - Redirección
      // Usamos replace para que no pueda volver atrás al login
      window.location.replace('/admin');

    } catch (error: any) {
      console.error('Login error:', error);
      setServerError(error.message || 'Ocurrió un error inesperado.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="w-full max-w-[420px] bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 overflow-hidden ring-1 ring-secondary-900/5">
        
        {/* Header Decorativo */}
        <div className="bg-secondary-900 px-8 py-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative z-10">
            <h2 className="text-2xl text-yellow-400 font-display font-bold">Bienvenido</h2>
            <p className="text-secondary-300 text-sm mt-1">Accede al panel de control de La Reserva</p>
          </div>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Feedback de Error Global */}
            {serverError && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300 bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-100 flex gap-3 items-start shadow-sm">
                <AlertCircle className="shrink-0 mt-0.5" size={18} />
                <span className="font-medium">{serverError}</span>
              </div>
            )}

            {/* Input Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-secondary-600 uppercase tracking-wider ml-1">
                Correo Electrónico
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className={cn("h-5 w-5 transition-colors", errors.email ? "text-red-400" : "text-secondary-400 group-focus-within:text-primary-500")} />
                </div>
                <input
                  type="email"
                  {...register('email')}
                  className={cn(
                    "block w-full pl-11 pr-4 py-3 bg-secondary-50 border rounded-xl outline-none transition-all placeholder:text-secondary-400/70",
                    "focus:bg-white focus:ring-4",
                    errors.email 
                      ? "border-red-300 focus:ring-red-500/10 focus:border-red-500" 
                      : "border-secondary-200 focus:ring-primary-500/10 focus:border-primary-500 hover:border-secondary-300"
                  )}
                  placeholder="admin@lareserva.pe"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-500 font-medium ml-1 animate-in slide-in-from-left-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Input Password */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-bold text-secondary-600 uppercase tracking-wider">
                  Contraseña
                </label>
              </div>
              
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className={cn("h-5 w-5 transition-colors", errors.password ? "text-red-400" : "text-secondary-400 group-focus-within:text-primary-500")} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  {...register('password')}
                  className={cn(
                    "block w-full pl-11 pr-12 py-3 bg-secondary-50 border rounded-xl outline-none transition-all placeholder:text-secondary-400/70",
                    "focus:bg-white focus:ring-4",
                    errors.password 
                      ? "border-red-300 focus:ring-red-500/10 focus:border-red-500" 
                      : "border-secondary-200 focus:ring-primary-500/10 focus:border-primary-500 hover:border-secondary-300"
                  )}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-secondary-400 hover:text-secondary-600 transition-colors focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 font-medium ml-1 animate-in slide-in-from-left-1">
                  {errors.password.message}
                </p>
              )}
              
              <div className="flex justify-end mt-1">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs font-medium text-secondary-500 hover:text-primary-600 transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </div>

            {/* Botón Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-secondary-900 text-white font-bold py-3.5 rounded-xl hover:bg-secondary-800 text-ye active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100 shadow-lg shadow-secondary-900/20 flex justify-center items-center gap-2 group"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 text-white/80" />
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <span>Iniciar Sesión</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform opacity-70" />
                </>
              )}
            </button>

          </form>
        </div>
        
        {/* Footer simple */}
        <div className="bg-secondary-50/50 p-4 text-center border-t border-secondary-100">
          <p className="text-[10px] text-secondary-400 uppercase tracking-widest font-semibold">
            La Reserva Bartending
          </p>
        </div>
      </div>

      {/* Modal de Recuperación inyectado aquí */}
      <ForgotPasswordModal 
        isOpen={showForgotModal} 
        onClose={() => setShowForgotModal(false)} 
      />
    </>
  );
}