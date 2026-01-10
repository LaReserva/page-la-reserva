// src/components/admin/users/UserModal.tsx
import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Save, Loader2, Shield, Mail, User, Info, ExternalLink } from 'lucide-react';
import type { AdminUser, UserRole } from '@/types';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUser | null; // null = Modo "Instrucciones para Crear"
  onSave: (userData: Partial<AdminUser>) => Promise<void>;
}

export function UserModal({ isOpen, onClose, user, onSave }: UserModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'sales' as UserRole,
  });

  // Reset del formulario al abrir/cambiar usuario
  useEffect(() => {
    if (isOpen) {
      if (user) {
        setFormData({
          full_name: user.full_name,
          email: user.email,
          role: user.role,
        });
      } else {
        // Reset opcional si quisieras campos limpios, aunque en modo "crear" solo mostramos info
        setFormData({ full_name: '', email: '', role: 'sales' });
      }
    }
  }, [user, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        
        {/* Backdrop (Fondo oscuro) */}
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
            
            {/* Panel del Modal */}
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all border border-secondary-100">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-100 bg-secondary-50/50">
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
                  <button 
                    onClick={onClose}
                    className="p-1.5 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 rounded-lg transition-colors focus:outline-none"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Contenido Dinámico */}
                {user ? (
                  /* --- MODO EDICIÓN --- */
                  <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    
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
                          placeholder="Ej: Juan Pérez"
                        />
                      </div>
                    </div>

                    {/* Email (Solo lectura) */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-secondary-500 uppercase tracking-wide">Correo Electrónico</label>
                      <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                        <input
                          type="email"
                          disabled
                          value={formData.email}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-secondary-200 bg-secondary-50 text-secondary-500 outline-none text-sm cursor-not-allowed"
                          title="El correo no se puede cambiar ya que está vinculado al login"
                        />
                        {/* Tooltip simple nativo o visual */}
                      </div>
                      <p className="text-[10px] text-secondary-400 italic">El correo está vinculado a la cuenta de acceso y no se puede editar aquí.</p>
                    </div>

                    {/* Rol */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-secondary-500 uppercase tracking-wide">Rol de Acceso</label>
                      <div className="relative">
                        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                        <select
                          value={formData.role}
                          onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-secondary-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-sm appearance-none bg-white cursor-pointer"
                        >
                          <option value="sales">Ventas (Sales)</option>
                          <option value="operations">Operaciones</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                        {/* Flecha custom para el select */}
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg className="w-4 h-4 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                      </div>
                      
                      {/* Descripción del Rol Seleccionado */}
                      <div className="bg-secondary-50 p-3 rounded-lg border border-secondary-100 mt-2">
                        <p className="text-xs text-secondary-600 flex gap-2 items-start">
                          <Info className="w-3.5 h-3.5 mt-0.5 text-secondary-400 shrink-0" />
                          <span>
                            {formData.role === 'super_admin' && 'Tiene acceso total a configuraciones, usuarios y finanzas.'}
                            {formData.role === 'sales' && 'Puede gestionar leads, crear cotizaciones y administrar clientes.'}
                            {formData.role === 'operations' && 'Puede ver eventos confirmados, calendario y logística.'}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex gap-3 pt-4 border-t border-secondary-100 mt-2">
                      <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 text-secondary-600 font-medium hover:bg-secondary-50 rounded-xl transition-colors text-sm"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 py-2.5 bg-secondary-900 text-white font-bold rounded-xl hover:bg-secondary-800 transition-all shadow-lg shadow-secondary-900/20 flex items-center justify-center gap-2 text-sm disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Guardar Cambios
                      </button>
                    </div>
                  </form>

                ) : (
                  /* --- MODO INFORMATIVO (Crear) --- */
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