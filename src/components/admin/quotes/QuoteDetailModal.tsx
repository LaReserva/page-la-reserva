import { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  User, 
  Calendar, 
  DollarSign, 
  FileText,
  Clock,
  Package,
  CalendarCheck,
  Loader2,
  AlertTriangle,
  Ban,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Quote } from '@/types';
import { formatCurrency } from '@/utils/formatters';
import { cn } from '@/utils/utils';

// Lista de paquetes para el select
const AVAILABLE_PACKAGES = [
  { value: 'esencial', label: 'Esencial' },
  { value: 'premium', label: 'Premium' },
  { value: 'exclusive', label: 'Exclusive' },
  { value: 'corporativo-esencial', label: 'Corporativo Esencial' },
  { value: 'corporativo-premium', label: 'Corporativo Premium' },
  { value: 'barra-movil', label: 'Solo Barra Móvil' },
];

interface QuoteDetailModalProps {
  quote: Quote | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedQuote: Quote) => void;
}

export function QuoteDetailModal({ quote, isOpen, onClose, onUpdate }: QuoteDetailModalProps) {
  // Estados de datos
  const [notes, setNotes] = useState('');
  const [price, setPrice] = useState<string>('');
  const [eventDate, setEventDate] = useState('');
  const [guestCount, setGuestCount] = useState<number | ''>('');
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  // Estados de UI/Lógica
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [dateError, setDateError] = useState(false);
  
  // ✅ NUEVO ESTADO: Verificación real de existencia de evento
  const [eventExists, setEventExists] = useState(false);
  const [checkingEvent, setCheckingEvent] = useState(false);

  // Sincronizar y verificar evento al abrir
  useEffect(() => {
    if (quote && isOpen) {
      const cleanNotes = (quote.admin_notes || '').split('\n[Sistema]:')[0].trim();
      setNotes(cleanNotes);
      setPrice(quote.estimated_price?.toString() || '');
      setEventDate(quote.event_date);
      setGuestCount(quote.guest_count);
      setSelectedPackage(quote.interested_package || '');
      
      setShowConfirm(false);
      setDateError(false);
      
      // ✅ Verificar si existe evento real en la BD
      checkEventExistence(quote.id);
    }
  }, [quote, isOpen]);

  // Función para verificar si existe el evento
  async function checkEventExistence(quoteId: string) {
    setCheckingEvent(true);
    const { data } = await supabase
      .from('events')
      .select('id')
      .eq('quote_id', quoteId)
      .maybeSingle();
    
    setEventExists(!!data);
    setCheckingEvent(false);
  }

  // Validar fecha en tiempo real
  useEffect(() => {
    if (eventDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(`${eventDate}T00:00:00`); // Forzar hora local
      setDateError(selected < today);
    }
  }, [eventDate]);

  if (!isOpen || !quote) return null;

  // Handlers de inputs
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') { setPrice(''); return; }
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) setPrice(val);
  };

  const handleGuestChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') { setGuestCount(''); return; }
    const num = parseInt(val);
    if (!isNaN(num) && num >= 0) setGuestCount(num);
  };

  // --- LÓGICA CREAR EVENTO ---
  const initiateConversion = () => {
    if (!price || parseFloat(price) <= 0) return alert("Ingresa un presupuesto estimado.");
    if (dateError) return alert("Corrige la fecha pasada.");
    if (!guestCount) return alert("Ingresa cantidad de invitados.");
    setShowConfirm(true);
  };

  const executeConversion = async () => {
    try {
      setIsProcessing(true);

      // 1. Cliente (Buscar o Crear)
      let clientId = null;
      const { data: existingClient } = await supabase.from('clients').select('id').eq('email', quote.client_email).maybeSingle();

      if (existingClient) {
        clientId = existingClient.id;
      } else {
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({
            name: quote.client_name, email: quote.client_email, phone: quote.client_phone, total_events: 1, total_spent: 0 
          }).select().single();
        if (clientError) throw clientError;
        clientId = newClient.id;
      }

      // 2. Crear Evento
      const { error: eventError } = await supabase.from('events').insert({
        client_id: clientId,
        quote_id: quote.id,
        event_type: quote.event_type,
        event_date: eventDate,
        event_time: '12:00:00', 
        guest_count: Number(guestCount),
        total_price: parseFloat(price),
        status: 'confirmed',
        deposit_paid: 0,
        notes: notes
      });

      if (eventError) throw eventError;

      // 3. Actualizar Cotización
      const originalNotes = quote.admin_notes || '';
      const notesToSave = originalNotes.includes(notes) && notes !== '' ? originalNotes : notes;

      const { data: updatedQuote, error: quoteError } = await supabase
        .from('quotes')
        .update({ 
          status: 'converted',
          estimated_price: parseFloat(price),
          event_date: eventDate,
          guest_count: Number(guestCount),
          interested_package: selectedPackage,
          admin_notes: notesToSave + `\n[Sistema]: Convertido a evento el ${new Date().toLocaleDateString()}.`
        })
        .eq('id', quote.id)
        .select().single();

      if (quoteError) throw quoteError;

      if (updatedQuote) onUpdate(updatedQuote as Quote);
      setEventExists(true); // ✅ Actualizamos estado local
      setShowConfirm(false);
      // No cerramos el modal inmediatamente para que vea el cambio de estado
      
    } catch (error: any) {
      console.error(error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- LÓGICA ELIMINAR EVENTO ---
  const handleDeleteEvent = async () => {
    if (!confirm("¿Seguro? Esto eliminará el evento del calendario.")) return;

    try {
      setIsProcessing(true);
      
      const { error: deleteError } = await supabase
        .from('events')
        .delete()
        .eq('quote_id', quote.id);

      if (deleteError) throw deleteError;

      // Opcional: Regresar estado a 'quoted' o dejarlo en 'converted' pero sin evento
      // Aquí lo regresamos a 'quoted' para consistencia
      const { data: updatedQuote, error: updateError } = await supabase
        .from('quotes')
        .update({ status: 'quoted' })
        .eq('id', quote.id)
        .select().single();

      if (updateError) throw updateError;

      if (updatedQuote) onUpdate(updatedQuote as Quote);
      setEventExists(false); // ✅ Actualizamos estado local
      
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

// --- GUARDAR CAMBIOS GENERALES ---
  const handleSave = async () => {
    try {
      setIsSaving(true);

      // 1. Validación: guest_count es obligatorio en la BD, no puede ser null
      if (guestCount === '' || Number(guestCount) <= 0) {
        alert("La cantidad de invitados es obligatoria y debe ser mayor a 0.");
        setIsSaving(false);
        return;
      }

      // 2. Validación: event_date es obligatorio
      if (!eventDate) {
        alert("La fecha del evento es obligatoria.");
        setIsSaving(false);
        return;
      }

      // 3. Preparar objeto con tipos seguros
      const updates = {
        admin_notes: notes,
        estimated_price: price ? parseFloat(price) : null,
        event_date: eventDate,
        guest_count: Number(guestCount), // Convertimos explícitamente a number
        interested_package: selectedPackage || null // Convertimos string vacío a null si es opcional
      };

      const { data, error } = await supabase
        .from('quotes')
        .update(updates)
        .eq('id', quote.id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        // Casting explícito a Quote para satisfacer a TypeScript si es necesario
        onUpdate(data as Quote);
        onClose();
      }
    } catch (error) {
      console.error('Error updating quote:', error);
      alert('Error al guardar cambios');
    } finally {
      setIsSaving(false);
    }
  };

  const isDeclined = quote.status === 'declined';
  // ✅ isLocked ahora depende si hay un evento real creado, no solo del estado
  const isLocked = eventExists || isDeclined; 

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-secondary-900/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Confirm Modal */}
        {showConfirm && (
          <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur flex flex-col items-center justify-center text-center p-8 animate-in fade-in">
            <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mb-4"><CalendarCheck className="w-8 h-8" /></div>
            <h3 className="text-2xl font-bold text-secondary-900 mb-2">¿Crear Evento en Calendario?</h3>
            <p className="text-secondary-500 mb-8">Fecha: <strong>{new Date(eventDate + 'T00:00:00').toLocaleDateString()}</strong></p>
            <div className="flex gap-4">
              <button onClick={() => setShowConfirm(false)} className="px-6 py-3 rounded-xl font-medium text-secondary-600 hover:bg-secondary-100">Cancelar</button>
              <button onClick={executeConversion} disabled={isProcessing} className="px-8 py-3 rounded-xl font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-lg flex items-center gap-2">
                {isProcessing ? <><Loader2 className="w-5 h-5 animate-spin" /> ...</> : "Sí, Crear"}
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-100 bg-secondary-50/50">
          <div>
            <h2 className="text-xl font-display font-bold text-secondary-900">Detalles</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-secondary-500 font-mono bg-secondary-200 px-1.5 py-0.5 rounded">{quote.id.slice(0, 8)}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold border bg-white border-secondary-200 text-secondary-600`}>
                {quote.status.toUpperCase()}
              </span>
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-secondary-400 hover:text-secondary-600" /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Cliente */}
              <section>
                <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-wider mb-3 flex items-center gap-2"><User className="w-4 h-4 text-primary-500" /> Cliente</h3>
                <div className="bg-secondary-50 p-4 rounded-xl border border-secondary-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="text-xs text-secondary-400 block mb-1">Nombre</label><p className="font-bold text-secondary-900">{quote.client_name}</p></div>
                  <div><label className="text-xs text-secondary-400 block mb-1">Teléfono</label><p className="font-medium text-secondary-900">{quote.client_phone}</p></div>
                  <div className="sm:col-span-2"><label className="text-xs text-secondary-400 block mb-1">Email</label><p className="font-medium text-secondary-900">{quote.client_email}</p></div>
                </div>
              </section>

              {/* Evento Editable */}
              <section>
                <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Calendar className="w-4 h-4 text-primary-500" /> Evento</h3>
                <div className="bg-secondary-50 p-4 rounded-xl border border-secondary-100 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-secondary-400 block mb-1 font-medium">Fecha</label>
                      {/* ✅ INPUT FECHA CON MIN DATE */}
                      <input 
                        type="date" 
                        value={eventDate}
                        min={new Date().toISOString().split('T')[0]} // Bloquea fechas pasadas
                        onChange={(e) => setEventDate(e.target.value)}
                        disabled={isLocked}
                        className={cn("w-full p-2.5 rounded-lg border focus:ring-2 focus:ring-primary-500 font-medium", dateError ? "border-red-300 bg-red-50" : "border-secondary-200", isLocked && "bg-secondary-100 opacity-70 cursor-not-allowed")}
                      />
                      {dateError && !isLocked && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Fecha pasada</p>}
                    </div>
                    <div>
                      <label className="text-xs text-secondary-400 block mb-1 font-medium">Invitados</label>
                      <input type="number" min="1" value={guestCount} onChange={handleGuestChange} disabled={isLocked} className={cn("w-full p-2.5 rounded-lg border border-secondary-200 focus:ring-2 focus:ring-primary-500 font-medium", isLocked && "bg-secondary-100 opacity-70 cursor-not-allowed")} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-secondary-400 block mb-1 font-medium">Paquete</label>
                    <div className="relative">
                      <select value={selectedPackage || ''} onChange={(e) => setSelectedPackage(e.target.value)} disabled={isLocked} className={cn("w-full p-2.5 pr-8 rounded-lg border border-secondary-200 focus:ring-2 focus:ring-primary-500 appearance-none capitalize", isLocked && "bg-secondary-100 opacity-70 cursor-not-allowed")}>
                        <option value="">Seleccionar...</option>
                        {AVAILABLE_PACKAGES.map(pkg => <option key={pkg.value} value={pkg.value}>{pkg.label}</option>)}
                      </select>
                      <Package className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-secondary-400 block mb-1 font-medium">Mensaje Original</label>
                    <div className="bg-white p-3 rounded-lg border border-secondary-100 text-sm italic text-secondary-600">"{quote.message || 'Sin mensaje.'}"</div>
                  </div>
                </div>
              </section>
            </div>

            {/* Derecha: Acciones */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl border-2 border-secondary-100 p-5 space-y-6 shadow-sm">
                <div>
                  <label className="text-sm font-bold text-secondary-900 mb-2 flex items-center gap-2"><FileText className="w-4 h-4 text-primary-500" /> Notas</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full min-h-[120px] p-3 text-sm bg-secondary-50 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500 resize-none" placeholder="Notas internas..." />
                </div>

                <div>
                  <label className="text-sm font-bold text-secondary-900 mb-2 flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary-500" /> Presupuesto</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 font-semibold">S/</span>
                    <input type="number" min="0" step="0.01" value={price} onChange={handlePriceChange} disabled={isLocked} className={cn("w-full pl-8 pr-4 py-2.5 bg-secondary-50 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500 font-mono font-medium text-lg", isLocked && "opacity-70 cursor-not-allowed")} placeholder="0.00" />
                  </div>
                </div>

                <div className="pt-4 border-t border-secondary-100">
                  {checkingEvent ? (
                    <div className="flex justify-center py-2"><Loader2 className="w-5 h-5 animate-spin text-secondary-400"/></div>
                  ) : isDeclined ? (
                    <div className="w-full py-3 px-4 bg-gray-100 text-gray-400 rounded-lg font-bold flex items-center justify-center gap-2 cursor-not-allowed border border-gray-200"><Ban className="w-5 h-5" /> Declinada</div>
                  ) : eventExists ? (
                    // ✅ BOTÓN ELIMINAR (Solo si existe evento real)
                    <button onClick={handleDeleteEvent} disabled={isProcessing} className="w-full py-3 px-4 bg-white border-2 border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200 rounded-lg font-bold transition-all flex items-center justify-center gap-2">
                      {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-5 h-5" /> Eliminar Evento</>}
                    </button>
                  ) : (
                    // ✅ BOTÓN CREAR (Habilitado aunque estado sea 'converted' si no hay evento real)
                    <>
                      <button onClick={initiateConversion} disabled={!price || parseFloat(price) <= 0 || dateError || !guestCount} className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        <CalendarCheck className="w-5 h-5" /> Confirmar como Evento
                      </button>
                      {(!price || parseFloat(price) <= 0) && <p className="text-xs text-center text-red-500 mt-2 flex items-center justify-center gap-1"><AlertTriangle className="w-3 h-3" /> Falta presupuesto</p>}
                    </>
                  )}
                </div>
              </div>

              <div className="bg-secondary-50 rounded-lg p-4 text-xs text-secondary-400 space-y-2 border border-secondary-100">
                <div className="flex items-center gap-2"><Clock className="w-3 h-3" /><span>Creado: {new Date(quote.created_at).toLocaleString()}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-secondary-50 border-t border-secondary-100 flex justify-between items-center gap-3">
          {eventExists ? (
            <div className="flex items-center gap-2 text-green-700 text-sm font-medium bg-green-100 px-3 py-1.5 rounded-lg">
              <CalendarCheck className="w-4 h-4" /> <span>Evento activo en calendario</span>
            </div>
          ) : (
            <div></div>
          )}
          
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-secondary-600 hover:text-secondary-900 hover:bg-white rounded-lg transition-colors">Cerrar</button>
            <button onClick={handleSave} disabled={isSaving || dateError} className="px-6 py-2 text-sm font-bold text-white bg-secondary-900 hover:bg-secondary-800 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
              {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : <><Save className="w-4 h-4" /> Guardar Cambios</>}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}