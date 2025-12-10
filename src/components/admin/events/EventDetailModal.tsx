import { useState, useEffect } from 'react';
import { 
  X, Save, Calendar, MapPin, FileText, 
  Upload, Download, Trash2, Ban, CheckCircle2, 
  Clock, Wine, Loader2, AlertCircle, AlertTriangle,
  UserCog // Icono para el creador
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Event, EventStatus } from '@/types';
import { useUserRole } from '@/hooks/useUserRole'; 
import { cn } from '@/utils/utils';

interface EventDetailModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedEvent: Event) => void;
}

export function EventDetailModal({ event, isOpen, onClose, onUpdate }: EventDetailModalProps) {
  const { role, isSuperAdmin } = useUserRole();
  const canEdit = isSuperAdmin || role === 'sales';
  const isBartender = role === 'operations';

  const [formData, setFormData] = useState<Partial<Event>>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(''); 
  const [dateError, setDateError] = useState(false);
  
  // ✅ Estado para el nombre del creador
  const [creatorName, setCreatorName] = useState<string>('');

  // Estados Modales Internos
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    if (event && isOpen) {
      setFormData({
        ...event,
        venue: event.venue || '',
        event_time: event.event_time || '', 
        bartender_count: event.bartender_count || 0,
        bartender_names: event.bartender_names || '',
        bar_menu: event.bar_menu || '',
        special_requests: event.special_requests || '',
        requirements_url: event.requirements_url || '',
        quote_doc_url: event.quote_doc_url || '',
      });
      setDateError(false);
      setShowConfirmModal(false);
      setShowCancelModal(false);
      
      // ✅ Buscar nombre del creador
      fetchCreatorName(event.closed_by);
    }
  }, [event, isOpen]);

  // ✅ Función para obtener nombre del admin
  async function fetchCreatorName(userId?: string) {
    if (!userId) {
      setCreatorName('Sistema / Desconocido');
      return;
    }
    const { data } = await supabase
      .from('admin_users')
      .select('full_name')
      .eq('id', userId)
      .single();
    
    if (data) setCreatorName(data.full_name);
    else setCreatorName('Usuario eliminado');
  }

  // Validación de fecha
  useEffect(() => {
    if (formData.event_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(`${formData.event_date}T00:00:00`);
      if (selected < today && (!event || event.event_date !== formData.event_date)) {
        setDateError(true);
      } else {
        setDateError(false);
      }
    }
  }, [formData.event_date, event]);

  if (!isOpen || !event) return null;

  const isPastEvent = new Date(event.event_date) < new Date(new Date().setHours(0,0,0,0));
  const displayStatus = event.status === 'cancelled' 
    ? 'cancelled' 
    : isPastEvent && event.status === 'confirmed' 
      ? 'completed' 
      : event.status;

  // Helper fecha formato largo
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  // --- HANDLERS (Igual que antes) ---
  const handleInputChange = (field: keyof Event, value: any) => {
    if ((field === 'bartender_count' || field === 'guest_count') && typeof value === 'number') {
      if (value < 0) return;
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'requirements' | 'quote') => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    try {
      setUploading(type);
      const fileExt = file.name.split('.').pop();
      const fileName = `${event.id}/${type}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('event-docs').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('event-docs').getPublicUrl(fileName);
      const field = type === 'requirements' ? 'requirements_url' : 'quote_doc_url';
      handleInputChange(field, publicUrl);
    } catch (error) {
      console.error('Error uploading:', error);
      alert('Error al subir archivo');
    } finally {
      setUploading('');
    }
  };

  const initiateSave = () => {
    if (dateError) return;
    if (formData.status === 'pending' && formData.bartender_names && formData.requirements_url) {
      setShowConfirmModal(true);
    } else {
      executeSave(formData.status);
    }
  };

  const executeSave = async (statusToSave: EventStatus = 'pending') => {
    try {
      setLoading(true);
      const updates: Partial<Event> = {
        event_date: formData.event_date || event.event_date,
        event_time: formData.event_time || '',
        venue: formData.venue || '',
        guest_count: Number(formData.guest_count) || 0,
        bartender_count: Number(formData.bartender_count) || 0,
        bartender_names: formData.bartender_names || '',
        bar_menu: formData.bar_menu || '',
        special_requests: formData.special_requests || '',
        requirements_url: formData.requirements_url || '',
        quote_doc_url: formData.quote_doc_url || '',
        status: statusToSave
      };

      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', event.id)
        .select(`*, client:clients ( name )`)
        .single();

      if (error) throw error;

      if (formData.event_date && formData.event_date !== event.event_date && event.quote_id) {
        await supabase.from('quotes').update({ event_date: formData.event_date }).eq('id', event.quote_id);
      }
      
      onUpdate(data as unknown as Event);
      setShowConfirmModal(false);
      onClose();
    } catch (error: any) {
      console.error('Error saving:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const initiateCancel = () => setShowCancelModal(true);

  const executeCancel = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('events').update({ status: 'cancelled' }).eq('id', event.id).select().single();
      if (error) throw error;
      onUpdate(data as Event);
      setShowCancelModal(false);
      onClose();
    } catch (error) {
      alert('Error al cancelar evento');
    } finally {
      setLoading(false);
    }
  };

  const StatusBadge = () => {
    const config = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pendiente', icon: Clock },
      confirmed: { color: 'bg-green-100 text-green-800', label: 'Confirmado', icon: CheckCircle2 },
      completed: { color: 'bg-blue-100 text-blue-800', label: 'Completado', icon: CheckCircle2 },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelado', icon: Ban },
    };
    const statusKey = displayStatus as EventStatus;
    const current = config[statusKey] || config.pending;
    const Icon = current.icon;
    return (
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${current.color}`}>
        <Icon className="w-3 h-3" />
        <span className="uppercase">{current.label}</span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-secondary-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Modales Internos (Confirm/Cancel) ... (Igual que antes) */}
        {showConfirmModal && (
          <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur flex flex-col items-center justify-center text-center p-8 animate-in fade-in">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4"><CheckCircle2 className="w-8 h-8" /></div>
            <h3 className="text-2xl font-bold text-secondary-900 mb-2">Datos Operativos Completos</h3>
            <p className="text-secondary-500 max-w-md mb-8">Has completado la información requerida. ¿Deseas marcar este evento como <strong>CONFIRMADO</strong> automáticamente?</p>
            <div className="flex gap-4">
              <button onClick={() => executeSave('pending')} className="px-6 py-3 rounded-xl font-medium text-secondary-600 hover:bg-secondary-100">No, mantener Pendiente</button>
              <button onClick={() => executeSave('confirmed')} disabled={loading} className="px-8 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 shadow-lg flex items-center gap-2">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sí, Confirmar"}
              </button>
            </div>
          </div>
        )}

        {showCancelModal && (
          <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur flex flex-col items-center justify-center text-center p-8 animate-in fade-in">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4"><Ban className="w-8 h-8" /></div>
            <h3 className="text-2xl font-bold text-secondary-900 mb-2">¿Cancelar Evento?</h3>
            <p className="text-secondary-500 max-w-md mb-2">Estás a punto de cancelar el evento de <strong>{(event as any).client?.name}</strong>.</p>
            <p className="text-sm text-red-500 font-medium mb-8">Esta acción es irreversible.</p>
            <div className="flex gap-4">
              <button onClick={() => setShowCancelModal(false)} className="px-6 py-3 rounded-xl font-medium text-secondary-600 hover:bg-secondary-100">Volver</button>
              <button onClick={executeCancel} disabled={loading} className="px-8 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg flex items-center gap-2">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sí, Cancelar Evento"}
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="px-6 py-4 border-b border-secondary-100 bg-secondary-50 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-display font-bold text-secondary-900">{formData.event_type}</h2>
              <StatusBadge />
            </div>
            <p className="text-sm text-secondary-500">ID: {event.id.slice(0,8)}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary-200 rounded-full transition-colors"><X className="w-5 h-5 text-secondary-500" /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="space-y-6">
              {/* Card Datos Principales */}
              <div className="bg-white p-5 rounded-xl border border-secondary-200 shadow-sm">
                <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Calendar className="w-4 h-4" /> Datos Principales</h3>
                <div className="space-y-4">
                  <div><label className="text-xs text-secondary-500 block mb-1">Cliente</label><p className="font-medium text-secondary-900 text-lg">{(event as any).client?.name || 'Cliente'}</p></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-secondary-500 block mb-1">Fecha</label>
                      <input type="date" value={formData.event_date || ''} min={new Date().toISOString().split('T')[0]} onChange={(e) => handleInputChange('event_date', e.target.value)} disabled={!canEdit} className={cn("w-full text-sm font-medium border rounded-lg", dateError ? "border-red-500 bg-red-50" : "border-secondary-200")} />
                      {dateError && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Fecha inválida</p>}
                    </div>
                    <div>
                      <label className="text-xs text-secondary-500 block mb-1">Hora</label>
                      <input type="time" value={formData.event_time || ''} onChange={(e) => handleInputChange('event_time', e.target.value)} disabled={!canEdit} className="w-full text-sm font-medium border-secondary-200 rounded-lg" />
                    </div>
                  </div>
                  <div><label className="text-xs text-secondary-500 block mb-1">Ubicación</label><textarea value={formData.venue || ''} onChange={(e) => handleInputChange('venue', e.target.value)} disabled={!canEdit} rows={2} className="w-full text-sm border-secondary-200 rounded-lg resize-none" placeholder="Dirección..." /></div>
                  <div className="pt-2 border-t border-secondary-100 flex justify-between items-center"><span className="text-sm text-secondary-600">Invitados</span><span className="font-bold text-lg">{formData.guest_count}</span></div>
                </div>
              </div>

              {/* ✅ NUEVA CARD: METADATOS DE AUDITORÍA */}
              <div className="bg-secondary-50 rounded-xl p-4 border border-secondary-100 space-y-3">
                <div className="flex items-center gap-2 text-xs text-secondary-500">
                  <Clock className="w-3 h-3" />
                  <span>Creado: <span className="font-medium text-secondary-700">{formatDate(event.created_at)}</span></span>
                </div>
                {/* Asumimos que events tiene updated_at, si no, puedes quitar esta línea */}
                {event.updated_at && (
                  <div className="flex items-center gap-2 text-xs text-secondary-500">
                    <Save className="w-3 h-3" />
                    <span>Actualizado: <span className="font-medium text-secondary-700">{formatDate(event.updated_at)}</span></span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-secondary-500">
                  <UserCog className="w-3 h-3" />
                  <span>Creado por: <span className="font-medium text-secondary-700">{creatorName || 'Cargando...'}</span></span>
                </div>
              </div>

              {canEdit && displayStatus !== 'cancelled' && displayStatus !== 'completed' && (
                <button onClick={initiateCancel} className="w-full py-3 border-2 border-red-100 text-red-600 rounded-xl font-bold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /> Cancelar Evento</button>
              )}
            </div>

            {/* COLUMNA 2 (Derecha) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-5 rounded-xl border border-secondary-200 shadow-sm">
                <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Wine className="w-4 h-4" /> Logística de Barra</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div><label className="text-xs text-secondary-500 block mb-1">Carta de Bar</label><textarea value={formData.bar_menu || ''} onChange={(e) => handleInputChange('bar_menu', e.target.value)} disabled={!canEdit} className="w-full h-32 text-sm border-secondary-200 rounded-lg resize-none" placeholder="Lista..." /></div>
                  <div className="space-y-4">
                    <div><label className="text-xs text-secondary-500 block mb-1">Cantidad Bartenders</label><input type="number" min="0" value={formData.bartender_count || 0} onChange={(e) => handleInputChange('bartender_count', parseInt(e.target.value))} disabled={!canEdit} className="w-full text-sm border-secondary-200 rounded-lg" /></div>
                    <div><label className="text-xs text-secondary-500 block mb-1">Staff</label><textarea value={formData.bartender_names || ''} onChange={(e) => handleInputChange('bartender_names', e.target.value)} disabled={!canEdit} rows={2} className="w-full text-sm border-secondary-200 rounded-lg resize-none" placeholder="Ej: Juan..." /></div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-secondary-200 shadow-sm">
                <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-wider mb-4 flex items-center gap-2"><FileText className="w-4 h-4" /> Documentación</h3>
                <div className={`grid grid-cols-1 ${!isBartender ? 'md:grid-cols-2' : ''} gap-4`}>
                  <div className="border border-dashed border-secondary-300 rounded-lg p-4 flex flex-col items-center justify-center text-center bg-secondary-50/50">
                    <p className="font-semibold text-sm text-secondary-700 mb-1">Lista de Requerimientos</p>
                    {formData.requirements_url ? (
                      <div className="flex gap-2 mt-2"><a href={formData.requirements_url} target="_blank" rel="noopener" className="text-xs bg-primary-100 text-primary-700 px-3 py-1.5 rounded-lg hover:bg-primary-200 flex items-center gap-1"><Download className="w-3 h-3" /> Ver PDF</a>{canEdit && <button onClick={() => handleInputChange('requirements_url', null)} className="text-xs text-red-500 hover:text-red-700 p-1"><Trash2 className="w-4 h-4" /></button>}</div>
                    ) : (canEdit ? <label className="mt-2 cursor-pointer"><input type="file" accept=".pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'requirements')} /><span className="text-xs bg-secondary-800 text-white px-3 py-1.5 rounded-lg hover:bg-secondary-700 flex items-center gap-1">{uploading === 'requirements' ? <Loader2 className="w-3 h-3 animate-spin"/> : <Upload className="w-3 h-3" />} Subir PDF</span></label> : <span className="text-xs text-secondary-400 mt-2">No disponible</span>)}
                  </div>
                  {!isBartender && (
                    <div className="border border-dashed border-secondary-300 rounded-lg p-4 flex flex-col items-center justify-center text-center bg-secondary-50/50">
                      <p className="font-semibold text-sm text-secondary-700 mb-1">Cotización</p>
                      {formData.quote_doc_url ? (
                        <div className="flex gap-2 mt-2"><a href={formData.quote_doc_url} target="_blank" rel="noopener" className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-200 flex items-center gap-1"><Download className="w-3 h-3" /> Ver PDF</a></div>
                      ) : (canEdit ? <label className="mt-2 cursor-pointer"><input type="file" accept=".pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'quote')} /><span className="text-xs bg-white border border-secondary-300 text-secondary-600 px-3 py-1.5 rounded-lg hover:bg-secondary-50 flex items-center gap-1">{uploading === 'quote' ? <Loader2 className="w-3 h-3 animate-spin"/> : <Upload className="w-3 h-3" />} Subir PDF</span></label> : <span className="text-xs text-secondary-400 mt-2">No disponible</span>)}
                    </div>
                  )}
                </div>
                <div className="mt-4"><label className="text-xs text-secondary-500 block mb-1">Acotaciones Extras</label><textarea value={formData.special_requests || ''} onChange={(e) => handleInputChange('special_requests', e.target.value)} disabled={!canEdit} rows={3} className="w-full text-sm border-secondary-200 rounded-lg resize-none" placeholder="Notas..." /></div>
              </div>
            </div>
          </div>
        </div>

        {canEdit && displayStatus !== 'cancelled' && (
          <div className="px-6 py-4 bg-white border-t border-secondary-100 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-secondary-600 hover:bg-secondary-50 rounded-lg">Cancelar</button>
            <button onClick={initiateSave} disabled={loading} className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-lg shadow-md flex items-center gap-2">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar Cambios</button>
          </div>
        )}
      </div>
    </div>
  );
}