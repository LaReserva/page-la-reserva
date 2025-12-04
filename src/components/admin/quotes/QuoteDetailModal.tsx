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
  Trash2 // ✅ Nuevo icono para eliminar
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Quote } from '@/types';
import { formatCurrency } from '@/utils/formatters';

interface QuoteDetailModalProps {
  quote: Quote | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedQuote: Quote) => void;
}

export function QuoteDetailModal({ quote, isOpen, onClose, onUpdate }: QuoteDetailModalProps) {
  const [notes, setNotes] = useState('');
  const [price, setPrice] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // Renombrado para usar en crear/eliminar
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (quote) {
      setNotes(quote.admin_notes || '');
      setPrice(quote.estimated_price?.toString() || '');
      setShowConfirm(false);
    }
  }, [quote]);

  if (!isOpen || !quote) return null;

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      setPrice('');
      return;
    }
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      setPrice(val);
    }
  };

  // --- LÓGICA DE CREACIÓN ---
  const initiateConversion = () => {
    if (!price || parseFloat(price) <= 0) {
      alert("Por favor, ingresa un presupuesto estimado antes de confirmar el evento.");
      return;
    }
    setShowConfirm(true);
  };

  const executeConversion = async () => {
    try {
      setIsProcessing(true);

      // 1. Buscar o Crear Cliente
      let clientId = null;
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('email', quote.client_email)
        .single();

      if (existingClient) {
        clientId = existingClient.id;
      } else {
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({
            name: quote.client_name,
            email: quote.client_email,
            phone: quote.client_phone,
            total_events: 1,
            total_spent: 0 
          })
          .select()
          .single();

        if (clientError) throw clientError;
        clientId = newClient.id;
      }

      // 2. Crear el Evento
      const { error: eventError } = await supabase
        .from('events')
        .insert({
          client_id: clientId,
          quote_id: quote.id,
          event_type: quote.event_type,
          event_date: quote.event_date,
          event_time: '12:00:00', 
          guest_count: quote.guest_count,
          total_price: parseFloat(price),
          status: 'confirmed',
          deposit_paid: 0,
          notes: notes
        });

      if (eventError) throw eventError;

      // 3. Actualizar la Cotización
      const { data: updatedQuote, error: quoteError } = await supabase
        .from('quotes')
        .update({ 
          status: 'converted',
          estimated_price: parseFloat(price),
          admin_notes: notes + '\n[Sistema]: Convertido a evento exitosamente.'
        })
        .eq('id', quote.id)
        .select()
        .single();

      if (quoteError) throw quoteError;

      if (updatedQuote) onUpdate(updatedQuote as Quote);
      setShowConfirm(false);
      onClose();

    } catch (error: any) {
      console.error('Error converting quote:', error);
      alert(`Error al convertir: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- LÓGICA DE ELIMINACIÓN (ROLLBACK) ---
  const handleDeleteEvent = async () => {
    if (!confirm("¿Estás seguro? Esto eliminará el evento del calendario y regresará la cotización a estado 'Cotizada'.")) {
      return;
    }

    try {
      setIsProcessing(true);

      // 1. Eliminar evento asociado a esta cotización
      const { error: deleteError } = await supabase
        .from('events')
        .delete()
        .eq('quote_id', quote.id);

      if (deleteError) throw deleteError;

      // 2. Regresar estado de cotización a 'quoted'
      const { data: updatedQuote, error: updateError } = await supabase
        .from('quotes')
        .update({ 
          status: 'quoted',
          admin_notes: notes + '\n[Sistema]: Evento eliminado/cancelado manualmente.'
        })
        .eq('id', quote.id)
        .select()
        .single();

      if (updateError) throw updateError;

      alert("Evento eliminado correctamente.");
      if (updatedQuote) onUpdate(updatedQuote as Quote);
      onClose();

    } catch (error: any) {
      console.error('Error deleting event:', error);
      alert(`Error al eliminar evento: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const updates = {
        admin_notes: notes,
        estimated_price: price ? parseFloat(price) : null,
      };

      const { data, error } = await supabase
        .from('quotes')
        .update(updates)
        .eq('id', quote.id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
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
  const isConverted = quote.status === 'converted';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-secondary-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* --- MODAL DE CONFIRMACIÓN INTERNO --- */}
        {showConfirm && (
          <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur flex flex-col items-center justify-center text-center p-8 animate-in fade-in">
            <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mb-4">
              <CalendarCheck className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-secondary-900 mb-2">¿Confirmar Evento?</h3>
            <p className="text-secondary-500 max-w-md mb-8">
              Esta acción creará automáticamente un nuevo cliente y agregará el evento al calendario oficial para el día <strong>{new Date(quote.event_date).toLocaleDateString()}</strong>.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowConfirm(false)}
                className="px-6 py-3 rounded-xl font-medium text-secondary-600 hover:bg-secondary-100 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={executeConversion}
                disabled={isProcessing}
                className="px-8 py-3 rounded-xl font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Procesando...
                  </>
                ) : (
                  "Sí, Crear Evento"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-100 bg-secondary-50/50">
          <div>
            <h2 className="text-xl font-display font-bold text-secondary-900">
              Detalles de Cotización
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-secondary-500 font-mono bg-secondary-200 px-1.5 py-0.5 rounded">
                {quote.id.slice(0, 8)}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                isConverted ? 'bg-green-100 text-green-700 border-green-200' :
                isDeclined ? 'bg-red-100 text-red-700 border-red-200' :
                'bg-white text-secondary-600 border-secondary-200'
              }`}>
                {quote.status.toUpperCase()}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Izquierda: Info */}
            <div className="lg:col-span-2 space-y-8">
              <section>
                <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-primary-500" /> Información del Cliente
                </h3>
                <div className="bg-secondary-50 p-4 rounded-xl space-y-4 border border-secondary-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-secondary-400 block mb-1 font-medium">Nombre</label>
                      <p className="font-bold text-secondary-900 text-lg">{quote.client_name}</p>
                    </div>
                    <div>
                      <label className="text-xs text-secondary-400 block mb-1 font-medium">Teléfono</label>
                      <p className="font-medium text-secondary-900 font-mono">{quote.client_phone}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs text-secondary-400 block mb-1 font-medium">Email</label>
                      <p className="font-medium text-secondary-900">{quote.client_email}</p>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary-500" /> Detalles del Evento
                </h3>
                <div className="bg-secondary-50 p-4 rounded-xl border border-secondary-100 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded-lg border border-secondary-100 shadow-sm">
                      <label className="text-xs text-secondary-400 block mb-1 font-medium">Fecha</label>
                      <p className="font-bold text-secondary-900">
                        {new Date(quote.event_date + 'T00:00:00').toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-secondary-100 shadow-sm">
                      <label className="text-xs text-secondary-400 block mb-1 font-medium">Invitados</label>
                      <p className="font-bold text-secondary-900">{quote.guest_count} personas</p>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-secondary-100 shadow-sm flex items-start gap-3">
                    <div className="p-2 bg-primary-50 rounded-lg text-primary-600">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <label className="text-xs text-secondary-400 block mb-0.5 font-medium">Paquete de Interés</label>
                      <p className="font-bold text-secondary-900 capitalize text-lg">
                        {quote.interested_package ? quote.interested_package.replace(/-/g, ' ') : <span className="text-secondary-400 font-normal italic">No especificado</span>}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs text-secondary-400 block mb-1 font-medium">Mensaje del Cliente</label>
                    <div className="bg-white p-4 rounded-lg border border-secondary-100 text-secondary-700 text-sm leading-relaxed italic relative">
                      <span className="absolute top-2 left-2 text-secondary-200 text-4xl leading-none">"</span>
                      <p className="relative z-10 px-2">{quote.message || 'Sin mensaje adicional.'}</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Derecha: Gestión */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl border-2 border-secondary-100 p-5 space-y-6 shadow-sm">
                <div>
                  <label className="text-sm font-bold text-secondary-900 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary-500" /> Notas Administrativas
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={isConverted} // Se pueden bloquear notas si ya es evento, o dejarlas abiertas
                    className="w-full min-h-[120px] p-3 text-sm bg-secondary-50 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all resize-none placeholder:text-secondary-400 disabled:opacity-70"
                    placeholder="Escribe notas internas aquí..."
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-secondary-900 mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary-500" /> Presupuesto Estimado
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 font-semibold">S/</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={price}
                      onChange={handlePriceChange}
                      disabled={isConverted} // Bloquear precio si ya es evento
                      className="w-full pl-8 pr-4 py-2.5 bg-secondary-50 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500 font-mono font-medium text-lg disabled:opacity-70"
                      placeholder="0.00"
                    />
                  </div>
                  {price && parseFloat(price) > 0 && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-100">
                      <div className="flex justify-between text-xs text-green-700 mb-1">
                        <span>Adelanto (50%):</span>
                        <span className="font-bold">{formatCurrency(parseFloat(price) / 2)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-green-700">
                        <span>Saldo:</span>
                        <span className="font-bold">{formatCurrency(parseFloat(price) / 2)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ✅ BOTÓN DINÁMICO: CONVERTIR O ELIMINAR */}
                <div className="pt-4 border-t border-secondary-100">
                  {isDeclined ? (
                    // 🔴 ESTADO 1: DECLINADA (Bloqueado)
                    <div className="w-full py-3 px-4 bg-gray-100 text-gray-400 rounded-lg font-bold flex items-center justify-center gap-2 cursor-not-allowed border border-gray-200">
                      <Ban className="w-5 h-5" />
                      Cotización Declinada
                    </div>
                  ) : isConverted ? (
                    // 🔴 ESTADO 2: YA CONVERTIDA -> MOSTRAR BOTÓN ELIMINAR
                    <button
                      onClick={handleDeleteEvent}
                      disabled={isProcessing}
                      className="w-full py-3 px-4 bg-white border-2 border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200 rounded-lg font-bold transition-all flex items-center justify-center gap-2"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Procesando...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-5 h-5" />
                          Eliminar Evento
                        </>
                      )}
                    </button>
                  ) : (
                    // 🟢 ESTADO 3: NUEVA/COTIZADA -> MOSTRAR BOTÓN CREAR
                    <>
                      <button
                        onClick={initiateConversion}
                        disabled={!price || parseFloat(price) <= 0}
                        className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CalendarCheck className="w-5 h-5" />
                        Confirmar como Evento
                      </button>
                      {(!price || parseFloat(price) <= 0) && (
                        <p className="text-xs text-center text-red-500 mt-2 flex items-center justify-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Ingresa un presupuesto para confirmar
                        </p>
                      )}
                    </>
                  )}
                </div>

              </div>

              {/* Meta Info */}
              <div className="bg-secondary-50 rounded-lg p-4 text-xs text-secondary-400 space-y-2 border border-secondary-100">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  <span>Creado: {new Date(quote.created_at).toLocaleString()}</span>
                </div>
                {quote.updated_at && (
                  <div className="flex items-center gap-2">
                    <Save className="w-3 h-3" />
                    <span>Actualizado: {new Date(quote.updated_at).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-secondary-50 border-t border-secondary-100 flex justify-between items-center gap-3">
          
          {/* ✅ MANTENEMOS EL MENSAJE INFORMATIVO A LA IZQUIERDA */}
          {isConverted ? (
            <div className="flex items-center gap-2 text-green-700 text-sm font-medium bg-green-100 px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
              <span>Evento creado en calendario</span>
            </div>
          ) : (
            <div></div> // Espaciador
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-secondary-600 hover:text-secondary-900 hover:bg-white rounded-lg transition-colors"
            >
              Cerrar
            </button>
            {/* Solo permitimos guardar notas si no está declinada/convertida, o si lo permites siempre, quita la condición */}
            {!isConverted && !isDeclined && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 text-sm font-bold text-white bg-secondary-900 hover:bg-secondary-800 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Guardar Cambios
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// Iconos auxiliares
function CheckCircle2({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>;
}