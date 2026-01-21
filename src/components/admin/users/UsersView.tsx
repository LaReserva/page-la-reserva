// src/components/admin/users/UsersView.tsx
import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { 
  Search, Users, Mail, Shield, Loader2, Edit, Trash2, 
  Plus, CheckCircle, XCircle, AlertTriangle 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { AdminUser, UserRole } from '@/types';
import { UserModal } from './UserModal';
import { useUserRole } from '@/hooks/useUserRole';

// --- COMPONENTE INTERNO: FEEDBACK (HEADLESS UI) ---
interface FeedbackModalProps {
  isOpen: boolean;
  type: 'success' | 'error';
  title: string;
  message: string;
  onClose: () => void;
}

function FeedbackModal({ isOpen, type, title, message, onClose }: FeedbackModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[100]" onClose={onClose}>
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
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white p-6 text-center align-middle shadow-xl transition-all border border-secondary-100">
                <div className={`mx-auto flex items-center justify-center h-14 w-14 rounded-full mb-4 ${type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
                  {type === 'success' ? <CheckCircle className="h-8 w-8 text-green-600" /> : <XCircle className="h-8 w-8 text-red-600" />}
                </div>
                <Dialog.Title as="h3" className="text-lg font-bold text-secondary-900 mb-2">
                  {title}
                </Dialog.Title>
                <div className="mt-2">
                  <p className="text-sm text-secondary-500 mb-6">
                    {message}
                  </p>
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    className={`w-full inline-flex justify-center rounded-xl border border-transparent px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-all active:scale-95 ${
                      type === 'success' 
                        ? 'bg-green-600 hover:bg-green-700 focus-visible:ring-green-500' 
                        : 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500'
                    }`}
                    onClick={onClose}
                  >
                    Entendido
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

// --- COMPONENTE INTERNO: DELETE CONFIRMATION (HEADLESS UI) ---
interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName: string;
}

function DeleteConfirmationModal({ isOpen, onClose, onConfirm, userName }: DeleteConfirmationModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-secondary-900/40 backdrop-blur-sm" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all border border-secondary-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-red-50 rounded-full text-red-600">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <Dialog.Title as="h3" className="text-lg font-bold text-secondary-900">
                    ¿Eliminar usuario?
                  </Dialog.Title>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-secondary-500">
                    Estás a punto de eliminar a <span className="font-bold text-secondary-900">{userName}</span>. Esta acción es irreversible y perderá acceso al panel inmediatamente.
                  </p>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-xl border border-transparent px-4 py-2 text-sm font-medium text-secondary-700 bg-secondary-100 hover:bg-secondary-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500 focus-visible:ring-offset-2 transition-colors"
                    onClick={onClose}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-xl border border-transparent px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 shadow-lg shadow-red-200 transition-all active:scale-95"
                    onClick={onConfirm}
                  >
                    Sí, eliminar
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

export function UsersView() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);

  const [feedback, setFeedback] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({
    isOpen: false, type: 'success', title: '', message: ''
  });

  const { isSuperAdmin } = useUserRole();

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const typedUsers: AdminUser[] = (data || []).map(u => ({
        ...u,
        role: u.role as UserRole
      }));
      
      setUsers(typedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      showFeedback('error', 'Error de carga', 'No se pudieron cargar los usuarios.');
    } finally {
      setLoading(false);
    }
  }

  const showFeedback = (type: 'success' | 'error', title: string, message: string) => {
    setFeedback({ isOpen: true, type, title, message });
  };

  const handleCreateUser = () => {
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  const handleEditUser = (user: AdminUser) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const requestDeleteUser = (user: AdminUser) => {
    setUserToDelete(user);
  };

  const executeDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      const { error } = await supabase
        .from('admin_users')
        .delete()
        .eq('id', userToDelete.id);

      if (error) throw error;

      showFeedback('success', 'Usuario eliminado', `Se ha eliminado a ${userToDelete.full_name} correctamente.`);
      fetchUsers(); 
    } catch (error) {
      console.error('Error deleting user:', error);
      showFeedback('error', 'Error al eliminar', 'No se pudo eliminar el usuario. Verifica los permisos.');
    } finally {
      setUserToDelete(null); 
    }
  };

  // --- 🔥 FUNCIÓN CORREGIDA: handleSaveUser ---
  const handleSaveUser = async (userData: Partial<AdminUser>) => {
    try {
      if (selectedUser) {
        // --- ACTUALIZAR ---
        // IMPORTANTE: No enviamos 'email' en el update.
        // Si las políticas RLS bloquean update de email, fallaría todo.
        const { data, error } = await supabase
          .from('admin_users')
          .update({
            full_name: userData.full_name,
            role: userData.role,
            // email: userData.email, <--- ELIMINADO para evitar bloqueos RLS
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedUser.id)
          .select(); // <--- IMPORTANTE: Solicitar retorno de datos para verificar

        if (error) throw error;

        // VERIFICACIÓN DE SEGURIDAD (RLS Silencioso)
        // Si data está vacío, significa que RLS bloqueó la escritura aunque no dio error 500
        if (!data || data.length === 0) {
            throw new Error("No tienes permisos para editar este usuario (Bloqueo RLS).");
        }

        showFeedback('success', 'Usuario Actualizado', 'Los datos del usuario se guardaron correctamente.');
      } else {
        // --- CREAR ---
        const { error } = await supabase
          .from('admin_users')
          .insert({
            full_name: userData.full_name!,
            email: userData.email!,
            role: userData.role!,
          });

        if (error) throw error;
        showFeedback('success', 'Usuario Creado', 'El nuevo perfil de usuario ha sido registrado.');
      }
      fetchUsers();
    } catch (error: any) {
      console.error('Error saving user:', error);
      // Mensaje amigable si es error RLS
      const msg = error.message === "No tienes permisos para editar este usuario (Bloqueo RLS)." 
        ? error.message 
        : 'Ocurrió un error inesperado al guardar.';
      
      showFeedback('error', 'Error al guardar', msg);
      throw error; 
    }
  };

  const filteredUsers = users.filter(user => 
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'sales': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'operations': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-secondary-50 text-secondary-600 border-secondary-200';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'sales': return 'Ventas';
      case 'operations': return 'Operaciones';
      default: return role;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 bg-white rounded-xl border border-secondary-200">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-secondary-200">
        <div className="flex items-center gap-2 text-secondary-500">
          <Users className="w-5 h-5" />
          <span className="font-medium">{users.length} Usuarios del equipo</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-secondary-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
            />
          </div>

          {isSuperAdmin && (
            <button 
              onClick={handleCreateUser}
              className="px-4 py-2 bg-secondary-900 text-white text-sm font-bold rounded-lg shadow hover:bg-secondary-800 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nuevo Usuario
            </button>
          )}
        </div>
      </div>

      <Transition
        appear
        show={true}
        enter="transition-opacity duration-500"
        enterFrom="opacity-0"
        enterTo="opacity-100"
      >
        <div className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
          {filteredUsers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-secondary-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-secondary-300" />
              </div>
              <h3 className="text-secondary-900 font-medium mb-1">No se encontraron usuarios</h3>
              <p className="text-secondary-500 text-sm">Intenta con otro término de búsqueda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-secondary-50/50 text-secondary-500 font-medium border-b border-secondary-200">
                  <tr>
                    <th className="px-6 py-4">Usuario</th>
                    <th className="px-6 py-4">Rol de Acceso</th>
                    <th className="px-6 py-4">Fecha Registro</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-secondary-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {user.avatar_url ? (
                            <img 
                              src={user.avatar_url} 
                              alt={user.full_name} 
                              className="w-10 h-10 rounded-full object-cover border border-secondary-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-secondary-100 text-secondary-600 flex items-center justify-center font-bold text-xs border border-secondary-200">
                              {user.full_name ? user.full_name.substring(0, 2).toUpperCase() : '??'}
                            </div>
                          )}

                          <div>
                            <div className="font-bold text-secondary-900">{user.full_name}</div>
                            <div className="flex items-center gap-1 text-xs text-secondary-500 mt-0.5">
                              <Mail className="w-3 h-3" />
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getRoleBadgeStyle(user.role)}`}>
                          <Shield className="w-3 h-3" />
                          {getRoleLabel(user.role)}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-secondary-500">
                        {new Date(user.created_at).toLocaleDateString('es-PE', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>

                      <td className="px-6 py-4 text-right">
                        {isSuperAdmin && (
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleEditUser(user)}
                              className="p-2 text-secondary-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                              title="Editar Usuario"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            
                            <button 
                              onClick={() => requestDeleteUser(user)}
                              className="p-2 text-secondary-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar Usuario"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Transition>

      <UserModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={selectedUser}
        onSave={handleSaveUser}
      />

      <DeleteConfirmationModal
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={executeDeleteUser}
        userName={userToDelete?.full_name || ''}
      />

      <FeedbackModal 
        isOpen={feedback.isOpen}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={() => setFeedback(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}