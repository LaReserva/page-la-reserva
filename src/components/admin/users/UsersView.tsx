import { useState, useEffect } from 'react';
import { 
  Search, Users, Mail, Shield, Loader2, Edit, Trash2, 
  Plus, CheckCircle, XCircle 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { AdminUser, UserRole } from '@/types';
import { UserModal } from './UserModal';
import { useUserRole } from '@/hooks/useUserRole';

// --- COMPONENTE INTERNO: FEEDBACK (Reutilizado para consistencia) ---
interface FeedbackModalProps {
  isOpen: boolean;
  type: 'success' | 'error';
  title: string;
  message: string;
  onClose: () => void;
}

function FeedbackModal({ isOpen, type, title, message, onClose }: FeedbackModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-secondary-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95 text-center border border-secondary-100">
        <div className={`mx-auto flex items-center justify-center h-14 w-14 rounded-full mb-4 ${type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
          {type === 'success' ? <CheckCircle className="h-8 w-8 text-green-600" /> : <XCircle className="h-8 w-8 text-red-600" />}
        </div>
        <h3 className="text-lg font-bold text-secondary-900 mb-2">{title}</h3>
        <p className="text-secondary-500 mb-6 text-sm">{message}</p>
        <button onClick={onClose} className={`w-full py-2.5 rounded-xl font-bold text-white transition-transform active:scale-95 ${type === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
          Entendido
        </button>
      </div>
    </div>
  );
}

export function UsersView() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para Modal de Edición/Creación
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estado para Feedback
  const [feedback, setFeedback] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({
    isOpen: false, type: 'success', title: '', message: ''
  });

  // Solo Super Admin debería ver esta página, pero por seguridad usamos el hook
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
      
      // Mapeo seguro para asegurar que el rol coincida con el tipo UserRole
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

  // --- HANDLERS ---

  const handleCreateUser = () => {
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  const handleEditUser = (user: AdminUser) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleDeleteUser = async (user: AdminUser) => {
    if (!window.confirm(`¿Estás seguro de eliminar a ${user.full_name}? Esta acción no se puede deshacer.`)) return;

    try {
      const { error } = await supabase
        .from('admin_users')
        .delete()
        .eq('id', user.id);

      if (error) throw error;

      showFeedback('success', 'Usuario eliminado', `Se ha eliminado a ${user.full_name} correctamente.`);
      fetchUsers(); // Recargar lista
    } catch (error) {
      console.error('Error deleting user:', error);
      showFeedback('error', 'Error al eliminar', 'No se pudo eliminar el usuario. Verifica los permisos.');
    }
  };

  const handleSaveUser = async (userData: Partial<AdminUser>) => {
    try {
      if (selectedUser) {
        // --- ACTUALIZAR ---
        const { error } = await supabase
          .from('admin_users')
          .update({
            full_name: userData.full_name,
            role: userData.role,
            // Nota: El email en supabase auth es delicado de cambiar, aquí actualizamos el perfil público
            email: userData.email, 
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedUser.id);

        if (error) throw error;
        showFeedback('success', 'Usuario Actualizado', 'Los datos del usuario se guardaron correctamente.');
      } else {
        // --- CREAR ---
        // Nota: Esto crea el perfil en la tabla pública. 
        // Idealmente debería haber un trigger o una Edge Function para crear el Auth User.
        const { error } = await supabase
          .from('admin_users')
          .insert({
            full_name: userData.full_name!,
            email: userData.email!,
            role: userData.role!,
            // Generamos un ID temporal o dejamos que la BD lo maneje si tienes default gen_random_uuid()
            // Como en tu tipo database.ts el ID es string, asumimos que debe generarse.
            // Si tu BD no tiene default, podrías necesitar crypto.randomUUID() aquí.
          });

        if (error) throw error;
        showFeedback('success', 'Usuario Creado', 'El nuevo perfil de usuario ha sido registrado.');
      }
      fetchUsers();
    } catch (error: any) {
      console.error('Error saving user:', error);
      showFeedback('error', 'Error al guardar', error.message || 'Ocurrió un error inesperado.');
      throw error; // Para que el modal sepa que falló
    }
  };

  // --- FILTRADO ---
  const filteredUsers = users.filter(user => 
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- UTILS PARA BADGES ---
  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'sales': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'operations': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
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
      {/* Toolbar */}
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

          {/* Botón Crear - Solo visible si es Super Admin (Opcional, según tus reglas) */}
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

      {/* Tabla */}
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
                            {/* ✅ LÓGICA DE FOTO DE PERFIL: Si existe URL, muestra img, sino Iniciales */}
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
                            onClick={() => handleDeleteUser(user)}
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

      {/* Modales */}
      <UserModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={selectedUser}
        onSave={handleSaveUser}
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