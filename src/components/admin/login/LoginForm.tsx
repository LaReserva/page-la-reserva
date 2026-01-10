import { useState, Fragment } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Transition } from '@headlessui/react';
import { loginSchema, type LoginFormData } from '@/utils/validators';
import { supabase } from '@/lib/supabase';
import { cn } from '@/utils/utils';
import { Eye, EyeOff, Loader2, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import { ForgotPasswordModal } from './ForgotPasswordModal';

// Estilos base consistentes con el resto de la app
const INPUT_BASE_CLASSES = "block w-full bg-white border border-secondary-200 rounded-xl text-sm outline-none transition-all placeholder:text-secondary-400 focus:border-secondary-500 focus:ring-1 focus:ring-secondary-500 disabled:bg-secondary-50 disabled:text-secondary-400";

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
          throw new Error('Credenciales incorrectas.');
        }
        throw authError;
      }

      // 2. Verificación de Rol
      const { data: adminUser, error: roleError } = await supabase
        .from('admin_users')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (roleError || !adminUser) {
        await supabase.auth.signOut();
        throw new Error('No tienes permisos de administrador.');
      }

      // 3. Éxito
      window.location.replace('/admin');

    } catch (error: any) {
      console.error('Login error:', error);
      setServerError(error.message || 'Error de conexión.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="w-full max-w-[400px] bg-white rounded-3xl shadow-2xl shadow-secondary-900/10 border border-secondary-100 overflow-hidden ring-1 ring-secondary-900/5">
        
        {/* Header Minimalista */}
        <div className="bg-secondary-900 px-8 py-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="relative z-10">
            <h2 className="text-2xl font-display font-bold tracking-tight text-white">Bienvenido</h2>
            <p className="text-secondary-300 text-sm mt-1.5 font-medium">Ingresa al panel administrativo</p>
          </div>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            
            {/* Mensaje de Error Animado */}
            <Transition
              show={!!serverError}
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 -translate-y-2"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 -translate-y-2"
            >
              <div className="bg-red-50 text-red-600 text-xs font-medium p-3 rounded-xl border border-red-100 flex gap-2 items-start">
                <AlertCircle className="shrink-0 w-4 h-4 mt-0.5" />
                <span>{serverError}</span>
              </div>
            </Transition>

            {/* Input Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-secondary-600 uppercase tracking-wider ml-1">
                Correo
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className={cn("h-4 w-4 transition-colors", errors.email ? "text-red-400" : "text-secondary-400 group-focus-within:text-secondary-800")} />
                </div>
                <input
                  type="email"
                  {...register('email')}
                  disabled={isLoading}
                  className={cn(
                    INPUT_BASE_CLASSES,
                    "pl-10 pr-4 py-2.5", // Padding específico para icono
                    errors.email && "border-red-300 focus:border-red-500 focus:ring-red-200"
                  )}
                  placeholder="admin@lareserva.pe"
                />
              </div>
              {errors.email && (
                <p className="text-[10px] text-red-500 font-medium ml-1 animate-pulse">
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
                  <Lock className={cn("h-4 w-4 transition-colors", errors.password ? "text-red-400" : "text-secondary-400 group-focus-within:text-secondary-800")} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  {...register('password')}
                  disabled={isLoading}
                  className={cn(
                    INPUT_BASE_CLASSES,
                    "pl-10 pr-10 py-2.5", // Padding para iconos ambos lados
                    errors.password && "border-red-300 focus:border-red-500 focus:ring-red-200"
                  )}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary-400 hover:text-secondary-600 transition-colors focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              
              <div className="flex justify-between items-start">
                <div>
                   {errors.password && (
                    <p className="text-[10px] text-red-500 font-medium ml-1 animate-pulse">
                      {errors.password.message}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[10px] font-bold text-secondary-500 hover:text-secondary-800 transition-colors hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </div>

            {/* Botón Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-secondary-900 text-white font-bold py-3 rounded-xl hover:bg-black active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100 shadow-lg shadow-secondary-900/10 flex justify-center items-center gap-2 group mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 text-white/80" />
                  <span className="text-sm">Verificando...</span>
                </>
              ) : (
                <>
                  <span className="text-sm">Iniciar Sesión</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform opacity-70" />
                </>
              )}
            </button>

          </form>
        </div>
        
        {/* Footer simple */}
        <div className="bg-secondary-50 p-3 text-center border-t border-secondary-100">
          <p className="text-[10px] text-secondary-400 font-medium tracking-wide">
            © {new Date().getFullYear()} La Reserva Bartending
          </p>
        </div>
      </div>

      <ForgotPasswordModal 
        isOpen={showForgotModal} 
        onClose={() => setShowForgotModal(false)} 
      />
    </>
  );
}