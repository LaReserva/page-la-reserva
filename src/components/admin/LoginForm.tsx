// src/components/admin/LoginForm.tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from '@/utils/validators';
import { supabase } from '@/lib/supabase';
import { cn } from '@/utils/utils';

export function LoginForm() {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema as any),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      // 1. Intentar login con Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError) throw authError;

      // 2. Verificar si existe en la tabla de administradores (Seguridad Extra)
      // Esto asegura que solo gente autorizada en TU tabla pueda entrar, no cualquier usuario registrado
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      // Nota: Si aún no has llenado la tabla admin_users, este paso podría fallar.
      // Para la primera prueba, si adminError existe, asumiremos que es válido solo por Auth.
      
      // 3. Redireccionar al Dashboard
      window.location.href = '/admin';

    } catch (error: any) {
      console.error('Login error:', error);
      setErrorMsg('Credenciales incorrectas o acceso no autorizado.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-secondary-100">
      <div className="p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-display font-bold text-secondary-900">
            Panel Administrativo
          </h2>
          <p className="text-secondary-500 text-sm mt-2">
            Ingresa tus credenciales para continuar
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {errorMsg && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 text-center">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-secondary-700 mb-2">
              Email
            </label>
            <input
              type="email"
              {...register('email')}
              className={cn(
                "w-full px-4 py-3 border rounded-lg transition-all outline-none focus:ring-2 focus:ring-primary-500",
                errors.email ? "border-red-500" : "border-secondary-200"
              )}
              placeholder="admin@lareserva.pe"
            />
            {errors.email && (
              <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-secondary-700 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              {...register('password')}
              className={cn(
                "w-full px-4 py-3 border rounded-lg transition-all outline-none focus:ring-2 focus:ring-primary-500",
                errors.password ? "border-red-500" : "border-secondary-200"
              )}
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-secondary-900 text-white font-bold py-3 rounded-lg hover:bg-secondary-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Ingresando...
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>
      </div>
      
      <div className="bg-secondary-50 p-4 text-center border-t border-secondary-100">
        <p className="text-xs text-secondary-400">
          Acceso restringido a personal autorizado
        </p>
      </div>
    </div>
  );
}