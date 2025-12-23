import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  User, Phone, MapPin, CreditCard, Save, Loader2, 
  Camera, Lock, KeyRound, AlertCircle, CheckCircle2,
  Eye, EyeOff // ✅ Importamos los iconos nuevos
} from 'lucide-react';
import type { AdminUser } from '@/types';

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
  
  // ✅ Nuevo estado para visibilidad
  const [showPassword, setShowPassword] = useState(false);

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

  // ... (Mantenemos handleImageUpload igual) ...
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
    } catch (error: any) {
      alert(`Error al subir imagen: ${error.message}`);
    } finally {
      setUploadingImage(false);
    }
  }

  // ... (Mantenemos handleUpdateProfile igual) ...
  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    try {
      setSavingProfile(true);
      const { error } = await supabase.from('admin_users').update({
          full_name: profile.full_name,
          phone: profile.phone,
          dni: profile.dni,
          address: profile.address,
        } as any).eq('id', profile.id);
      if (error) throw error;
      alert('Información actualizada correctamente');
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setSavingProfile(false);
    }
  }

  // ... (Mantenemos handleChangePassword igual) ...
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
      setPasswordMsg({ type: 'success', text: 'Contraseña actualizada.' });
      setPasswords({ new: '', confirm: '' });
    } catch (error: any) {
      setPasswordMsg({ type: 'error', text: error.message });
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;
  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      {/* ... (SECCIÓN SUPERIOR DE PERFIL SE MANTIENE IGUAL) ... */}
       <div className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
        <div className="h-32 bg-secondary-900 relative">
          <div className="absolute -bottom-12 left-8 flex items-end group">
            <div className="relative cursor-pointer" onClick={() => !uploadingImage && fileInputRef.current?.click()}>
              <div className="w-24 h-24 bg-white rounded-full p-1 shadow-lg relative">
                <div className="w-full h-full bg-secondary-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-primary-500 relative">
                  {uploadingImage ? (
                    <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                  ) : profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-secondary-400">{profile.full_name?.charAt(0).toUpperCase()}</span>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="text-white w-8 h-8" />
                  </div>
                </div>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
            </div>
            <div className="mb-12 ml-4">
              <h1 className="text-2xl font-bold text-white">{profile.full_name}</h1>
              <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-secondary-800 text-secondary-200 border border-secondary-700 capitalize">
                {profile.role === 'super_admin' ? 'Administrador' : profile.role}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="p-8 pt-16 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-secondary-900 flex items-center gap-2 border-b border-secondary-100 pb-2">
                <User className="w-5 h-5 text-primary-500" /> Información Personal
              </h3>
              <div>
                <label className="block text-xs font-bold text-secondary-500 uppercase mb-1">Nombre Completo</label>
                <input type="text" value={profile.full_name || ''} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-secondary-500 uppercase mb-1">DNI / Documento</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-2.5 w-4 h-4 text-secondary-400" />
                  <input type="text" value={profile.dni || ''} onChange={(e) => setProfile({ ...profile, dni: e.target.value })} className="w-full pl-10 pr-4 py-2 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-secondary-900 flex items-center gap-2 border-b border-secondary-100 pb-2">
                <Phone className="w-5 h-5 text-primary-500" /> Contacto
              </h3>
              <div>
                <label className="block text-xs font-bold text-secondary-500 uppercase mb-1">Teléfono</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 w-4 h-4 text-secondary-400" />
                  <input type="text" value={profile.phone || ''} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="w-full pl-10 pr-4 py-2 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-secondary-500 uppercase mb-1">Dirección</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-secondary-400" />
                  <textarea value={profile.address || ''} onChange={(e) => setProfile({ ...profile, address: e.target.value })} className="w-full pl-10 pr-4 py-2 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none h-24" />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 flex justify-end">
            <button type="submit" disabled={savingProfile} className="px-6 py-2.5 bg-secondary-900 text-white font-bold rounded-lg hover:bg-secondary-800 transition-all flex items-center gap-2 disabled:opacity-70">
              {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar Información
            </button>
          </div>
        </form>
      </div>

      {/* SECCIÓN SEGURIDAD */}
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-8">
        <h3 className="text-lg font-semibold text-secondary-900 flex items-center gap-2 border-b border-secondary-100 pb-2 mb-6">
          <Lock className="w-5 h-5 text-primary-500" /> Seguridad
        </h3>

        <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div className="space-y-4">
            {/* Nueva Contraseña */}
            <div>
              <label className="block text-xs font-bold text-secondary-500 uppercase mb-1">Nueva Contraseña</label>
              <div className="relative group">
                <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-secondary-400" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={passwords.new}
                  onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                  className="w-full pl-10 pr-12 py-2 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-secondary-400 hover:text-secondary-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirmar Contraseña */}
            <div>
              <label className="block text-xs font-bold text-secondary-500 uppercase mb-1">Confirmar Contraseña</label>
              <div className="relative group">
                <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-secondary-400" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                  className="w-full pl-10 pr-12 py-2 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  placeholder="Repite la contraseña"
                />
                 {/* No necesitamos botón aquí si el de arriba controla ambos, o puedes poner otro si prefieres control individual */}
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-end h-full space-y-4">
            <div className="text-sm text-secondary-500 bg-secondary-50 p-4 rounded-lg border border-secondary-100">
              <p className="font-semibold mb-1">Requisitos:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Mínimo 6 caracteres.</li>
                <li>Usa mayúsculas y símbolos para mayor seguridad.</li>
              </ul>
            </div>
            
            <div className="flex items-center gap-4 justify-end">
              {passwordMsg && (
                <div className={`text-sm flex items-center gap-2 ${passwordMsg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                  {passwordMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {passwordMsg.text}
                </div>
              )}
              <button 
                type="submit" 
                disabled={savingPassword || !passwords.new} 
                className="px-6 py-2.5 bg-white border border-secondary-200 text-secondary-900 font-bold rounded-lg hover:bg-secondary-50 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Actualizar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}