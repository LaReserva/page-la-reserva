import { useState, useEffect } from 'react';
import { X, Save, Loader2, Shield, Mail, User, Info, ExternalLink } from 'lucide-react';
import type { AdminUser, UserRole } from '@/types';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUser | null; // Si es null, estamos en modo "Crear/Información"
  onSave: (userData: Partial<AdminUser>) => Promise<void>;
}

export function UserModal({ isOpen, onClose, user, onSave }: UserModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'sales' as UserRole,
  });

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      });
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-secondary-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-100 bg-secondary-50/50">
          <h2 className="text-lg font-bold text-secondary-900 flex items-center gap-2">
            {user ? (
              <>
                <User className="w-5 h-5 text-primary-600" />
                Editar Usuario
              </>
            ) : (
              <>
                <Info className="w-5 h-5 text-blue-600" />
                Nuevo Usuario
              </>
            )}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENIDO DEL MODAL */}
        {user ? (
          /* --- MODO EDICIÓN (Formulario Real) --- */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-secondary-700">Nombre Completo</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={e => setFormData({...formData, full_name: e.target.value})}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-secondary-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-secondary-700">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                <input
                  type="email"
                  disabled
                  value={formData.email}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-secondary-200 bg-secondary-50 text-secondary-500 outline-none text-sm cursor-not-allowed"
                  title="El correo no se puede cambiar ya que está vinculado al login"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-secondary-700">Rol de Acceso</label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                <select
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-secondary-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-sm appearance-none bg-white"
                >
                  <option value="sales">Ventas (Sales)</option>
                  <option value="operations">Operaciones</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <p className="text-xs text-secondary-500 px-1 mt-1">
                {formData.role === 'super_admin' && 'Tiene acceso total a configuraciones y finanzas.'}
                {formData.role === 'sales' && 'Puede gestionar leads, cotizaciones y clientes.'}
                {formData.role === 'operations' && 'Puede ver eventos confirmados y logística.'}
              </p>
            </div>

            <div className="flex gap-3 pt-4 mt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 text-secondary-600 font-medium hover:bg-secondary-50 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 bg-secondary-900 text-white font-bold rounded-xl hover:bg-secondary-800 transition-all shadow-lg shadow-secondary-900/20 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Guardar Cambios
              </button>
            </div>
          </form>

        ) : (
          /* --- MODO INFORMATIVO (Instrucciones para Crear) --- */
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8" />
            </div>
            
            <h3 className="text-lg font-bold text-secondary-900 mb-2">
              Cómo agregar un nuevo usuario
            </h3>
            
            <p className="text-secondary-500 text-sm mb-6 leading-relaxed">
              Para registrar un nuevo miembro del equipo, debes invitarlo desde el panel de autenticación de Supabase o pedirle que se registre.
              <br /><br />
              Una vez que acepte la invitación o se registre, <strong>aparecerá automáticamente en esta lista</strong> y podrás editar su rol.
            </p>

            <div className="flex flex-col gap-3">
              <a 
                href="https://supabase.com/dashboard/project/_/auth/users" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-all flex items-center justify-center gap-2"
              >
                Ir a Invitar Usuarios <ExternalLink className="w-4 h-4" />
              </a>
              
              <button
                onClick={onClose}
                className="w-full py-2.5 text-secondary-600 font-medium hover:bg-secondary-50 rounded-xl transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}