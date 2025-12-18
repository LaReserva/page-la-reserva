import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { 
  Save, 
  Plus, 
  Trash2, 
  Settings, 
  Package as PackageIcon, 
  Coffee, 
  Loader2
} from 'lucide-react';
import type { SiteSetting, Package, Service } from '@/types';

// ==========================================
// Componente Auxiliar: Editor de Listas
// ==========================================
const FeatureListEditor = ({ 
  features, 
  onChange 
}: { 
  features: string[], 
  onChange: (f: string[]) => void 
}) => {
  const addFeature = () => onChange([...features, '']);
  
  const updateFeature = (index: number, value: string) => {
    const newFeatures = [...features];
    newFeatures[index] = value;
    onChange(newFeatures);
  };

  const removeFeature = (index: number) => {
    onChange(features.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Características (Features)</label>
      {features?.map((feature, idx) => (
        <div key={idx} className="flex gap-2">
          <input
            type="text"
            value={feature}
            onChange={(e) => updateFeature(idx, e.target.value)}
            // CAMBIO: focus:border-black focus:ring-black
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black focus:ring-1 text-sm p-2 border outline-none transition-colors"
            placeholder="Ej: Barra iluminada..."
          />
          <button
            type="button"
            onClick={() => removeFeature(idx)}
            className="text-gray-400 hover:text-red-600 p-2 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addFeature}
        // CAMBIO: text-gray-900 hover:text-black
        className="flex items-center gap-1 text-sm text-gray-800 hover:text-black font-medium mt-1 transition-colors"
      >
        <Plus className="w-3 h-3" /> Agregar característica
      </button>
    </div>
  );
};

// ==========================================
// Componente Interno con Lógica
// ==========================================
function SettingsContent() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'general' | 'packages' | 'services'>('general');
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Estados de Datos
  const [settings, setSettings] = useState<SiteSetting[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  // Verificación de Seguridad y Carga Inicial
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          window.location.href = '/admin/login'; 
          return;
        }

        const { data: userData, error: userError } = await supabase
          .from('admin_users')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (userError || userData?.role !== 'super_admin') {
          window.location.href = '/admin/dashboard';
          return;
        }

        const [settingsRes, packagesRes, servicesRes] = await Promise.all([
          supabase.from('site_settings').select('*'),
          supabase.from('packages').select('*').order('order_index'),
          supabase.from('services').select('*').order('order_index')
        ]);

        if (settingsRes.data) setSettings(settingsRes.data as unknown as SiteSetting[]);
        if (packagesRes.data) setPackages(packagesRes.data as unknown as Package[]);
        if (servicesRes.data) setServices(servicesRes.data as unknown as Service[]);

        setIsInitializing(false);

      } catch (error) {
        console.error('Error al inicializar:', error);
        showToast('Error de conexión o permisos', 'error');
      }
    };

    init();
  }, [showToast]);

  // Lógica General
  const getSettingValue = (key: string) => {
    const item = settings.find(s => s.key === key);
    return item?.value ? String(item.value) : '';
  };

  const updateSettingState = (key: string, value: string) => {
    setSettings(prev => {
      const exists = prev.find(s => s.key === key);
      if (exists) {
        return prev.map(s => s.key === key ? { ...s, value } : s);
      }
      return [...prev, { key, value, updated_at: new Date().toISOString() } as SiteSetting];
    });
  };

  const saveGeneralSettings = async () => {
    setLoading(true);
    try {
      const updates = settings.map(s => ({
        key: s.key,
        value: s.value,
        updated_at: new Date().toISOString()
      }));
      const { error } = await supabase.from('site_settings').upsert(updates, { onConflict: 'key' });
      if (error) throw error;
      showToast('Configuración general guardada', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al guardar configuración', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Lógica Paquetes y Servicios
  const handleUpdateItem = async (
    table: 'packages' | 'services', 
    id: string, 
    data: any, 
    stateUpdater: React.Dispatch<React.SetStateAction<any[]>>
  ) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from(table)
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      stateUpdater(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
      showToast('Elemento actualizado correctamente', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al actualizar', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin mb-2 text-gray-900" />
        <p>Verificando permisos y cargando datos...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-[600px]">
      {/* Header Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px overflow-x-auto">
          {[
            { id: 'general', label: 'General', icon: Settings },
            { id: 'packages', label: 'Paquetes', icon: PackageIcon },
            { id: 'services', label: 'Servicios', icon: Coffee },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                // CAMBIO: Colores de Tabs (border-black, text-black)
                className={`
                  flex items-center gap-2 py-4 px-6 border-b-2 text-sm font-medium transition-colors whitespace-nowrap
                  ${isActive 
                    ? 'border-black text-black' 
                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'}
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-6">
        {/* --- TAB GENERAL --- */}
        {activeTab === 'general' && (
          <div className="max-w-2xl space-y-6 animate-in fade-in duration-300">
            <h3 className="text-lg font-medium text-gray-900">Información de Contacto</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: 'Email de Contacto', key: 'contact_email', type: 'email' },
                { label: 'Teléfono', key: 'contact_phone', type: 'text' },
                { label: 'Dirección', key: 'address', type: 'text', full: true },
                { label: 'Instagram URL', key: 'social_instagram', type: 'text' },
                { label: 'Facebook URL', key: 'social_facebook', type: 'text' },
                { label: 'TikTok URL', key: 'social_tiktok', type: 'text' },
              ].map((field) => (
                <div key={field.key} className={field.full ? "md:col-span-2" : ""}>
                  <label className="block text-sm font-medium text-gray-700">{field.label}</label>
                  <input
                    type={field.type}
                    value={getSettingValue(field.key)}
                    onChange={(e) => updateSettingState(field.key, e.target.value)}
                    // CAMBIO: Inputs focus negro
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black focus:ring-1 sm:text-sm p-2 border outline-none transition-all"
                  />
                </div>
              ))}
            </div>
            <div className="pt-4">
              <button
                onClick={saveGeneralSettings}
                disabled={loading}
                // CAMBIO: Botón principal negro
                className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-black disabled:opacity-50 transition-colors shadow-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar Cambios
              </button>
            </div>
          </div>
        )}

        {/* --- TAB PACKAGES --- */}
        {activeTab === 'packages' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {packages.map((pkg) => (
              <div key={pkg.id} className="border rounded-lg p-4 bg-gray-50 hover:border-gray-400 transition-colors">
                
                {/* Header del Paquete */}
                <div className="flex justify-between items-start mb-4 border-b border-gray-200 pb-2">
                  <h4 className="font-bold text-lg text-gray-900">{pkg.name}</h4>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${pkg.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {pkg.active ? 'Activo' : 'Inactivo'}
                    </span>
                    <button 
                      onClick={() => handleUpdateItem('packages', pkg.id, { active: !pkg.active }, setPackages)}
                      className="text-xs text-gray-600 hover:text-black hover:underline font-medium ml-2"
                    >
                      {pkg.active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Columna Izquierda: Datos Básicos */}
                  <div className="space-y-4">
                    
                    {/* Nombre */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Nombre del Paquete</label>
                      <input 
                        type="text" 
                        value={pkg.name} 
                        onChange={(e) => {
                           const newPackages = packages.map(p => p.id === pkg.id ? { ...p, name: e.target.value } : p);
                           setPackages(newPackages);
                        }}
                        className="w-full mt-1 p-2 border border-gray-300 rounded text-sm bg-white focus:border-black focus:ring-black focus:ring-1 outline-none"
                      />
                    </div>

                    {/* GRD: Precio, Horas, Invitados */}
                    <div className="grid grid-cols-3 gap-3">
                      
                      {/* Precio */}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Precio (S/)</label>
                        <input 
                          type="number" 
                          value={pkg.price} 
                          onChange={(e) => {
                             const newPackages = packages.map(p => p.id === pkg.id ? { ...p, price: Number(e.target.value) } : p);
                             setPackages(newPackages);
                          }}
                          className="w-full mt-1 p-2 border border-gray-300 rounded text-sm bg-white focus:border-black focus:ring-black focus:ring-1 outline-none"
                        />
                      </div>

                      {/* Horas (duration) - NUEVO */}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Horas</label>
                        <input 
                          type="number" 
                          value={pkg.duration} 
                          onChange={(e) => {
                             const newPackages = packages.map(p => p.id === pkg.id ? { ...p, duration: Number(e.target.value) } : p);
                             setPackages(newPackages);
                          }}
                          className="w-full mt-1 p-2 border border-gray-300 rounded text-sm bg-white focus:border-black focus:ring-black focus:ring-1 outline-none"
                        />
                      </div>

                      {/* Invitados (guest_range) - NUEVO */}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Personas</label>
                        <input 
                          type="text" 
                          value={pkg.guest_range} 
                          placeholder="Ej: 25-50"
                          onChange={(e) => {
                             const newPackages = packages.map(p => p.id === pkg.id ? { ...p, guest_range: e.target.value } : p);
                             setPackages(newPackages);
                          }}
                          className="w-full mt-1 p-2 border border-gray-300 rounded text-sm bg-white focus:border-black focus:ring-black focus:ring-1 outline-none"
                        />
                      </div>
                    </div>

                    {/* Descripción */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Descripción Corta</label>
                      <textarea 
                        rows={3}
                        value={pkg.description} 
                        onChange={(e) => {
                           const newPackages = packages.map(p => p.id === pkg.id ? { ...p, description: e.target.value } : p);
                           setPackages(newPackages);
                        }}
                        className="w-full mt-1 p-2 border border-gray-300 rounded text-sm bg-white focus:border-black focus:ring-black focus:ring-1 outline-none"
                      />
                    </div>
                  </div>
                  
                  {/* Columna Derecha: Features */}
                  <div>
                    <FeatureListEditor 
                      features={pkg.features || []} 
                      onChange={(newFeatures) => {
                        const newPackages = packages.map(p => p.id === pkg.id ? { ...p, features: newFeatures } : p);
                        setPackages(newPackages);
                      }}
                    />
                  </div>
                </div>

                {/* Botón Guardar */}
                <div className="mt-4 flex justify-end">
                   <button
                    onClick={() => handleUpdateItem('packages', pkg.id, pkg, setPackages)}
                    disabled={loading}
                    className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded text-sm hover:bg-gray-100 hover:text-black hover:border-gray-400 transition-colors shadow-sm"
                  >
                    <Save className="w-4 h-4" /> Guardar {pkg.name}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* --- TAB SERVICES --- */}
        {activeTab === 'services' && (
           <div className="space-y-8 animate-in fade-in duration-300">
           {services.map((svc) => (
             // CAMBIO: Hover del borde gris
             <div key={svc.id} className="border rounded-lg p-4 bg-gray-50 hover:border-gray-400 transition-colors">
               <div className="flex justify-between items-start mb-4 border-b border-gray-200 pb-2">
                 <h4 className="font-bold text-lg text-gray-900">{svc.name}</h4>
                 <div className="flex items-center gap-2">
                   <span className={`px-2 py-1 text-xs rounded-full font-medium ${svc.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                     {svc.active ? 'Activo' : 'Inactivo'}
                   </span>
                   <button 
                      onClick={() => handleUpdateItem('services', svc.id, { active: !svc.active }, setServices)}
                      // CAMBIO: Link de acción
                      className="text-xs text-gray-600 hover:text-black hover:underline font-medium ml-2"
                    >
                      {svc.active ? 'Desactivar' : 'Activar'}
                    </button>
                 </div>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-4">
                   <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Nombre</label>
                     <input 
                       type="text" 
                       value={svc.name} 
                       onChange={(e) => {
                          const newServices = services.map(s => s.id === svc.id ? { ...s, name: e.target.value } : s);
                          setServices(newServices);
                       }}
                       className="w-full mt-1 p-2 border border-gray-300 rounded text-sm bg-white focus:border-black focus:ring-black focus:ring-1 outline-none"
                     />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Precio Desde</label>
                     <input 
                       type="number" 
                       value={svc.price_from} 
                       onChange={(e) => {
                          const newServices = services.map(s => s.id === svc.id ? { ...s, price_from: Number(e.target.value) } : s);
                          setServices(newServices);
                       }}
                       className="w-full mt-1 p-2 border border-gray-300 rounded text-sm bg-white focus:border-black focus:ring-black focus:ring-1 outline-none"
                     />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Descripción</label>
                      <textarea 
                        rows={3}
                        value={svc.description} 
                        onChange={(e) => {
                           const newServices = services.map(s => s.id === svc.id ? { ...s, description: e.target.value } : s);
                           setServices(newServices);
                        }}
                        className="w-full mt-1 p-2 border border-gray-300 rounded text-sm bg-white focus:border-black focus:ring-black focus:ring-1 outline-none"
                      />
                    </div>
                 </div>
                 
                 <div>
                   <FeatureListEditor 
                     features={svc.features || []} 
                     onChange={(newFeatures) => {
                       const newServices = services.map(s => s.id === svc.id ? { ...s, features: newFeatures } : s);
                       setServices(newServices);
                     }}
                   />
                 </div>
               </div>

               <div className="mt-4 flex justify-end">
                  <button
                   onClick={() => handleUpdateItem('services', svc.id, svc, setServices)}
                   disabled={loading}
                   // CAMBIO: Botón secundario
                   className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded text-sm hover:bg-gray-100 hover:text-black hover:border-gray-400 transition-colors"
                 >
                   <Save className="w-4 h-4" /> Guardar {svc.name}
                 </button>
               </div>
             </div>
           ))}
         </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// Componente Principal Wrapper (Isla)
// ==========================================
export default function SettingsManager() {
  return (
    <ToastProvider>
      <SettingsContent />
    </ToastProvider>
  );
}