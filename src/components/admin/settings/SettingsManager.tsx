// src/components/admin/settings/SettingsManager.tsx
import React, { useState, useEffect, Fragment, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { Dialog, Transition } from '@headlessui/react';
import { 
  Save, Plus, Trash2, Settings, Package as PackageIcon, 
  Coffee, Loader2, Clock, AlertTriangle, CheckCircle, XCircle,
  Instagram, Facebook, MapPin, Phone, Mail, Globe, AlertCircle,
  Upload, Image as ImageIcon, X
} from 'lucide-react';
import type { SiteSetting, Package, Service } from '@/types';

// ==========================================
// 1. UI COMPONENTS
// ==========================================

const TabButton = ({ id, label, icon: Icon, active, onClick }: any) => (
  <button
    onClick={() => onClick(id)}
    className={`
      flex items-center gap-2 py-3 px-5 border-b-2 text-sm font-medium transition-all whitespace-nowrap
      ${active 
        ? 'border-secondary-900 text-secondary-900 bg-secondary-50/50' 
        : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:bg-secondary-50'}
    `}
  >
    <Icon className={`w-4 h-4 ${active ? 'text-secondary-900' : 'text-secondary-400'}`} />
    {label}
  </button>
);

const InputField = ({ label, value, onChange, type = "text", placeholder, full = false, icon, helpText }: any) => (
  <div className={full ? "md:col-span-2" : ""}>
    <label className="flex items-center gap-2 text-xs font-bold text-secondary-500 uppercase tracking-wide mb-1.5">
      {icon && <span className="text-secondary-400">{icon}</span>}
      {label}
    </label>
    <div className="relative">
      {type === 'textarea' ? (
        <textarea
          rows={3}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          className="w-full rounded-lg border-secondary-300 shadow-sm p-2.5 border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm transition-all resize-none bg-white text-secondary-900"
          placeholder={placeholder}
        />
      ) : (
        <input
          type={type}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          className="w-full rounded-lg border-secondary-300 shadow-sm p-2.5 border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm transition-all bg-white text-secondary-900"
          placeholder={placeholder}
        />
      )}
    </div>
    {helpText && <p className="text-[10px] text-secondary-400 mt-1">{helpText}</p>}
  </div>
);

const ImageUploader = ({ value, onChange, label }: { value: string, onChange: (url: string) => void, label: string }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = e.target.files?.[0];
      if (!file) return;
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `services/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('services-images').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('services-images').getPublicUrl(filePath);
      onChange(data.publicUrl);
    } catch (error: any) {
      alert("Error al subir imagen: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-secondary-500 uppercase tracking-wide flex items-center gap-2">
        <ImageIcon className="w-3 h-3" /> {label}
      </label>
      <div className="flex items-center gap-4">
        {value ? (
          <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-secondary-200 group">
            <img src={value} className="w-full h-full object-cover" alt="Preview" />
            <button type="button" onClick={() => onChange('')} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-20 h-20 rounded-lg border-2 border-dashed border-secondary-300 flex flex-col items-center justify-center text-secondary-400 hover:border-primary-500 hover:text-primary-500 transition-all bg-white">
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
          </button>
        )}
        <input type="file" ref={fileInputRef} onChange={handleUpload} accept="image/*" className="hidden" />
        <div className="flex-1">
          <input type="text" value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full text-[11px] p-2 bg-secondary-50 border border-secondary-200 rounded-md outline-none" placeholder="URL de la imagen..." />
        </div>
      </div>
    </div>
  );
};

const TagListEditor = ({ tags = [], onChange, label }: { tags: string[], onChange: (t: string[]) => void, label: string }) => {
  const [val, setVal] = useState('');
  const add = () => { if (val.trim()) { onChange([...tags, val.trim()]); setVal(''); } };
  return (
    <div className="space-y-3">
      <label className="block text-xs font-bold text-secondary-500 uppercase tracking-wide">{label}</label>
      <div className="flex flex-wrap gap-2">
        {tags.map((t, i) => (
          <span key={i} className="flex items-center gap-1.5 px-3 py-1 bg-secondary-100 text-secondary-700 rounded-full text-[11px] font-bold border border-secondary-200">
            {t} <X className="w-3 h-3 cursor-pointer hover:text-red-500 transition-colors" onClick={() => onChange(tags.filter((_, idx) => idx !== i))} />
          </span>
        ))}
      </div>
      <div className="flex gap-2 max-w-md">
        <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())} className="flex-1 rounded-lg border-secondary-300 shadow-sm text-sm p-2 border outline-none focus:ring-2 focus:ring-primary-500/20" placeholder="Agregar uso ideal (ej: Bodas)..." />
        <button type="button" onClick={add} className="p-2 bg-secondary-900 text-white rounded-lg hover:bg-black transition-colors"><Plus size={18}/></button>
      </div>
    </div>
  );
};

const FeatureListEditor = ({ features = [], onChange }: { features: string[], onChange: (f: string[]) => void }) => {
  const updateFeature = (index: number, value: string) => {
    const newFeatures = [...features];
    newFeatures[index] = value;
    onChange(newFeatures);
  };

  return (
    <div className="bg-secondary-50/50 p-4 rounded-xl border border-secondary-200 space-y-3 h-full">
      <label className="block text-xs font-bold text-secondary-500 uppercase tracking-wide">Características Incluidas</label>
      <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
        {features.map((feature, idx) => (
          <div key={idx} className="flex gap-2">
            <input
              type="text"
              value={feature}
              onChange={(e) => updateFeature(idx, e.target.value)}
              className="flex-1 rounded-lg border-secondary-300 shadow-sm text-sm p-2 border focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
              placeholder="Ej: Barra iluminada..."
            />
            <button type="button" onClick={() => onChange(features.filter((_, i) => i !== idx))} className="text-secondary-300 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {features.length === 0 && <p className="text-xs text-secondary-400 italic text-center py-2">No hay características.</p>}
      </div>
      <button type="button" onClick={() => onChange([...features, ''])} className="flex items-center justify-center gap-1.5 text-xs text-secondary-900 font-bold bg-white border border-secondary-300 px-3 py-2.5 rounded-lg hover:bg-secondary-50 transition-colors shadow-sm w-full">
        <Plus className="w-3 h-3" /> Agregar Item
      </button>
    </div>
  );
};

const DeleteModal = ({ isOpen, onClose, onConfirm, title, message }: any) => (
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
                <div className="p-3 bg-red-50 rounded-full text-red-600"><AlertTriangle className="w-6 h-6" /></div>
                <Dialog.Title as="h3" className="text-lg font-bold text-secondary-900">{title}</Dialog.Title>
              </div>
              <p className="text-sm text-secondary-500 mb-6">{message}</p>
              <div className="flex justify-end gap-3">
                <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-secondary-600 bg-secondary-50 rounded-lg hover:bg-secondary-100">Cancelar</button>
                <button onClick={onConfirm} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-lg shadow-red-200">Sí, eliminar</button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </div>
    </Dialog>
  </Transition>
);

// ==========================================
// 2. COMPONENTE LÓGICO PRINCIPAL
// ==========================================

function SettingsContent() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'general' | 'hours' | 'packages' | 'services'>('general');
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const [settings, setSettings] = useState<SiteSetting[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean, id: string | null, table: 'packages' | 'services' | null }>({ open: false, id: null, table: null });

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { window.location.href = '/admin/login'; return; }

        const [settingsRes, packagesRes, servicesRes] = await Promise.all([
          supabase.from('site_settings').select('*'),
          supabase.from('packages').select('*').order('order_index'),
          supabase.from('services').select('*').order('order_index')
        ]);

        if (settingsRes.data) setSettings(settingsRes.data as any);
        if (packagesRes.data) setPackages(packagesRes.data as any);
        if (servicesRes.data) setServices(servicesRes.data as any);
        setIsInitializing(false);
      } catch (error) {
        showToast('Error de conexión', 'error');
      }
    };
    init();
  }, [showToast]);

  const getSettingValue = (key: string) => settings.find(s => s.key === key)?.value ? String(settings.find(s => s.key === key)?.value) : '';

  const updateSettingState = (key: string, value: string) => {
    setSettings(prev => {
      const exists = prev.find(s => s.key === key);
      return exists 
        ? prev.map(s => s.key === key ? { ...s, value } : s)
        : [...prev, { key, value, updated_at: new Date().toISOString() } as SiteSetting];
    });
  };

  const saveGeneralSettings = async () => {
    setLoading(true);
    try {
      const updates = settings.map(s => ({ key: s.key, value: s.value, updated_at: new Date().toISOString() }));
      const { error } = await supabase.from('site_settings').upsert(updates, { onConflict: 'key' });
      if (error) throw error;
      showToast('Configuración guardada', 'success');
    } catch (err) { showToast('Error al guardar', 'error'); } 
    finally { setLoading(false); }
  };

  const handleUpdateItem = async (table: 'packages' | 'services', id: string, data: any, stateUpdater: any) => {
    setLoading(true);
    try {
      const { error } = await supabase.from(table).update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      stateUpdater((prev: any[]) => prev.map(item => item.id === id ? { ...item, ...data } : item));
      showToast('Guardado correctamente', 'success');
    } catch (err) { showToast('Error al actualizar', 'error'); } 
    finally { setLoading(false); }
  };

  const handleCreateItem = async (table: 'packages' | 'services') => {
    setLoading(true);
    try {
        const timestamp = Date.now();
        const baseItem = { active: false, features: [], order_index: 99 };
        const newItemData = table === 'packages' 
            ? { ...baseItem, name: 'Nuevo Paquete', slug: `paquete-${timestamp}`, price: 0, description: '', duration: 4, guest_range: '25-50' }
            : { ...baseItem, name: 'Nuevo Servicio', slug: `servicio-${timestamp}`, price_from: 0, description: '', duration: 4, guest_range: 'Consultar', ideal_for: [] };

        const { data, error } = await supabase.from(table).insert(newItemData).select().single();
        if (error) throw error;
        if (table === 'packages') setPackages(prev => [...prev, data as any]);
        else setServices(prev => [...prev, data as any]);
        showToast('Creado correctamente', 'success');
    } catch (err: any) { showToast(err.message, 'error'); } 
    finally { setLoading(false); }
  };

  const confirmDelete = async () => {
    if (!deleteModal.id || !deleteModal.table) return;
    setLoading(true);
    try {
        const { error } = await supabase.from(deleteModal.table).delete().eq('id', deleteModal.id);
        if (error) throw error;
        if (deleteModal.table === 'packages') setPackages(prev => prev.filter(i => i.id !== deleteModal.id));
        else setServices(prev => prev.filter(i => i.id !== deleteModal.id));
        showToast('Eliminado correctamente', 'success');
    } catch (err) { showToast('Error al eliminar', 'error'); } 
    finally { setLoading(false); setDeleteModal({ open: false, id: null, table: null }); }
  };

  if (isInitializing) return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-secondary-400" /></div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 min-h-[600px] flex flex-col overflow-hidden">
      <div className="border-b border-secondary-200 bg-white px-6 pt-2">
        <nav className="flex space-x-2 overflow-x-auto">
          <TabButton id="general" label="General" icon={Settings} active={activeTab === 'general'} onClick={setActiveTab} />
          <TabButton id="hours" label="Horarios" icon={Clock} active={activeTab === 'hours'} onClick={setActiveTab} />
          <TabButton id="packages" label="Paquetes" icon={PackageIcon} active={activeTab === 'packages'} onClick={setActiveTab} />
          <TabButton id="services" label="Servicios" icon={Coffee} active={activeTab === 'services'} onClick={setActiveTab} />
        </nav>
      </div>

      <div className="p-6 md:p-8 bg-secondary-50/30 flex-1 overflow-y-auto">
        {activeTab === 'general' && (
          <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="bg-white p-6 rounded-2xl border border-secondary-200 shadow-sm space-y-6">
                <h3 className="text-lg font-bold text-secondary-900 border-b border-secondary-100 pb-3">Contacto y Redes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField label="Email" value={getSettingValue('contact_email')} onChange={(v:any) => updateSettingState('contact_email', v)} icon={<Mail className="w-3 h-3"/>} />
                    <InputField label="Teléfono" value={getSettingValue('contact_phone')} onChange={(v:any) => updateSettingState('contact_phone', v)} icon={<Phone className="w-3 h-3"/>} />
                    <InputField label="Dirección" value={getSettingValue('address')} onChange={(v:any) => updateSettingState('address', v)} full icon={<MapPin className="w-3 h-3"/>} />
                    <div className="md:col-span-2 h-px bg-secondary-100 my-2" />
                    <InputField label="Instagram" value={getSettingValue('social_instagram')} onChange={(v:any) => updateSettingState('social_instagram', v)} icon={<Instagram className="w-3 h-3"/>} />
                    <InputField label="Facebook" value={getSettingValue('social_facebook')} onChange={(v:any) => updateSettingState('social_facebook', v)} icon={<Facebook className="w-3 h-3"/>} />
                    <InputField label="TikTok" value={getSettingValue('social_tiktok')} onChange={(v:any) => updateSettingState('social_tiktok', v)} icon={<Globe className="w-3 h-3"/>} />
                </div>
            </div>
            <div className="flex justify-end">
                <button onClick={saveGeneralSettings} disabled={loading} className="flex items-center gap-2 bg-secondary-900 text-white px-6 py-2.5 rounded-xl hover:bg-black transition-all shadow-lg">
                    {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />} Guardar General
                </button>
            </div>
          </div>
        )}

        {activeTab === 'hours' && (
          <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
             <div className="bg-white p-6 rounded-2xl border border-secondary-200 shadow-sm grid grid-cols-1 gap-6">
                <h3 className="text-lg font-bold text-secondary-900 border-b border-secondary-100 pb-3">Configuración de Horarios</h3>
                <InputField label="Lunes - Viernes" value={getSettingValue('hours_weekdays')} onChange={(v:any) => updateSettingState('hours_weekdays', v)} placeholder="Ej: 9:00 AM - 6:00 PM" icon={<Clock className="w-3 h-3"/>}/>
                <InputField label="Sábados" value={getSettingValue('hours_saturday')} onChange={(v:any) => updateSettingState('hours_saturday', v)} icon={<Clock className="w-3 h-3"/>}/>
                <InputField label="Domingos" value={getSettingValue('hours_sunday')} onChange={(v:any) => updateSettingState('hours_sunday', v)} icon={<Clock className="w-3 h-3"/>}/>
                <div className="h-px bg-secondary-100 my-2" />
                <InputField label="Tiempo de Respuesta" value={getSettingValue('response_time')} onChange={(v:any) => updateSettingState('response_time', v)} icon={<AlertCircle className="w-3 h-3"/>} helpText="Mensaje visible en el formulario de contacto."/>
             </div>
             <div className="flex justify-end">
                <button onClick={saveGeneralSettings} disabled={loading} className="flex items-center gap-2 bg-secondary-900 text-white px-6 py-2.5 rounded-xl hover:bg-black transition-all shadow-lg">
                    {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />} Guardar Horarios
                </button>
            </div>
          </div>
        )}

        {(activeTab === 'packages' || activeTab === 'services') && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-secondary-200 shadow-sm gap-4">
                <div>
                  <h3 className="text-xl font-bold text-secondary-900">{activeTab === 'packages' ? 'Paquetes de Bar' : 'Servicios Adicionales'}</h3>
                  <p className="text-sm text-secondary-500">Administra el contenido que verán tus clientes.</p>
                </div>
                <button onClick={() => handleCreateItem(activeTab)} disabled={loading} className="flex items-center gap-2 bg-secondary-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-black transition-all shadow-lg">
                  <Plus className="w-4 h-4" /> Crear Nuevo
                </button>
            </div>

            <div className="grid gap-6">
                {(activeTab === 'packages' ? packages : services).map((item) => (
                 <div key={item.id} className="bg-white rounded-2xl border border-secondary-200 p-6 shadow-sm group">
                    <div className="flex justify-between items-start gap-4 mb-6 border-b border-secondary-100 pb-4">
                        <div className="flex items-center gap-4 w-full">
                            <div className={`p-3 rounded-xl shrink-0 ${item.active ? 'bg-green-100 text-green-700' : 'bg-secondary-100 text-secondary-500'}`}>
                                {activeTab === 'packages' ? <PackageIcon size={24} /> : <Coffee size={24} />}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-lg text-secondary-900">{item.name || 'Sin Nombre'}</h4>
                                <div className="flex items-center gap-3 mt-1">
                                    <button onClick={() => handleUpdateItem(activeTab, item.id, { active: !item.active }, activeTab === 'packages' ? setPackages : setServices)} className={`text-xs font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors ${item.active ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
                                        {item.active ? <CheckCircle size={12}/> : <XCircle size={12}/>} {item.active ? 'Activo' : 'Inactivo'}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setDeleteModal({ open: true, id: item.id, table: activeTab })} className="text-secondary-300 hover:text-red-600 p-2 rounded-lg transition-colors shrink-0"><Trash2 className="w-5 h-5" /></button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-6">
                        <div className="lg:col-span-2 space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <InputField label="Nombre" value={item.name} onChange={(v: any) => (activeTab === 'packages' ? setPackages : setServices)((prev: any[]) => prev.map((i: any) => i.id === item.id ? { ...i, name: v } : i))} />
                                <InputField label="Slug (URL)" value={item.slug} onChange={(v: any) => (activeTab === 'packages' ? setPackages : setServices)((prev: any[]) => prev.map((i: any) => i.id === item.id ? { ...i, slug: v } : i))} icon={<Globe className="w-3 h-3"/>} />
                            </div>

                            {activeTab === 'services' && (
                              <>
                                <ImageUploader 
                                  label="Imagen del Servicio" 
                                  value={(item as Service).image_url || ''} 
                                  onChange={(url) => setServices((prev) => prev.map((i: any) => i.id === item.id ? { ...i, image_url: url } : i))} 
                                />
                                
                                <div className="grid grid-cols-3 gap-4">
                                    <InputField type="number" label="Desde" value={(item as Service).price_from} onChange={(v: any) => setServices((prev) => prev.map((i: any) => i.id === item.id ? { ...i, price_from: Number(v) } : i))} />
                                    <InputField type="number" label="Horas" value={item.duration} onChange={(v: any) => setServices((prev) => prev.map((i: any) => i.id === item.id ? { ...i, duration: Number(v) } : i))} />
                                    <InputField label="Personas" value={item.guest_range} onChange={(v: any) => setServices((prev) => prev.map((i: any) => i.id === item.id ? { ...i, guest_range: v } : i))} />
                                </div>

                                <InputField type="textarea" label="Descripción Corta" value={item.description} onChange={(v: any) => setServices((prev) => prev.map((i: any) => i.id === item.id ? { ...i, description: v } : i))} />
                                
                                <InputField 
                                  type="textarea" 
                                  label="Descripción Larga (Página de Detalle)" 
                                  value={(item as Service).long_description || ''} 
                                  onChange={(v: any) => setServices((prev) => prev.map((i: any) => i.id === item.id ? { ...i, long_description: v } : i))} 
                                />
                              </>
                            )}

                            {activeTab === 'packages' && (
                              <>
                                <div className="grid grid-cols-3 gap-4">
                                    <InputField type="number" label="Precio" value={(item as Package).price} onChange={(v: any) => setPackages((prev) => prev.map((i: any) => i.id === item.id ? { ...i, price: Number(v) } : i))} />
                                    <InputField type="number" label="Horas" value={item.duration} onChange={(v: any) => setPackages((prev) => prev.map((i: any) => i.id === item.id ? { ...i, duration: Number(v) } : i))} />
                                    <InputField label="Personas" value={item.guest_range} onChange={(v: any) => setPackages((prev) => prev.map((i: any) => i.id === item.id ? { ...i, guest_range: v } : i))} />
                                </div>
                                <InputField type="textarea" label="Descripción" value={item.description} onChange={(v: any) => setPackages((prev) => prev.map((i: any) => i.id === item.id ? { ...i, description: v } : i))} />
                              </>
                            )}
                        </div>

                        <div className="lg:col-span-1 space-y-6">
                            <FeatureListEditor 
                              features={item.features || []} 
                              onChange={(newFeatures) => (activeTab === 'packages' ? setPackages : setServices)((prev: any[]) => prev.map((i: any) => i.id === item.id ? { ...i, features: newFeatures } : i))} 
                            />
                        </div>
                    </div>

                    {/* SECCIÓN IDEAL PARA OCUPANDO EL ANCHO COMPLETO AL FINAL DE LOS SERVICIOS */}
                    {activeTab === 'services' && (
                      <div className="pt-4 border-t border-secondary-50">
                        <TagListEditor 
                          label="Ideal Para" 
                          tags={(item as Service).ideal_for || []} 
                          onChange={(t) => setServices((prev) => prev.map((i: any) => i.id === item.id ? { ...i, ideal_for: t } : i))} 
                        />
                      </div>
                    )}

                    <div className="mt-6 pt-4 border-t border-secondary-100 flex justify-end">
                        <button onClick={() => handleUpdateItem(activeTab, item.id, item, activeTab === 'packages' ? setPackages : setServices)} disabled={loading} className="flex items-center gap-2 bg-secondary-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-black transition-all shadow-sm">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar Cambios
                        </button>
                    </div>
                 </div>
                ))}
            </div>
          </div>
        )}
      </div>

      <DeleteModal isOpen={deleteModal.open} onClose={() => setDeleteModal({ ...deleteModal, open: false })} onConfirm={confirmDelete} title="¿Eliminar elemento?" message="Esta acción no se puede deshacer." />
    </div>
  );
}

export default function SettingsManager() {
  return (
    <ToastProvider>
      <SettingsContent />
    </ToastProvider>
  );
}