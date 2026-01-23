import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase'; // Asegúrate de que esta ruta sea correcta en tu proyecto
import { Lock, Loader2, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

// --- SCHEMA DE VALIDACIÓN ---
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
  
  // Estado para verificar si el usuario llegó con un token válido
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
  });

  // 1. VERIFICAR SESIÓN AL CARGAR
  // Cuando el usuario hace clic en el link del correo, Supabase lo loguea temporalmente.
  // Debemos verificar esa sesión antes de dejarle cambiar la password.
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setErrorMsg('El enlace ha expirado o es inválido. Por favor solicita uno nuevo desde el login.');
      }
      setIsCheckingSession(false);
    };
    checkSession();
  }, []);

  // 2. MANEJAR EL CAMBIO DE CONTRASEÑA
  const onSubmit = async (data: ResetFormData) => {
    setErrorMsg(null);
    try {
      // updateUser funciona porque el usuario tiene una sesión activa gracias al link mágico
      const { error } = await supabase.auth.updateUser({
        password: data.password
      });

      if (error) throw error;

      setIsSuccess(true);
      
      // Redirigir al login después de 3 segundos
      setTimeout(() => {
        window.location.href = '/admin/login';
      }, 3000);

    } catch (error: any) {
      console.error(error);
      setErrorMsg('No se pudo actualizar la contraseña. Es posible que el enlace haya caducado.');
    }
  };

  // --- RENDER: ESTADO DE CARGA ---
  if (isCheckingSession) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full flex flex-col items-center justify-center space-y-4 min-h-[300px]">
        <Loader2 className="animate-spin text-primary-500" size={40} />
        <p className="text-secondary-500 text-sm font-medium">Verificando credenciales de seguridad...</p>
      </div>
    );
  }

  // --- RENDER: ÉXITO ---
  if (isSuccess) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-xl text-center w-full border border-green-100 animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
          <CheckCircle size={32} />
        </div>
        <h2 className="text-2xl font-bold text-secondary-900 mb-2">¡Contraseña Actualizada!</h2>
        <p className="text-secondary-500 text-sm mb-6">
          Has recuperado el acceso a tu cuenta correctamente.
        </p>
        <div className="inline-flex items-center gap-2 text-primary-600 font-bold text-sm bg-primary-50 px-5 py-2.5 rounded-full">
          <Loader2 size={16} className="animate-spin"/> Redirigiendo al login...
        </div>
      </div>
    );
  }

  // --- RENDER: FORMULARIO PRINCIPAL ---
  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl w-full border border-secondary-100 relative overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
      {/* Barra decorativa superior */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary-600 to-primary-400"></div>
      
      <div className="mb-8 text-center">
        <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4">
           <Lock size={24}/>
        </div>
        <h2 className="text-2xl font-bold text-secondary-900">Nueva Contraseña</h2>
        <p className="text-secondary-500 text-sm mt-2">
          Crea una contraseña segura para tu cuenta.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Mensaje de Error Global */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex gap-3 items-start animate-in fade-in">
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        <div className="space-y-5">
          {/* Input: Nueva Contraseña */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-secondary-700 uppercase tracking-wide ml-1">
              Nueva Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                {...register('password')}
                className={`w-full pl-4 pr-10 py-3 bg-white border rounded-xl outline-none transition-all shadow-sm resize-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.password ? "border-red-300 focus:ring-red-100" : "border-secondary-200"
                }`}
                placeholder="Mínimo 6 caracteres"
                disabled={!!errorMsg && !errorMsg.includes('intentar')} // Bloquear si el token es inválido
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-primary-600 transition-colors p-1"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-500 font-medium ml-1">{errors.password.message}</p>}
          </div>

          {/* Input: Confirmar Contraseña */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-secondary-700 uppercase tracking-wide ml-1">
              Confirmar Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                {...register('confirmPassword')}
                className={`w-full pl-4 pr-10 py-3 bg-white border rounded-xl outline-none transition-all shadow-sm resize-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.confirmPassword ? "border-red-300 focus:ring-red-100" : "border-secondary-200"
                }`}
                placeholder="Repite tu contraseña"
                disabled={!!errorMsg && !errorMsg.includes('intentar')}
              />
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 pointer-events-none" size={18} />
            </div>
            {errors.confirmPassword && <p className="text-xs text-red-500 font-medium ml-1">{errors.confirmPassword.message}</p>}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || (!!errorMsg && !errorMsg.includes('intentar'))}
          className="w-full bg-secondary-900 text-white font-bold py-3.5 rounded-xl hover:bg-black hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:bg-secondary-900 disabled:hover:translate-y-0 flex justify-center items-center gap-2 shadow-md shadow-secondary-900/10"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Actualizando...
            </>
          ) : (
            'Cambiar Contraseña'
          )}
        </button>
      </form>
    </div>
  );
}