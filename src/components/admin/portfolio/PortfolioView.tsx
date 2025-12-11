import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useUserRole } from '@/hooks/useUserRole';
import type { Database } from '@/types/database'; 
import type { EventImage } from '@/types';
import { 
  Upload, 
  Trash2, 
  Eye, 
  EyeOff, 
  Image as ImageIcon, 
  Loader2, 
  X,
  Maximize2,
  Calendar,
  Link as LinkIcon,
  Download,
  Lock,
  AlertTriangle // ✅ Icono para el modal de peligro
} from 'lucide-react';

// --- 1. DEFINICIÓN DE TIPOS ---
type EventImageRow = Database['public']['Tables']['event_images']['Row'];
type EventImageUpdate = Database['public']['Tables']['event_images']['Update'];

type EventOption = {
  id: string;
  event_type: string;
  event_date: string;
  client_name?: string;
};

// --- 2. MAPPER ---
const mapRowToEventImage = (row: EventImageRow): EventImage => ({
  id: row.id,
  image_url: row.image_url,
  created_at: row.created_at || new Date().toISOString(),
  order_index: row.order_index ?? 0,
  is_public: row.is_public ?? false,
  caption: row.caption || undefined,
  event_id: row.event_id || undefined,
  thumbnail_url: row.thumbnail_url || undefined,
});

// --- COMPONENTES AUXILIARES ---
const Badge = ({ count }: { count: number }) => (
  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ml-2 border border-blue-200">
    {count} {count === 1 ? 'foto' : 'fotos'}
  </span>
);

const MiniToast = ({ msg, type = 'info' }: { msg: string, type?: 'info'|'error' }) => (
  <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-lg shadow-2xl animate-fade-in z-[200] flex items-center gap-2 font-medium border
    ${type === 'error' ? 'bg-red-900 text-white border-red-700' : 'bg-gray-900 text-white border-gray-700'}
  `}>
    <div className={`w-2 h-2 rounded-full ${type === 'error' ? 'bg-red-500' : 'bg-green-400'}`}></div>
    {msg}
  </div>
);

export default function PortfolioView() {
  const { role, loading: roleLoading } = useUserRole();
  const isSuperAdmin = role === 'super_admin';

  // Estados
  const [images, setImages] = useState<EventImage[]>([]);
  const [eventsList, setEventsList] = useState<EventOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [toast, setToast] = useState<{msg: string, type: 'info'|'error'} | null>(null);
  
  // Estados de Modales
  const [selectedImage, setSelectedImage] = useState<EventImage | null>(null); // Modal Ver Foto
  const [imageToDelete, setImageToDelete] = useState<{id: string, url: string} | null>(null); // ✅ Modal Confirmar Borrado
  
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, type: 'info'|'error' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    Promise.all([fetchImages(), fetchEvents()]).finally(() => setLoading(false));
    const handleEsc = (e: KeyboardEvent) => { 
      if (e.key === 'Escape') {
        setSelectedImage(null);
        setImageToDelete(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const fetchImages = async () => {
    try {
      const { data, error } = await supabase.from('event_images').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setImages(data.map(mapRowToEventImage));
    } catch (error) { console.error(error); }
  };

  const fetchEvents = async () => {
    try {
      const { data } = await supabase.from('events').select(`id, event_type, event_date, clients ( name )`).order('event_date', { ascending: false });
      if (data) {
        setEventsList(data.map((e: any) => ({
          id: e.id, event_type: e.event_type, event_date: e.event_date, client_name: e.clients?.name || 'Cliente sin nombre'
        })));
      }
    } catch (error) { console.error(error); }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const newImages: EventImage[] = [];
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
        
        const { data: dbData, error: dbErr } = await supabase
          .from('event_images')
          .insert([{ image_url: publicUrl, is_public: false, order_index: 0, caption: null }])
          .select()
          .single();

        if (dbErr) errorCount++;
        else if (dbData) newImages.push(mapRowToEventImage(dbData));
      }
      setImages(prev => [...newImages, ...prev]);
      showToast(errorCount > 0 ? `Subida con ${errorCount} errores` : 'Imágenes subidas');
    } catch (e) { showToast('Error al subir', 'error'); } 
    finally { setUploading(false); setDragActive(false); if(inputRef.current) inputRef.current.value = ''; }
  };

  // ✅ 1. SOLICITAR BORRADO (Abre Modal)
  const requestDelete = (id: string, imageUrl: string) => {
    if (!isSuperAdmin) { showToast('No tienes permisos.', 'error'); return; }
    setImageToDelete({ id, url: imageUrl }); // Guardamos la data y abrimos modal
  };

  // ✅ 2. CONFIRMAR BORRADO (Ejecuta Supabase)
  const confirmDelete = async () => {
    if (!imageToDelete) return;
    
    try {
      const fileName = imageToDelete.url.split('/').pop();
      if(fileName) await supabase.storage.from('portfolio').remove([fileName]);
      await supabase.from('event_images').delete().eq('id', imageToDelete.id);
      
      setImages(prev => prev.filter(img => img.id !== imageToDelete.id));
      if(selectedImage?.id === imageToDelete.id) setSelectedImage(null);
      
      showToast('Imagen eliminada correctamente');
    } catch (e) { 
      showToast('Error al eliminar', 'error'); 
    } finally {
      setImageToDelete(null); // Cerramos modal
    }
  };

  const toggleVisibility = async (id: string, currentStatus: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSuperAdmin) { showToast('Solo Super Admin autoriza.', 'error'); return; }
    
    const newStatus = !currentStatus;
    setImages(prev => prev.map(img => img.id === id ? { ...img, is_public: newStatus } : img));
    
    try {
      const updatePayload: EventImageUpdate = { is_public: newStatus };
      const { error } = await supabase.from('event_images').update(updatePayload).eq('id', id);
      if (error) throw error;
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

  const updateEventId = async (imageId: string, newEventId: string) => {
    const finalEventId = newEventId === "" ? null : newEventId;
    setImages(prev => prev.map(img => img.id === imageId ? { ...img, event_id: finalEventId || undefined } : img));
    try { await supabase.from('event_images').update({ event_id: finalEventId }).eq('id', imageId); showToast('Vinculado'); } 
    catch (e) { showToast('Error al vincular', 'error'); }
  };

  const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(e.type === "dragenter" || e.type === "dragover"); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if(e.dataTransfer.files) handleFiles(e.dataTransfer.files); };

  if (loading || roleLoading) return <div className="h-96 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-blue-600"/></div>;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 border-b border-gray-200 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-gray-700"/>
            Galería de Imágenes <Badge count={images.length} />
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {isSuperAdmin ? 'Modo Administrador' : 'Modo Operaciones (Solo subida y edición)'}
          </p>
        </div>
        <button onClick={() => inputRef.current?.click()} disabled={uploading} className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg hover:bg-black transition-all shadow-lg font-medium active:scale-95">
          {uploading ? <Loader2 className="animate-spin w-4 h-4"/> : <Upload className="w-4 h-4"/>} Subir Fotos
        </button>
      </div>

      {/* UPLOAD */}
      <div className={`mb-10 relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${dragActive ? 'border-blue-500 bg-blue-50/50 ring-4 ring-blue-100' : 'border-gray-300 bg-gray-50/30'}`}
        onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
        <input ref={inputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleFiles(e.target.files)}/>
        <div className="flex flex-col items-center gap-3 pointer-events-none">
           <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center border border-gray-100"><Upload className="w-6 h-6 text-blue-600"/></div>
           <div><h3 className="text-base font-semibold text-gray-900">Arrastra fotos aquí</h3></div>
        </div>
      </div>

      {/* GRID */}
      {images.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 xl:gap-8">
          {images.map((img) => {
            const linkedEvent = eventsList.find(e => e.id === img.event_id);
            return (
              <div key={img.id} className={`group bg-white rounded-2xl shadow-sm hover:shadow-xl border transition-all duration-300 flex flex-col overflow-hidden ${!img.is_public ? 'border-dashed border-gray-300 opacity-90' : 'border-gray-200'}`}>
                {/* IMG */}
                <div className="relative aspect-[4/3] bg-gray-100 cursor-zoom-in overflow-hidden" onClick={() => setSelectedImage(img)}>
                  <img src={img.image_url} alt="Portfolio" className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${!img.is_public ? 'grayscale' : ''}`} loading="lazy"/>
                  {linkedEvent && <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded border border-white/20">{linkedEvent.event_type}</div>}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center"><Maximize2 className="text-white opacity-0 group-hover:opacity-100 w-8 h-8"/></div>
                  
                  {/* VISIBILITY */}
                  <div className="absolute top-2 right-2 z-10" onClick={e => e.stopPropagation()}>
                    {isSuperAdmin ? (
                      <button onClick={(e) => toggleVisibility(img.id, img.is_public, e)} className={`p-1.5 rounded-full backdrop-blur-md border shadow-sm transition-all hover:scale-110 ${img.is_public ? 'bg-white/90 text-green-600' : 'bg-gray-900/90 text-gray-300'}`}>
                        {img.is_public ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                    ) : (
                      <div className={`p-1.5 rounded-full backdrop-blur-md border shadow-sm ${img.is_public ? 'bg-white/80 text-green-600' : 'bg-gray-900/80 text-gray-400'}`}>
                        {img.is_public ? <Eye size={16} /> : <EyeOff size={16} />}
                      </div>
                    )}
                  </div>
                </div>

                {/* BODY */}
                <div className="p-4 flex flex-col gap-3 flex-1">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1"><LinkIcon size={10} /> Vincular Evento</label>
                    <select className="w-full text-xs bg-gray-50 border border-gray-200 rounded-md px-2 py-2 outline-none" value={img.event_id || ""} onChange={(e) => updateEventId(img.id, e.target.value)}>
                      <option value="">-- Sin vincular --</option>
                      {eventsList.map(ev => <option key={ev.id} value={ev.id}>{ev.event_type} • {ev.client_name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Descripción</label>
                    <input type="text" defaultValue={img.caption || ''} placeholder="Descripción..." className="w-full text-sm border-gray-200 rounded-md px-2 py-1.5 focus:ring-1 focus:ring-blue-400 outline-none border" onBlur={(e) => updateCaption(img.id, e.target.value)}/>
                  </div>
                  <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium"><Calendar className="w-3 h-3" /><span>{new Date(img.created_at).toLocaleDateString()}</span></div>
                    <div className="flex items-center gap-1">
                      {isSuperAdmin && (
                        <button onClick={(e) => handleDownload(img.image_url, e)} disabled={downloadingId === img.image_url} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded">
                          {downloadingId === img.image_url ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Download className="w-3.5 h-3.5"/>}
                        </button>
                      )}
                      
                      {/* ✅ DELETE (Ahora llama a requestDelete en lugar de handleDelete directo) */}
                      {isSuperAdmin ? (
                        <button onClick={() => requestDelete(img.id, img.image_url)} className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded">
                          <Trash2 className="w-3.5 h-3.5"/>
                        </button>
                      ) : (
                        <div title="No tienes permiso para borrar" className="p-1.5 cursor-not-allowed">
                           <Lock className="w-3.5 h-3.5 text-gray-300" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (!uploading && <div className="text-center py-20 text-gray-400">Portafolio vacío</div>)}

      {/* --- MODAL 1: LIGHTBOX --- */}
      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <button className="absolute top-6 right-6 text-white/50 hover:text-white p-2" onClick={() => setSelectedImage(null)}><X size={32}/></button>
          <div className="flex flex-col items-center max-w-7xl w-full h-full justify-center" onClick={(e) => e.stopPropagation()}>
            <img src={selectedImage.image_url} alt="Full view" className="max-h-[85vh] w-auto object-contain rounded-sm shadow-2xl"/>
             <div className="mt-6 text-center">
              <p className="text-white text-xl font-light">{selectedImage.caption || <span className="text-white/30 italic">Sin descripción</span>}</p>
              {isSuperAdmin && <button onClick={(e) => handleDownload(selectedImage.image_url, e)} className="mt-4 flex items-center gap-2 mx-auto text-sm text-white/70 border border-white/20 px-4 py-2 rounded-full"><Download size={14} /> Descargar original</button>}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: CONFIRMACIÓN DE BORRADO (NUEVO) --- */}
      {imageToDelete && (
        <div className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
            {/* Header Peligro */}
            <div className="bg-red-50 p-6 flex flex-col items-center text-center border-b border-red-100">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-red-900">¿Eliminar esta imagen?</h3>
              <p className="text-red-700 text-sm mt-1">Esta acción es irreversible y eliminará la foto de la web pública permanentemente.</p>
            </div>
            
            {/* Footer Botones */}
            <div className="p-4 bg-gray-50 flex gap-3 justify-end">
              <button 
                onClick={() => setImageToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-sm transition-colors flex items-center gap-2"
              >
                <Trash2 size={16} />
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <MiniToast msg={toast.msg} type={toast.type} />}
    </div>
  );
}