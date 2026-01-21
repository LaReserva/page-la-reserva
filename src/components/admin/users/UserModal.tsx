import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Save, Loader2, Mail, User, Info, ExternalLink, Shield, ChevronDown } from 'lucide-react';
import type { AdminUser, UserRole } from '@/types';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUser | null;
  onSave: (userData: Partial<AdminUser>) => Promise<void>;
}

// Definimos los roles claramente
const ROLES: { id: UserRole; name: string; description: string }[] = [
  { id: 'super_admin', name: 'Super Admin', description: 'Acceso total a configuración y finanzas.' },
  { id: 'sales', name: 'Ventas (Sales)', description: 'Gestión de leads, clientes y cotizaciones.' },
  { id: 'operations', name: 'Operaciones', description: 'Vista de eventos confirmados y logística.' },
];

export function UserModal({ isOpen, onClose, user, onSave }: UserModalProps) {
  const [loading, setLoading] = useState(false);
  
  // Estado inicial seguro
  const [formData, setFormData] = useState<{
    full_name: string;
    email: string;
    role: UserRole;
  }>({
    full_name: '',
    email: '',
    role: 'sales', // Valor por defecto seguro
  });

  // Efecto para cargar datos cuando se abre el modal
  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        role: user.role || 'sales',
      });
    } else if (isOpen && !user) {
      setFormData({ full_name: '', email: '', role: 'sales' });
    }
  }, [isOpen, user?.id]); // Solo se ejecuta al abrir o cambiar de usuario

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      
      // Enviamos solo los campos editables
      await onSave({
        full_name: formData.full_name,
        role: formData.role
      });
      
      onClose();
    } catch (error) {
      console.error("Error CRÍTICO al guardar en UserModal:", error);
      alert("Error al guardar. Revisa la consola (F12) para más detalles.");
    } finally {
      setLoading(false);
    }
  };

  // Helper para mostrar descripción dinámica
  const currentRoleDescription = ROLES.find(r => r.id === formData.role)?.description;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-secondary-900/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform rounded-2xl bg-white text-left align-middle shadow-xl transition-all border border-secondary-100">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-100 bg-secondary-50/50 rounded-t-2xl">
                  <Dialog.Title as="h3" className="text-lg font-bold text-secondary-900 flex items-center gap-2">
                    {user ? (
                      <>
                        <div className="p-1.5 bg-primary-100 rounded-lg text-primary-700">
                           <User className="w-4 h-4" />
                        </div>
                        Editar Usuario
                      </>
                    ) : (
                      <>
                        <div className="p-1.5 bg-blue-100 rounded-lg text-blue-700">
                           <Info className="w-4 h-4" />
                        </div>
                        Nuevo Usuario
                      </>
                    )}
                  </Dialog.Title>
                  <button onClick={onClose} className="p-1.5 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 rounded-lg transition-colors focus:outline-none">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Contenido */}
                {user ? (
                  <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    
                    {/* Nombre */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-secondary-500 uppercase tracking-wide">Nombre Completo</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                        <input
                          type="text"
                          required
                          value={formData.full_name}
                          onChange={e => setFormData({...formData, full_name: e.target.value})}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-secondary-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-sm text-secondary-900 placeholder:text-secondary-400"
                        />
                      </div>
                    </div>

                    {/* Email (Solo lectura) */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-secondary-500 uppercase tracking-wide">Correo Electrónico</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                        <input
                          type="email"
                          disabled
                          value={formData.email}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-secondary-200 bg-secondary-50 text-secondary-500 outline-none text-sm cursor-not-allowed"
                        />
                      </div>
                      <p className="text-[10px] text-secondary-400 italic flex gap-1 items-center">
                        <Info className="w-3 h-3"/> El correo está vinculado a la cuenta y no se puede editar.
                      </p>
                    </div>

                    {/* SELECT NATIVO PARA EL ROL (Solución al bug visual) */}
                    <div className="space-y-1.5 relative">
                      <label className="text-xs font-bold text-secondary-500 uppercase tracking-wide flex items-center gap-2">
                        Rol de Acceso <Shield className="w-3 h-3 text-secondary-400"/>
                      </label>
                      
                      <div className="relative">
                        <select
                          value={formData.role}
                          onChange={(e) => {
                             // Actualización forzada del estado
                             const val = e.target.value as UserRole;
                             setFormData(prev => ({ ...prev, role: val }));
                          }}
                          className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-secondary-200 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-sm appearance-none cursor-pointer font-bold text-secondary-900"
                        >
                          {ROLES.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                        
                        {/* Icono de flecha personalizado sobre el select nativo */}
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-secondary-500">
                          <ChevronDown className="h-4 w-4" />
                        </div>
                      </div>

                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mt-2 transition-all">
                        <p className="text-xs text-blue-700 leading-relaxed">
                          {currentRoleDescription}
                        </p>
                      </div>
                    </div>

                    {/* Botones */}
                    <div className="flex gap-3 pt-4 border-t border-secondary-100 mt-4">
                      <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 text-secondary-600 font-medium hover:bg-secondary-50 rounded-xl transition-colors text-sm border border-secondary-200"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 py-2.5 bg-secondary-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-lg shadow-secondary-900/20 flex items-center justify-center gap-2 text-sm disabled:opacity-70"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Guardar Cambios
                      </button>
                    </div>
                  </form>

                ) : (
                  /* MODO CREAR (INFO) */
                  <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-5 ring-4 ring-blue-50/50">
                      <Mail className="w-8 h-8" />
                    </div>
                    
                    <h3 className="text-xl font-bold text-secondary-900 mb-2">
                      Agregar nuevo miembro
                    </h3>
                    
                    <p className="text-secondary-500 text-sm mb-8 leading-relaxed max-w-xs mx-auto">
                      La gestión de altas se realiza desde Supabase. Una vez registrado, el usuario aparecerá aquí automáticamente.
                    </p>

                    <div className="flex flex-col gap-3">
                      <a 
                        href="https://supabase.com/dashboard/project/_/auth/users" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-full py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-primary-200 hover:shadow-lg hover:-translate-y-0.5"
                      >
                        Ir a Invitar Usuarios <ExternalLink className="w-4 h-4" />
                      </a>
                      
                      <button
                        onClick={onClose}
                        className="w-full py-3 text-secondary-600 font-medium hover:bg-secondary-50 rounded-xl transition-colors"
                      >
                        Entendido, cerrar
                      </button>
                    </div>
                  </div>
                )}

              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}