import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
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
  Link as LinkIcon
} from 'lucide-react';

// --- TIPOS ---
type EventImageRow = Database['public']['Tables']['event_images']['Row'];

// Tipo auxiliar para el selector de eventos
type EventOption = {
  id: string;
  event_type: string;
  event_date: string;
  client_name?: string; // Lo obtenemos del join con clients
};

const mapRowToEventImage = (row: EventImageRow): EventImage => ({
  id: row.id,
  image_url: row.image_url,
  created_at: row.created_at || new Date().toISOString(),
  order_index: row.order_index ?? 0,
  is_public: row.is_public ?? true,
  caption: row.caption || undefined,
  event_id: row.event_id || undefined,
  thumbnail_url: row.thumbnail_url || undefined,
});

// --- COMPONENTES UI AUXILIARES ---
const Badge = ({ count }: { count: number }) => (
  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ml-2 border border-blue-200">
    {count} {count === 1 ? 'foto' : 'fotos'}
  </span>
);

const MiniToast = ({ msg }: { msg: string }) => (
  <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-5 py-3 rounded-lg shadow-2xl animate-fade-in z-50 flex items-center gap-2 font-medium border border-gray-700">
    <div className="w-2 h-2 bg-green-400 rounded-full shadow-[0_0_8px_rgba(74,222,128,0.5)]"></div>
    {msg}
  </div>
);

export default function PortfolioView() {
  // Estados
  const [images, setImages] = useState<EventImage[]>([]);
  const [eventsList, setEventsList] = useState<EventOption[]>([]); // ✅ Nuevo: Lista de eventos
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<EventImage | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // --- LÓGICA ---
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  useEffect(() => {
    Promise.all([fetchImages(), fetchEvents()]).finally(() => setLoading(false));

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedImage(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const fetchImages = async () => {
    try {
      const { data, error } = await supabase
        .from('event_images')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setImages(data.map(mapRowToEventImage));
    } catch (error) { console.error(error); }
  };

  // ✅ Nuevo: Obtener eventos para el selector
  const fetchEvents = async () => {
    try {
      // Obtenemos eventos y el nombre del cliente asociado
      const { data, error } = await supabase
        .from('events')
        .select(`
          id, 
          event_type, 
          event_date, 
          clients ( name )
        `)
        .order('event_date', { ascending: false });

      if (error) throw error;
      
      if (data) {
        const mappedEvents = data.map((e: any) => ({
          id: e.id,
          event_type: e.event_type,
          event_date: e.event_date,
          client_name: e.clients?.name || 'Cliente sin nombre'
        }));
        setEventsList(mappedEvents);
      }
    } catch (error) { console.error("Error cargando eventos", error); }
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
          .insert([{ image_url: publicUrl, is_public: true, order_index: 0, caption: null }])
          .select()
          .single();

        if (dbErr) errorCount++;
        else if (dbData) newImages.push(mapRowToEventImage(dbData));
      }
      setImages(prev => [...newImages, ...prev]);
      showToast(errorCount > 0 ? `Subida con ${errorCount} errores` : 'Imágenes subidas');
    } catch (e) { showToast('Error al subir'); } 
    finally { setUploading(false); setDragActive(false); if(inputRef.current) inputRef.current.value = ''; }
  };

  const handleDelete = async (id: string, imageUrl: string) => {
    if (!window.confirm('¿Estás seguro de eliminar esta imagen?')) return;
    try {
      const fileName = imageUrl.split('/').pop();
      if(fileName) await supabase.storage.from('portfolio').remove([fileName]);
      await supabase.from('event_images').delete().eq('id', id);
      setImages(prev => prev.filter(img => img.id !== id));
      if(selectedImage?.id === id) setSelectedImage(null);
      showToast('Imagen eliminada');
    } catch (e) { showToast('Error al eliminar'); }
  };

  const toggleVisibility = async (id: string, currentStatus: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = !currentStatus;
    setImages(prev => prev.map(img => img.id === id ? { ...img, is_public: newStatus } : img));
    try {
      await supabase.from('event_images').update({ is_public: newStatus }).eq('id', id);
      showToast(newStatus ? 'Imagen visible' : 'Imagen oculta');
    } catch (error) { setImages(prev => prev.map(img => img.id === id ? { ...img, is_public: currentStatus } : img)); }
  };

  const updateCaption = async (id: string, newCaption: string) => {
    try { await supabase.from('event_images').update({ caption: newCaption }).eq('id', id); } 
    catch (e) { console.error(e); }
  };

  // ✅ Nuevo: Actualizar el Evento vinculado
  const updateEventId = async (imageId: string, newEventId: string) => {
    const finalEventId = newEventId === "" ? null : newEventId;
    
    // Optimistic Update local
    setImages(prev => prev.map(img => img.id === imageId ? { ...img, event_id: finalEventId || undefined } : img));

    try {
      await supabase.from('event_images').update({ event_id: finalEventId }).eq('id', imageId);
      showToast('Evento vinculado correctamente');
    } catch (e) { 
        console.error(e);
        showToast('Error al vincular evento');
    }
  };

  // --- RENDERS AUXILIARES ---
  const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(e.type === "dragenter" || e.type === "dragover"); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if(e.dataTransfer.files) handleFiles(e.dataTransfer.files); };

  if (loading) return <div className="h-96 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-blue-600"/></div>;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* 1. ENCABEZADO */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 border-b border-gray-200 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-gray-700"/>
            Galería de Imágenes
            <Badge count={images.length} />
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona las fotos y <span className="text-blue-600 font-medium">vincúlalas a eventos</span> para que aparezcan en las categorías correctas.
          </p>
        </div>
        
        <button 
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg hover:bg-black transition-all shadow-lg font-medium active:scale-95"
        >
          {uploading ? <Loader2 className="animate-spin w-4 h-4"/> : <Upload className="w-4 h-4"/>}
          Subir Fotos
        </button>
      </div>

      {/* 2. ZONA DE CARGA */}
      <div 
        className={`mb-10 relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300
          ${dragActive 
            ? 'border-blue-500 bg-blue-50/50 scale-[1.01] shadow-xl ring-4 ring-blue-100' 
            : 'border-gray-300 bg-gray-50/30 hover:border-gray-400 hover:bg-gray-50'
          }`}
        onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
      >
        <input ref={inputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleFiles(e.target.files)}/>
        <div className="flex flex-col items-center gap-3 pointer-events-none">
           <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center border border-gray-100">
             <Upload className="w-6 h-6 text-blue-600"/>
           </div>
           <div>
             <h3 className="text-base font-semibold text-gray-900">Arrastra fotos aquí</h3>
           </div>
        </div>
      </div>

      {/* 3. GRILLA DE TARJETAS */}
      {images.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 xl:gap-8">
          {images.map((img) => {
            // Buscamos el evento vinculado para mostrar su tipo (categoría) visualmente
            const linkedEvent = eventsList.find(e => e.id === img.event_id);

            return (
              <div 
                key={img.id} 
                className={`group bg-white rounded-2xl shadow-sm hover:shadow-xl border transition-all duration-300 flex flex-col overflow-hidden
                  ${!img.is_public ? 'border-dashed border-gray-300 opacity-90' : 'border-gray-200'}
                `}
              >
                {/* IMAGEN HEADER */}
                <div 
                  className="relative aspect-[4/3] bg-gray-100 cursor-zoom-in overflow-hidden"
                  onClick={() => setSelectedImage(img)}
                >
                  <img 
                    src={img.image_url} 
                    alt="Portfolio" 
                    className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${!img.is_public ? 'grayscale filter contrast-125' : ''}`}
                    loading="lazy"
                  />
                  
                  {/* Badge de Categoría (si hay evento vinculado) */}
                  {linkedEvent && (
                    <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded border border-white/20">
                      {linkedEvent.event_type}
                    </div>
                  )}

                  {/* Overlay Hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                     <Maximize2 className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg transform scale-75 group-hover:scale-100 duration-200 w-8 h-8"/>
                  </div>

                  {/* Visibilidad Button */}
                  <div className="absolute top-2 right-2 z-10" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={(e) => toggleVisibility(img.id, img.is_public, e)}
                      className={`p-1.5 rounded-full backdrop-blur-md border shadow-sm transition-all hover:scale-110 active:scale-95
                        ${img.is_public 
                          ? 'bg-white/90 text-green-600 border-white hover:text-green-700' 
                          : 'bg-gray-900/90 text-gray-300 border-gray-700 hover:text-white'}
                      `}
                    >
                      {img.is_public ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                  </div>
                </div>

                {/* BODY */}
                <div className="p-4 flex flex-col gap-3 flex-1">
                  
                  {/* SELECTOR DE EVENTO (VITAL PARA CATEGORÍAS) */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1">
                      <LinkIcon size={10} /> Vincular Evento
                    </label>
                    <select
                      className="w-full text-xs bg-gray-50 border border-gray-200 rounded-md px-2 py-2 outline-none focus:ring-1 focus:ring-blue-400 focus:bg-white text-gray-700 truncate"
                      value={img.event_id || ""}
                      onChange={(e) => updateEventId(img.id, e.target.value)}
                    >
                      <option value="">-- Sin vincular (Sin categoría) --</option>
                      {eventsList.map(ev => (
                        <option key={ev.id} value={ev.id}>
                          {ev.event_type} • {ev.client_name} ({new Date(ev.event_date).toLocaleDateString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Input Caption */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Descripción</label>
                    <input 
                      type="text" 
                      defaultValue={img.caption || ''} 
                      placeholder="Descripción..." 
                      className="w-full text-sm text-gray-700 bg-white border border-gray-200 rounded-md px-2 py-1.5 focus:ring-1 focus:ring-blue-400 transition-all outline-none"
                      onBlur={(e) => { if(e.target.value !== img.caption) updateCaption(img.id, e.target.value); }}
                    />
                  </div>

                  {/* Footer */}
                  <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(img.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    <button 
                      onClick={() => handleDelete(img.id, img.image_url)} 
                      className="flex items-center gap-1 px-1.5 py-1 rounded text-[10px] font-medium text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-3 h-3"/> Borrar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        !uploading && (
          <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
             <ImageIcon className="w-16 h-16 text-gray-300 mb-4"/>
             <p className="text-gray-500 text-lg font-medium">Tu portafolio está vacío.</p>
          </div>
        )
      )}

      {/* --- MODAL --- */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200"
          onClick={() => setSelectedImage(null)}
        >
          <button 
            className="absolute top-6 right-6 text-white/50 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors z-50"
            onClick={() => setSelectedImage(null)}
          >
            <X size={32} strokeWidth={1.5} />
          </button>

          <div 
            className="flex flex-col items-center max-w-7xl w-full h-full justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={selectedImage.image_url} 
              alt="Full view" 
              className="max-h-[85vh] w-auto object-contain rounded-sm shadow-2xl"
            />
            
            <div className="mt-6 text-center max-w-2xl animate-in slide-in-from-bottom-4 duration-300 delay-100">
              <p className="text-white text-xl font-light tracking-wide">
                {selectedImage.caption || <span className="text-white/30 italic">Sin descripción</span>}
              </p>
            </div>
          </div>
        </div>
      )}

      {toastMsg && <MiniToast msg={toastMsg} />}
    </div>
  );
}