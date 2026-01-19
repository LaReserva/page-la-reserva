// src/components/admin/profile/ProfileView.tsx
import { useState, useEffect, useRef, Fragment } from 'react';
import { supabase } from '@/lib/supabase';
import { Dialog, Transition } from '@headlessui/react';
import { 
  User, Phone, MapPin, CreditCard, Save, Loader2, 
  Camera, Lock, KeyRound, AlertCircle, CheckCircle2,
  Eye, EyeOff, XCircle, CheckCircle
} from 'lucide-react';
import type { AdminUser } from '@/types';
// IMPORTAMOS EL VALIDADOR EXISTENTE
import { isValidPeruvianPhone } from '@/utils/utils';

// --- COMPONENTE INTERNO: FEEDBACK MODAL ---
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
                        ? 'bg-green-600 hover:bg-green-700 shadow-green-200' 
                        : 'bg-red-600 hover:bg-red-700 shadow-red-200'
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

// --- COMPONENTE PRINCIPAL ---
export function ProfileView() {
  const [profile, setProfile] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Estados de carga
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Estados contraseña
  const [passwords, setPasswords] = useState({ new: '', confirm: '' });
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Estado Feedback Modal
  const [feedback, setFeedback] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({
    isOpen: false, type: 'success', title: '', message: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data as unknown as AdminUser);
    } catch (error) {
      console.error('Error al cargar perfil:', error);
    } finally {
      setLoading(false);
    }
  }

  // --- HANDLERS ---

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    if (!event.target.files || event.target.files.length === 0 || !profile) return;
    try {
      setUploadingImage(true);
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('admin_users').update({ avatar_url: publicUrl }).eq('id', profile.id);
      if (dbError) throw dbError;

      setProfile({ ...profile, avatar_url: publicUrl });
      setFeedback({ isOpen: true, type: 'success', title: 'Imagen Actualizada', message: 'Tu foto de perfil se ha subido correctamente.' });
    } catch (error: any) {
      setFeedback({ isOpen: true, type: 'error', title: 'Error', message: `No se pudo subir la imagen: ${error.message}` });
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    // --- 1. VALIDACIONES PREVIAS AL GUARDADO ---
    
    // Validación DNI (Debe tener 8 dígitos exactos)
    if (profile.dni && profile.dni.length !== 8) {
      setFeedback({ 
        isOpen: true, 
        type: 'error', 
        title: 'DNI Inválido', 
        message: 'El DNI debe tener exactamente 8 dígitos.' 
      });
      return;
    }

    // Validación Teléfono (Usando utils.ts)
    if (profile.phone && !isValidPeruvianPhone(profile.phone)) {
      setFeedback({ 
        isOpen: true, 
        type: 'error', 
        title: 'Teléfono Inválido', 
        message: 'Por favor, ingrese un número de celular válido (9 dígitos, formato Perú).' 
      });
      return;
    }

    try {
      setSavingProfile(true);
      const { error } = await supabase.from('admin_users').update({
          full_name: profile.full_name,
          phone: profile.phone,
          dni: profile.dni,
          address: profile.address,
        } as any).eq('id', profile.id);
      
      if (error) throw error;
      setFeedback({ isOpen: true, type: 'success', title: 'Perfil Actualizado', message: 'Tus datos personales se han guardado exitosamente.' });
    } catch (error: any) {
      setFeedback({ isOpen: true, type: 'error', title: 'Error al guardar', message: error.message });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);

    if (passwords.new.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Mínimo 6 caracteres.' });
      return;
    }
    if (passwords.new !== passwords.confirm) {
      setPasswordMsg({ type: 'error', text: 'Las contraseñas no coinciden.' });
      return;
    }

    try {
      setSavingPassword(true);
      const { error } = await supabase.auth.updateUser({ password: passwords.new });
      if (error) throw error;
      
      setPasswordMsg({ type: 'success', text: 'Contraseña actualizada correctamente.' });
      setPasswords({ new: '', confirm: '' });
    } catch (error: any) {
      setPasswordMsg({ type: 'error', text: error.message });
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) return <div className="flex justify-center items-center h-96"><Loader2 className="w-10 h-10 animate-spin text-secondary-400" /></div>;
  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10 animate-in fade-in duration-500">
      
      {/* TARJETA DE PERFIL Y DATOS */}
      <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 overflow-hidden">
        {/* Banner */}
        <div className="h-40 bg-secondary-900 relative pattern-grid-lg">
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          
          <div className="absolute -bottom-14 left-8 flex items-end group">
            {/* Avatar Upload */}
            <div className="relative cursor-pointer" onClick={() => !uploadingImage && fileInputRef.current?.click()}>
              <div className="w-28 h-28 bg-white rounded-full p-1.5 shadow-xl relative z-10">
                <div className="w-full h-full bg-secondary-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-secondary-100 relative">
                  {uploadingImage ? (
                    <Loader2 className="w-8 h-8 animate-spin text-secondary-500" />
                  ) : profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-secondary-400">{profile.full_name?.charAt(0).toUpperCase()}</span>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                    <Camera className="text-white w-8 h-8" />
                  </div>
                </div>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
            </div>
            
            <div className="mb-14 ml-5 z-10">
              <h1 className="text-3xl font-bold text-white drop-shadow-md">{profile.full_name}</h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white border border-white/30 backdrop-blur-sm uppercase tracking-wide mt-1">
                {profile.role === 'super_admin' ? 'Administrador' : profile.role}
              </span>
            </div>
          </div>
        </div>

        {/* Formulario Datos */}
        <form onSubmit={handleUpdateProfile} className="p-8 pt-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-secondary-900 flex items-center gap-2 border-b border-secondary-100 pb-3">
                <User className="w-5 h-5 text-secondary-500" /> Información Personal
              </h3>
              
              <div>
                <label className="block text-xs font-bold text-secondary-500 uppercase mb-1.5">Nombre Completo</label>
                <input 
                  type="text" 
                  value={profile.full_name || ''} 
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} 
                  className="w-full px-4 py-2.5 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-sm font-medium text-secondary-900" 
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-secondary-500 uppercase mb-1.5">DNI / Documento</label>
                <div className="relative">
                  <CreditCard className="absolute left-3.5 top-2.5 w-5 h-5 text-secondary-400" />
                  {/* --- VALIDACIÓN INPUT DNI --- */}
                  <input 
                    type="text" 
                    maxLength={8} // Límite visual HTML
                    inputMode="numeric" // Teclado numérico en móviles
                    value={profile.dni || ''} 
                    onChange={(e) => {
                      // Sanitización: Solo permite números
                      const val = e.target.value.replace(/\D/g, '');
                      setProfile({ ...profile, dni: val });
                    }} 
                    placeholder="8 dígitos"
                    className="w-full pl-11 pr-4 py-2.5 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-sm font-medium text-secondary-900" 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-bold text-secondary-900 flex items-center gap-2 border-b border-secondary-100 pb-3">
                <Phone className="w-5 h-5 text-secondary-500" /> Contacto
              </h3>
              
              <div>
                <label className="block text-xs font-bold text-secondary-500 uppercase mb-1.5">Teléfono</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-2.5 w-5 h-5 text-secondary-400" />
                  {/* --- VALIDACIÓN INPUT TELÉFONO --- */}
                  <input 
                    type="tel" // Semántica para móviles
                    maxLength={9} // Estándar Perú celular
                    inputMode="tel"
                    value={profile.phone || ''} 
                    onChange={(e) => {
                      // Sanitización: Solo permite números
                      const val = e.target.value.replace(/\D/g, '');
                      setProfile({ ...profile, phone: val });
                    }} 
                    placeholder="999 888 777"
                    className="w-full pl-11 pr-4 py-2.5 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-sm font-medium text-secondary-900" 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-secondary-500 uppercase mb-1.5">Dirección</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3 w-5 h-5 text-secondary-400" />
                  <textarea 
                    value={profile.address || ''} 
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })} 
                    className="w-full pl-11 pr-4 py-2.5 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none resize-none h-24 text-sm font-medium text-secondary-900" 
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-secondary-50 flex justify-end">
            <button 
              type="submit" 
              disabled={savingProfile} 
              className="px-6 py-2.5 bg-secondary-900 text-white font-bold rounded-xl hover:bg-black transition-all flex items-center gap-2 disabled:opacity-70 shadow-lg shadow-secondary-900/20 active:scale-95"
            >
              {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>

      {/* SECCIÓN SEGURIDAD */}
      <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 p-8">
        <h3 className="text-lg font-bold text-secondary-900 flex items-center gap-2 border-b border-secondary-100 pb-3 mb-6">
          <Lock className="w-5 h-5 text-secondary-500" /> Seguridad y Contraseña
        </h3>

        <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div className="space-y-5">
            {/* Nueva Contraseña */}
            <div>
              <label className="block text-xs font-bold text-secondary-500 uppercase mb-1.5">Nueva Contraseña</label>
              <div className="relative group">
                <KeyRound className="absolute left-3.5 top-2.5 w-5 h-5 text-secondary-400" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={passwords.new}
                  onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                  className="w-full pl-11 pr-12 py-2.5 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-sm font-medium"
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-secondary-400 hover:text-secondary-600 focus:outline-none p-0.5 rounded hover:bg-secondary-100 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirmar Contraseña */}
            <div>
              <label className="block text-xs font-bold text-secondary-500 uppercase mb-1.5">Confirmar Contraseña</label>
              <div className="relative group">
                <KeyRound className="absolute left-3.5 top-2.5 w-5 h-5 text-secondary-400" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                  className="w-full pl-11 pr-12 py-2.5 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-sm font-medium"
                  placeholder="Repite la contraseña"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-end h-full space-y-5">
            <div className="text-sm text-secondary-600 bg-secondary-50 p-5 rounded-xl border border-secondary-100">
              <p className="font-bold mb-2 text-secondary-900">Requisitos de seguridad:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>La contraseña debe tener al menos 6 caracteres.</li>
                <li>Recomendamos usar combinaciones de mayúsculas, números y símbolos.</li>
                <li>No compartas tu contraseña con nadie del equipo.</li>
              </ul>
            </div>
            
            <div className="flex items-center gap-4 justify-end pt-2">
              {passwordMsg && (
                <div className={`text-sm font-medium flex items-center gap-2 ${passwordMsg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                  {passwordMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {passwordMsg.text}
                </div>
              )}
              <button 
                type="submit" 
                disabled={savingPassword || !passwords.new} 
                className="px-6 py-2.5 bg-white border border-secondary-200 text-secondary-900 font-bold rounded-xl hover:bg-secondary-50 hover:border-secondary-300 transition-all flex items-center gap-2 disabled:opacity-50 shadow-sm active:scale-95"
              >
                {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Actualizar Contraseña
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Modal de Feedback Reemplazando Alert */}
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