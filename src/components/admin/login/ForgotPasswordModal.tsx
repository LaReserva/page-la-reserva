import { useState, Fragment } from 'react';
import { useForm, type Resolver } from 'react-hook-form'; // ✅ Tipado manual
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, Transition } from '@headlessui/react'; // ✅ Headless UI
import { supabase } from '@/lib/supabase';
import { X, Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/utils/utils';

// --- CONFIGURACIÓN ---
const forgotSchema = z.object({
  email: z.string().email('Ingresa un correo válido'),
});

type ForgotFormData = z.infer<typeof forgotSchema>;

// Estilos consistentes con el resto de la UI
const INPUT_STYLES = "w-full pl-10 pr-4 py-2.5 bg-white border border-secondary-200 rounded-xl text-sm outline-none transition-all placeholder:text-secondary-400 focus:border-secondary-500 focus:ring-1 focus:ring-secondary-500 disabled:bg-secondary-50 disabled:text-secondary-400";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting }, 
    reset 
  } = useForm<ForgotFormData>({
    resolver: zodResolver(forgotSchema) as Resolver<ForgotFormData>, // ✅ Tu fix de TS
    defaultValues: { email: '' }
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
      setErrorMsg('No se pudo enviar el correo. Verifica tu conexión.');
    }
  };

  // Reseteamos el estado visual al cerrar
  const handleClose = () => {
    setIsSuccess(false);
    setErrorMsg(null);
    reset();
    onClose();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[100]" onClose={handleClose}>
        
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            
            {/* Panel */}
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 translate-y-4"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-4"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl transition-all border border-secondary-100">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-secondary-100 bg-secondary-50/50 flex justify-between items-center">
                  <Dialog.Title as="h3" className="text-lg font-bold text-secondary-900">
                    Recuperar Contraseña
                  </Dialog.Title>
                  <button 
                    onClick={handleClose} 
                    className="text-secondary-400 hover:text-secondary-700 hover:bg-secondary-100 p-1 rounded-full transition-colors outline-none focus:ring-2 focus:ring-secondary-300"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-6">
                  {/* Transición entre Formulario y Éxito */}
                  <Transition
                    show={isSuccess}
                    as={Fragment} // ✅ 1. Usamos Fragment para no renderizar elemento propio
                    enter="transition-opacity duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="transition-opacity duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    {/* ✅ 2. Movemos el className a un div contenedor */}
                    <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-white z-10">
                      
                      <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 animate-in zoom-in spin-in-12 duration-500">
                        <CheckCircle size={32} />
                      </div>
                      
                      <h4 className="text-xl font-bold text-secondary-900">¡Correo enviado!</h4>
                      
                      <p className="text-secondary-500 mt-2 text-sm max-w-xs mx-auto">
                        Revisa tu bandeja de entrada. Hemos enviado un enlace seguro para restablecer tu contraseña.
                      </p>
                      
                      <button 
                        onClick={handleClose}
                        className="mt-6 px-6 py-2.5 bg-secondary-900 text-white rounded-xl font-medium hover:bg-black transition-all shadow-lg shadow-secondary-900/10 active:scale-95"
                      >
                        Volver al Login
                      </button>
                    </div>
                  </Transition>

                  {/* Formulario */}
                  <div className={cn("transition-opacity duration-200", isSuccess ? "opacity-0 pointer-events-none" : "opacity-100")}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                      <p className="text-sm text-secondary-600">
                        Ingresa tu correo electrónico asociado a la cuenta y te enviaremos las instrucciones.
                      </p>

                      {/* Mensaje de Error */}
                      {errorMsg && (
                        <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium flex gap-2 items-start animate-in fade-in slide-in-from-top-1">
                          <AlertCircle size={16} className="mt-0.5 shrink-0" />
                          <span>{errorMsg}</span>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-secondary-600 uppercase tracking-wider ml-1">
                          Correo Electrónico
                        </label>
                        <div className="relative">
                          <Mail className={cn("absolute left-3 top-1/2 -translate-y-1/2 transition-colors", errors.email ? "text-red-400" : "text-secondary-400")} size={18} />
                          <input
                            type="email"
                            {...register('email')}
                            className={cn(
                              INPUT_STYLES,
                              errors.email && "border-red-300 focus:border-red-500 focus:ring-red-200"
                            )}
                            placeholder="ejemplo@lareserva.pe"
                            autoFocus
                          />
                        </div>
                        {errors.email && (
                          <p className="text-xs text-red-500 font-medium ml-1 animate-pulse">
                            {errors.email.message}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={handleClose}
                          className="flex-1 px-4 py-2.5 border border-secondary-200 text-secondary-700 rounded-xl font-medium hover:bg-secondary-50 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="flex-1 px-4 py-2.5 bg-secondary-900 text-white rounded-xl font-bold hover:bg-secondary-800 transition-all shadow-lg shadow-secondary-900/20 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 active:scale-[0.98]"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 size={18} className="animate-spin text-white/80" />
                              <span>Enviando...</span>
                            </>
                          ) : (
                            'Enviar enlace'
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}