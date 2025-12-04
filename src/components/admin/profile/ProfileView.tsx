import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Phone, MapPin, CreditCard, Save, Loader2, Camera } from 'lucide-react';
import type { AdminUser } from '@/types';

export function ProfileView() {
  const [profile, setProfile] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      setProfile(data as AdminUser);
    } catch (error) {
      console.error('Error al cargar perfil:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('admin_users')
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          dni: profile.dni,
          address: profile.address,
        })
        .eq('id', profile.id);

      if (error) throw error;
      alert('Perfil actualizado correctamente');
    } catch (error: any) {
      console.error('Error al actualizar:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;
  }

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
        
        {/* Header con Banner */}
        <div className="h-32 bg-secondary-900 relative">
          <div className="absolute -bottom-12 left-8 flex items-end">
            <div className="relative">
              <div className="w-24 h-24 bg-white rounded-full p-1 shadow-lg">
                <div className="w-full h-full bg-secondary-100 rounded-full flex items-center justify-center text-2xl font-bold text-secondary-400 overflow-hidden border-2 border-primary-500">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{profile.full_name?.charAt(0).toUpperCase() || 'A'}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="mb-12 ml-4">
              <h1 className="text-2xl font-bold text-white">{profile.full_name}</h1>
              <p className="text-secondary-300 text-sm capitalize">{profile.role === 'super_admin' ? 'Super Admin' : profile.role}</p>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-8 pt-16 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Información Personal */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-secondary-900 flex items-center gap-2 border-b border-secondary-100 pb-2">
                <User className="w-5 h-5 text-primary-500" /> Información Personal
              </h3>
              
              <div>
                <label className="block text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={profile.full_name || ''}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1">DNI / Documento</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400"><CreditCard className="w-4 h-4" /></span>
                  <input
                    type="text"
                    value={profile.dni || ''}
                    onChange={(e) => setProfile({ ...profile, dni: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="00000000"
                  />
                </div>
              </div>
            </div>

            {/* Contacto */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-secondary-900 flex items-center gap-2 border-b border-secondary-100 pb-2">
                <Phone className="w-5 h-5 text-primary-500" /> Contacto
              </h3>

              <div>
                <label className="block text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1">Teléfono / Celular</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400"><Phone className="w-4 h-4" /></span>
                  <input
                    type="text"
                    value={profile.phone || ''}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="+51 999 999 999"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1">Dirección</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-secondary-400"><MapPin className="w-4 h-4" /></span>
                  <textarea
                    value={profile.address || ''}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500 resize-none h-24"
                    placeholder="Av. Principal 123..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-10 pt-6 border-t border-secondary-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-secondary-900 text-white font-bold rounded-lg hover:bg-secondary-800 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 disabled:opacity-70"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
              ) : (
                <><Save className="w-4 h-4" /> Guardar Cambios</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}