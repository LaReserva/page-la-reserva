// src/components/admin/portfolio/PortfolioView.tsx
import React, { useState, useEffect, useRef, Fragment } from 'react';
import { supabase } from '@/lib/supabase';
import { useUserRole } from '@/hooks/useUserRole';
import { Dialog, Transition, Listbox } from '@headlessui/react';
// import type { Database } from '@/types/database';  <-- Ya no dependemos estrictamente de esto si no se ha actualizado
import type { EventImage } from '@/types';
import { 
  Upload, Trash2, Eye, EyeOff, Image as ImageIcon, Loader2, X,
  Maximize2, Calendar, Link as LinkIcon, Download, Lock, AlertTriangle, Check, ChevronDown
} from 'lucide-react';

// --- TIPOS ---
// Extendemos el tipo manualmente para asegurarnos que TypeScript acepte 'category'
interface PortfolioImage extends EventImage {
  category?: string | null; 
}

const EVENT_TYPES = [
  'Boda', 'Corporativo', 'Cumpleaños', 'Quinceañero', 'Privado', 'Graduación', 'Baby Shower', 'Otros'
];

// --- MAPEO DE DATOS ---
const mapRowToImage = (row: any): PortfolioImage => ({
  id: row.id,
  image_url: row.image_url,
  created_at: row.created_at || new Date().toISOString(),
  order_index: row.order_index ?? 0,
  is_public: row.is_public ?? false,
  caption: row.caption || undefined,
  // ✅ AQUÍ ESTÁ LA CLAVE: Leemos la nueva columna 'category'
  category: row.category || null, 
  // Ignoramos event_id intencionalmente
  event_id: undefined, 
  thumbnail_url: row.thumbnail_url || undefined,
});

// --- COMPONENTES UI INTERNOS ---

// Z-Index corregido para que el menú se vea por encima
const CategorySelector = ({ value, onChange }: { value: string | null | undefined, onChange: (val: string) => void }) => {
  return (
    <div className="relative">
      <Listbox value={value || ""} onChange={onChange}>
        <Listbox.Button className="w-full text-xs bg-secondary-50 border border-secondary-200 rounded-lg px-3 py-2 text-left flex justify-between items-center outline-none focus:ring-2 focus:ring-primary-500/20 transition-all">
          <span className={`truncate ${!value ? 'text-secondary-400' : 'text-secondary-900 font-medium'}`}>
            {value || '-- Seleccionar Categoría --'}
          </span>
          <ChevronDown className="w-3 h-3 text-secondary-400" />
        </Listbox.Button>
        <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
          <Listbox.Options className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg bg-white py-1 text-xs shadow-lg ring-1 ring-black/5 focus:outline-none">
            <Listbox.Option value="" className={({ active }) => `relative cursor-pointer select-none py-2 pl-3 pr-4 ${active ? 'bg-secondary-50 text-secondary-900' : 'text-secondary-500'}`}>
              -- Sin Categoría --
            </Listbox.Option>
            {EVENT_TYPES.map((type) => (
              <Listbox.Option key={type} value={type} className={({ active }) => `relative cursor-pointer select-none py-2 pl-3 pr-4 ${active ? 'bg-secondary-50 text-secondary-900' : 'text-secondary-900'}`}>
                {({ selected }) => (
                  <>
                    <span className={`block truncate ${selected ? 'font-bold' : 'font-normal'}`}>{type}</span>
                    {selected && <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-primary-600"><Check className="w-3 h-3" /></span>}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </Listbox>
    </div>
  );
};

// ... [Mantener DeleteModal, LightboxModal, Badge, MiniToast igual que antes] ...
// (Omitidos para ahorrar espacio, copia los del código anterior)
const DeleteModal = ({ isOpen, onClose, onConfirm }: any) => (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[150]" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-secondary-900/40 backdrop-blur-sm" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all">
                <div className="bg-red-50 p-6 flex flex-col items-center text-center border-b border-red-100">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3 text-red-600"><AlertTriangle className="w-6 h-6" /></div>
                  <Dialog.Title as="h3" className="text-xl font-bold text-red-900">¿Eliminar esta imagen?</Dialog.Title>
                  <p className="text-red-700 text-sm mt-1">Esta acción es irreversible y eliminará la foto de la web pública.</p>
                </div>
                <div className="p-4 bg-gray-50 flex gap-3 justify-end">
                  <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100">Cancelar</button>
                  <button onClick={onConfirm} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-sm flex items-center gap-2"><Trash2 size={16} /> Sí, eliminar</button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
  
  const LightboxModal = ({ isOpen, image, onClose, onDownload, isSuperAdmin }: any) => {
    if (!image) return null;
    return (
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[200]" onClose={onClose}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/95 backdrop-blur-md" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full h-full max-w-7xl flex flex-col items-center justify-center relative">
                  <button className="absolute top-0 right-0 m-4 text-white/50 hover:text-white p-2 transition-colors z-50 focus:outline-none" onClick={onClose}><X size={32}/></button>
                  <img src={image.image_url} alt="Full view" className="max-h-[80vh] w-auto object-contain rounded-sm shadow-2xl" />
                  <div className="mt-6 text-center">
                    <p className="text-white text-xl font-light">{image.caption || <span className="text-white/30 italic">Sin descripción</span>}</p>
                    {isSuperAdmin && (
                      <button onClick={(e) => onDownload(image.image_url, e)} className="mt-4 flex items-center gap-2 mx-auto text-sm text-white/70 border border-white/20 px-4 py-2 rounded-full hover:bg-white/10 transition-colors">
                        <Download size={14} /> Descargar original
                      </button>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    );
  };
  
  const Badge = ({ count }: { count: number }) => (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 ml-2 border border-primary-200">
      {count} {count === 1 ? 'foto' : 'fotos'}
    </span>
  );
  
  const MiniToast = ({ msg, type = 'info' }: { msg: string, type?: 'info'|'error' }) => (
    <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-lg shadow-2xl animate-in slide-in-from-bottom-5 z-[200] flex items-center gap-2 font-medium border ${type === 'error' ? 'bg-red-900 text-white border-red-700' : 'bg-secondary-900 text-white border-secondary-700'}`}>
      <div className={`w-2 h-2 rounded-full ${type === 'error' ? 'bg-red-500' : 'bg-green-400'}`}></div>
      {msg}
    </div>
  );

// --- COMPONENTE PRINCIPAL ---
export default function PortfolioView() {
  const { role, loading: roleLoading } = useUserRole();
  const isSuperAdmin = role === 'super_admin';

  const [images, setImages] = useState<PortfolioImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [toast, setToast] = useState<{msg: string, type: 'info'|'error'} | null>(null);
  
  const [selectedImage, setSelectedImage] = useState<PortfolioImage | null>(null);
  const [imageToDelete, setImageToDelete] = useState<{id: string, url: string} | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, type: 'info'|'error' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchImages().finally(() => setLoading(false));
  }, []);

  const fetchImages = async () => {
    try {
      const { data, error } = await supabase.from('event_images').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setImages(data.map(mapRowToImage));
    } catch (error) { console.error(error); }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const newImages: PortfolioImage[] = [];
    let errorCount = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { error: upErr } = await supabase.storage.from('portfolio').upload(fileName, file);
        if (upErr) { errorCount++; continue; }
        
        const { data: { publicUrl } } = supabase.storage.from('portfolio').getPublicUrl(fileName);
        
        // Guardamos con category: null inicialmente
        const { data: dbData, error: dbErr } = await supabase.from('event_images').insert([{ 
            image_url: publicUrl, 
            is_public: false, 
            order_index: 0, 
            caption: null,
            category: null // Explícito
        }]).select().single();

        if (dbErr) errorCount++;
        else if (dbData) newImages.push(mapRowToImage(dbData));
      }
      setImages(prev => [...newImages, ...prev]);
      showToast(errorCount > 0 ? `Subida con ${errorCount} errores` : 'Imágenes subidas');
    } catch (e) { showToast('Error al subir', 'error'); } 
    finally { setUploading(false); setDragActive(false); if(inputRef.current) inputRef.current.value = ''; }
  };

  const requestDelete = (id: string, imageUrl: string) => {
    if (!isSuperAdmin) { showToast('No tienes permisos.', 'error'); return; }
    setImageToDelete({ id, url: imageUrl });
  };

  const confirmDelete = async () => {
    if (!imageToDelete) return;
    try {
      const fileName = imageToDelete.url.split('/').pop();
      if(fileName) await supabase.storage.from('portfolio').remove([fileName]);
      await supabase.from('event_images').delete().eq('id', imageToDelete.id);
      setImages(prev => prev.filter(img => img.id !== imageToDelete.id));
      if(selectedImage?.id === imageToDelete.id) setSelectedImage(null);
      showToast('Imagen eliminada correctamente');
    } catch (e) { showToast('Error al eliminar', 'error'); } 
    finally { setImageToDelete(null); }
  };

  const toggleVisibility = async (id: string, currentStatus: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSuperAdmin) { showToast('Solo Super Admin autoriza.', 'error'); return; }
    const newStatus = !currentStatus;
    setImages(prev => prev.map(img => img.id === id ? { ...img, is_public: newStatus } : img));
    try {
      await supabase.from('event_images').update({ is_public: newStatus } as any).eq('id', id);
      showToast(newStatus ? 'Publicada' : 'Ocultada');
    } catch (error) { 
      setImages(prev => prev.map(img => img.id === id ? { ...img, is_public: currentStatus } : img));
      showToast('Error al cambiar estado', 'error');
    }
  };

  const handleDownload = async (imageUrl: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSuperAdmin) return;
    setDownloadingId(imageUrl);
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const filename = imageUrl.split('/').pop() || 'imagen.jpg';
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      showToast('Descarga iniciada');
    } catch (error) { showToast('Error descarga', 'error'); } 
    finally { setDownloadingId(null); }
  };

  const updateCaption = async (id: string, newCaption: string) => {
    try { await supabase.from('event_images').update({ caption: newCaption }).eq('id', id); } 
    catch (e) { console.error(e); }
  };

  // ✅ FUNCIÓN CORREGIDA: Escribe en la columna 'category'
  const updateCategory = async (imageId: string, newCategory: string) => {
    const finalCategory = newCategory === "" ? null : newCategory;
    setImages(prev => prev.map(img => img.id === imageId ? { ...img, category: finalCategory || null } : img));
    try { 
        await supabase.from('event_images').update({ category: finalCategory } as any).eq('id', imageId); 
        showToast('Categoría actualizada'); 
    } 
    catch (e) { 
        showToast('Error al categorizar', 'error'); 
        console.error(e);
    }
  };

  const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(e.type === "dragenter" || e.type === "dragover"); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if(e.dataTransfer.files) handleFiles(e.dataTransfer.files); };

  if (loading || roleLoading) return <div className="h-96 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary-500"/></div>;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 border-b border-secondary-200 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900 flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-secondary-700"/>
            Galería de Imágenes <Badge count={images.length} />
          </h2>
          <p className="mt-1 text-sm text-secondary-500">
            {isSuperAdmin ? 'Modo Administrador' : 'Modo Operaciones (Solo subida y edición)'}
          </p>
        </div>
        <button onClick={() => inputRef.current?.click()} disabled={uploading} className="flex items-center gap-2 bg-secondary-900 text-white px-5 py-2.5 rounded-xl hover:bg-black transition-all shadow-lg font-medium active:scale-95">
          {uploading ? <Loader2 className="animate-spin w-4 h-4"/> : <Upload className="w-4 h-4"/>} Subir Fotos
        </button>
      </div>

      {/* UPLOAD AREA */}
      <div className={`mb-10 relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 ${dragActive ? 'border-primary-500 bg-primary-50/50 ring-4 ring-primary-100' : 'border-secondary-300 bg-secondary-50/30 hover:border-primary-400 hover:bg-secondary-50'}`}
        onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
        <input ref={inputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleFiles(e.target.files)}/>
        <div className="flex flex-col items-center gap-3 pointer-events-none">
           <div className="w-14 h-14 bg-white rounded-full shadow-sm flex items-center justify-center border border-secondary-100"><Upload className="w-7 h-7 text-primary-600"/></div>
           <div><h3 className="text-base font-bold text-secondary-900">Arrastra fotos aquí</h3><p className="text-xs text-secondary-500 mt-1">o haz clic en el botón de subir</p></div>
        </div>
      </div>

      {/* GRID IMÁGENES */}
      {images.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 xl:gap-8">
          {images.map((img) => {
            return (
              <div key={img.id} className={`group bg-white rounded-2xl shadow-sm hover:shadow-xl border transition-all duration-300 flex flex-col relative hover:z-10 ${!img.is_public ? 'border-dashed border-secondary-300 opacity-90' : 'border-secondary-200'}`}>
                {/* IMG PREVIEW */}
                <div className="relative aspect-[4/3] bg-secondary-100 cursor-zoom-in overflow-hidden rounded-t-2xl" onClick={() => setSelectedImage(img)}>
                  <img src={img.image_url} alt="Portfolio" className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${!img.is_public ? 'grayscale' : ''}`} loading="lazy"/>
                  {/* Etiqueta muestra la categoría */}
                  {img.category && <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded border border-white/20">{img.category}</div>}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center"><Maximize2 className="text-white opacity-0 group-hover:opacity-100 w-8 h-8 drop-shadow-lg"/></div>
                  
                  {/* VISIBILITY TOGGLE */}
                  <div className="absolute top-2 right-2 z-10" onClick={e => e.stopPropagation()}>
                    {isSuperAdmin ? (
                      <button onClick={(e) => toggleVisibility(img.id, img.is_public, e)} className={`p-1.5 rounded-full backdrop-blur-md border shadow-sm transition-all hover:scale-110 ${img.is_public ? 'bg-white/90 text-green-600' : 'bg-secondary-900/90 text-secondary-300'}`}>
                        {img.is_public ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                    ) : (
                      <div className={`p-1.5 rounded-full backdrop-blur-md border shadow-sm ${img.is_public ? 'bg-white/80 text-green-600' : 'bg-secondary-900/80 text-secondary-400'}`}>
                        {img.is_public ? <Eye size={16} /> : <EyeOff size={16} />}
                      </div>
                    )}
                  </div>
                </div>

                {/* CARD BODY */}
                <div className="p-4 flex flex-col gap-3 flex-1">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-secondary-400 tracking-wider flex items-center gap-1"><LinkIcon size={10} /> Categoría</label>
                    {/* Z-Index 50 para que el dropdown se superponga */}
                    <CategorySelector value={img.category} onChange={(val) => updateCategory(img.id, val)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-secondary-400 tracking-wider">Descripción</label>
                    <input 
                      type="text" 
                      defaultValue={img.caption || ''} 
                      disabled={!isSuperAdmin}
                      placeholder="Descripción..." 
                      className="w-full text-xs border-secondary-200 rounded-lg px-2 py-1.5 resize-none focus:ring-primary-500 focus:border-primary-500 outline-none border transition-all" 
                      onBlur={(e) => updateCaption(img.id, e.target.value)}
                    />
                  </div>
                  
                  {/* FOOTER ACTIONS */}
                  <div className="mt-auto pt-3 border-t border-secondary-50 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[10px] text-secondary-400 font-medium"><Calendar className="w-3 h-3" /><span>{new Date(img.created_at).toLocaleDateString()}</span></div>
                    <div className="flex items-center gap-1">
                      {isSuperAdmin && (
                        <button onClick={(e) => handleDownload(img.image_url, e)} disabled={downloadingId === img.image_url} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors" title="Descargar">
                          {downloadingId === img.image_url ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Download className="w-3.5 h-3.5"/>}
                        </button>
                      )}
                      {isSuperAdmin ? (
                        <button onClick={() => requestDelete(img.id, img.image_url)} className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded transition-colors" title="Eliminar">
                          <Trash2 className="w-3.5 h-3.5"/>
                        </button>
                      ) : (
                        <div title="No tienes permiso para borrar" className="p-1.5 cursor-not-allowed">
                           <Lock className="w-3.5 h-3.5 text-secondary-300" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (!uploading && <div className="text-center py-20 text-secondary-400 flex flex-col items-center"><ImageIcon size={48} className="text-secondary-200 mb-2"/>Portafolio vacío</div>)}

      {/* --- MODALES --- */}
      <LightboxModal 
        isOpen={!!selectedImage} 
        image={selectedImage} 
        onClose={() => setSelectedImage(null)} 
        onDownload={handleDownload} 
        isSuperAdmin={isSuperAdmin}
      />

      <DeleteModal 
        isOpen={!!imageToDelete} 
        onClose={() => setImageToDelete(null)} 
        onConfirm={confirmDelete} 
      />

      {toast && <MiniToast msg={toast.msg} type={toast.type} />}
    </div>
  );
}