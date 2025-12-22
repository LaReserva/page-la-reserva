import { useState, useEffect } from 'react';
import { 
  X, Save, Calendar, MapPin, FileText, 
  Upload, Download, Trash2, Ban, CheckCircle2, 
  Clock, Wine, Loader2, AlertCircle, 
  UserCog, DollarSign, CreditCard, Plus, Check
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Event, EventStatus } from '@/types';
import { useUserRole } from '@/hooks/useUserRole'; 
import { cn } from '@/utils/utils';

// Helper para formato de moneda
const formatCurrency = (amount: number) => 
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);

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

  // --- ESTADOS GENERALES ---
  const [formData, setFormData] = useState<Partial<Event>>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(''); 
  const [dateError, setDateError] = useState(false);
  const [creatorName, setCreatorName] = useState<string>('');

  // --- ESTADOS FINANCIEROS (NUEVO) ---
  const [totalPaid, setTotalPaid] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [newPayment, setNewPayment] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    method: 'transferencia'
  });

  // --- ESTADOS MODALES INTERNOS ---
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // --- LÓGICA DE FECHA ROBUSTA (MANTENIDA) ---
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const eventDateObj = event ? new Date(`${event.event_date}T00:00:00`) : new Date();
  const isPastEvent = eventDateObj < today;

  const displayStatus = !event 
    ? 'pending' 
    : event.status === 'cancelled' 
      ? 'cancelled' 
      : (event.status === 'confirmed' && isPastEvent) 
        ? 'completed' 
        : event.status;

  const isCancelled = displayStatus === 'cancelled';

  // --- EFECTO DE CARGA ---
  useEffect(() => {
    if (event && isOpen) {
      setFormData({
        ...event,
        venue: event.venue || '',
        event_time: event.event_time || '', 
        total_price: event.total_price || 0,
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
      setShowPaymentModal(false);
      setSuccessMessage(null);
      
      fetchCreatorName(event.closed_by);
      
      // Cargar pagos si no es bartender
      if (!isBartender) {
        fetchPaymentTotals(event.id);
      }
    }
  }, [event, isOpen, isBartender]);

  // Validación de fecha al editar
  useEffect(() => {
    if (formData.event_date) {
      const selected = new Date(`${formData.event_date}T00:00:00`);
      if (selected < today && (!event || event.event_date !== formData.event_date)) {
        setDateError(true);
      } else {
        setDateError(false);
      }
    }
  }, [formData.event_date, event]);

  if (!isOpen || !event) return null;

  // --- FUNCIONES AUXILIARES ---

  async function fetchCreatorName(userId?: string) {
    if (!userId) {
      setCreatorName('Sistema / Desconocido');
      return;
    }
    const { data } = await supabase.from('admin_users').select('full_name').eq('id', userId).single();
    if (data) setCreatorName(data.full_name);
    else setCreatorName('Usuario no encontrado');
  }

  async function fetchPaymentTotals(eventId: string) {
    const { data, error } = await supabase
      .from('event_payments' as any)
      .select('amount')
      .eq('event_id', eventId);
    
    if (!error && data) {
      const total = data.reduce((acc, curr: any) => acc + Number(curr.amount), 0);
      setTotalPaid(total);
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('es-PE', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  const handleInputChange = (field: keyof Event, value: any) => {
    if ((field === 'bartender_count' || field === 'guest_count') && typeof value === 'number') {
      if (value < 0) return;
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // --- HANDLERS: ARCHIVOS ---
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

  // --- HANDLERS: FINANZAS ---
  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountToPay = parseFloat(newPayment.amount);
    
    if (!newPayment.amount || amountToPay <= 0) return;
    if (!event) return;

    // Validación: El monto no puede superar la deuda
    const currentPrice = Number(formData.total_price) || 0;
    const currentPending = currentPrice - totalPaid;

    if (amountToPay > currentPending) {
        alert(`Error: El monto (S/ ${amountToPay}) supera el saldo pendiente (S/ ${currentPending}).`);
        return;
    }

    try {
      setPaymentProcessing(true);

      const { error } = await supabase.from('event_payments' as any).insert({
        event_id: event.id,
        amount: amountToPay,
        payment_date: newPayment.date,
        payment_method: newPayment.method,
        notes: 'Registrado desde Panel de Evento',
        recorded_by: (await supabase.auth.getUser()).data.user?.id
      });

      if (error) throw error;

      await fetchPaymentTotals(event.id);
      setShowPaymentModal(false);
      setNewPayment({ amount: '', date: new Date().toISOString().split('T')[0], method: 'transferencia' });
      
      setSuccessMessage('Pago registrado correctamente');
      setTimeout(() => setSuccessMessage(null), 2500);

    } catch (error: any) {
      console.error(error);
      alert('Error al registrar pago');
    } finally {
      setPaymentProcessing(false);
    }
  };

  // --- HANDLERS: GUARDAR / CANCELAR ---
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
        total_price: Number(formData.total_price), // Actualizar precio si cambió
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

      // Actualizar cotización si cambia fecha o precio
      if (event.quote_id) {
        const quoteUpdates: any = {};
        if (formData.event_date && formData.event_date !== event.event_date) {
            quoteUpdates.event_date = formData.event_date;
        }
        if (formData.total_price && formData.total_price !== event.total_price) {
            quoteUpdates.estimated_price = formData.total_price;
        }
        if (Object.keys(quoteUpdates).length > 0) {
            await supabase.from('quotes').update(quoteUpdates).eq('id', event.quote_id);
        }
      }

      onUpdate(data as unknown as Event);
      setShowConfirmModal(false);
      
      setSuccessMessage('Evento guardado correctamente');
      setTimeout(() => {
         setSuccessMessage(null);
         onClose();
      }, 1500);

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

      // ✅ AUTOMATIZACIÓN FINANCIERA: Registrar devolución en gastos
      if (totalPaid > 0) {
        const { error: refundError } = await supabase.from('expenses' as any).insert({
            description: `Devolución - Cancelación Evento: ${(event as any).client?.name || 'Cliente'}`,
            amount: totalPaid,
            category: 'devolucion', 
            date: new Date().toISOString().split('T')[0],
            event_id: event.id
        });
        if (refundError) console.error("Error al registrar devolución automática", refundError);
      }

      onUpdate(data as Event);
      setShowCancelModal(false);
      
      setSuccessMessage('Evento cancelado y devolución registrada');
      setTimeout(() => {
         setSuccessMessage(null);
         onClose();
      }, 2000);

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
    // Usamos displayStatus para que se vea azul si ya pasó
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

  // Cálculos para la barra de progreso
  const currentTotalPrice = Number(formData.total_price) || 0;
  const pendingAmount = currentTotalPrice - totalPaid;
  const paymentPercentage = currentTotalPrice > 0 ? Math.round((totalPaid / currentTotalPrice) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-secondary-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* === MODALES INTERNOS === */}

        {/* Success Toast */}
        {successMessage && (
            <div className="absolute inset-0 z-[60] bg-white/90 backdrop-blur flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 shadow-lg animate-bounce">
                    <Check size={40} strokeWidth={4} />
                </div>
                <h3 className="text-2xl font-bold text-secondary-900">{successMessage}</h3>
            </div>
        )}

        {/* Modal Confirmar Operativo */}
        {showConfirmModal && (
          <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur flex flex-col items-center justify-center text-center p-8 animate-in fade-in">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4"><CheckCircle2 className="w-8 h-8" /></div>
            <h3 className="text-2xl font-bold text-secondary-900 mb-2">Datos Operativos Completos</h3>
            <p className="text-secondary-500 max-w-md mb-8">Has completado la información requerida. ¿Deseas marcar este evento como <strong>CONFIRMADO</strong>?</p>
            <div className="flex gap-4">
              <button onClick={() => executeSave('pending')} className="px-6 py-3 rounded-xl font-medium text-secondary-600 hover:bg-secondary-100">No, Pendiente</button>
              <button onClick={() => executeSave('confirmed')} disabled={loading} className="px-8 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 shadow-lg flex items-center gap-2">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sí, Confirmar"}</button>
            </div>
          </div>
        )}

        {/* Modal Cancelar */}
        {showCancelModal && (
          <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur flex flex-col items-center justify-center text-center p-8 animate-in fade-in">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4"><Ban className="w-8 h-8" /></div>
            <h3 className="text-2xl font-bold text-secondary-900 mb-2">¿Cancelar Evento?</h3>
            <p className="text-secondary-500 max-w-md mb-6">
                Estás a punto de cancelar el evento.
                {totalPaid > 0 && <span className="block mt-2 text-red-600 font-bold bg-red-50 p-2 rounded">⚠️ Se registrará una devolución automática de {formatCurrency(totalPaid)}.</span>}
            </p>
            <div className="flex gap-4">
              <button onClick={() => setShowCancelModal(false)} className="px-6 py-3 rounded-xl font-medium text-secondary-600 hover:bg-secondary-100">Volver</button>
              <button onClick={executeCancel} disabled={loading} className="px-8 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg flex items-center gap-2">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sí, Cancelar"}</button>
            </div>
          </div>
        )}

        {/* Modal Registrar Pago */}
        {showPaymentModal && (
           <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur flex flex-col items-center justify-center p-4 animate-in fade-in">
             <div className="bg-white p-6 rounded-2xl shadow-xl border border-secondary-200 w-full max-w-md">
               <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-secondary-900 flex items-center gap-2"><DollarSign className="w-6 h-6 text-green-600"/> Registrar Pago</h3>
                  <button onClick={() => setShowPaymentModal(false)}><X className="w-5 h-5 text-secondary-400 hover:text-secondary-600"/></button>
               </div>
               
               <div className="bg-secondary-50 p-4 rounded-xl mb-6">
                  <div className="flex justify-between text-sm mb-1">
                     <span className="text-secondary-500">Monto Pendiente:</span>
                     <span className="font-bold text-secondary-900">{formatCurrency(pendingAmount)}</span>
                  </div>
                  <div className="w-full bg-secondary-200 h-2 rounded-full overflow-hidden">
                     <div className="bg-green-500 h-full" style={{ width: `${paymentPercentage}%` }}></div>
                  </div>
               </div>

               <form onSubmit={handleRegisterPayment} className="space-y-4">
                 <div>
                   <label className="block text-xs font-bold text-secondary-500 uppercase mb-1">Monto a Ingresar (S/)</label>
                   <input 
                     type="number" step="0.01" min="0" required 
                     value={newPayment.amount} 
                     onChange={e => setNewPayment({...newPayment, amount: e.target.value})}
                     className="w-full p-3 border rounded-lg text-lg font-bold font-mono focus:ring-2 focus:ring-green-500 outline-none" 
                     placeholder="0.00"
                   />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-xs font-bold text-secondary-500 uppercase mb-1">Fecha</label>
                     <input 
                       type="date" required 
                       max={new Date().toISOString().split('T')[0]}
                       value={newPayment.date}
                       onChange={e => setNewPayment({...newPayment, date: e.target.value})}
                       className="w-full p-2 border rounded-lg" 
                     />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-secondary-500 uppercase mb-1">Método</label>
                     <select 
                       className="w-full p-2 border rounded-lg bg-white"
                       value={newPayment.method}
                       onChange={e => setNewPayment({...newPayment, method: e.target.value})}
                     >
                       <option value="transferencia">Transferencia</option>
                       <option value="efectivo">Efectivo</option>
                       <option value="yape">Yape / Plin</option>
                       <option value="tarjeta">Tarjeta</option>
                     </select>
                   </div>
                 </div>
                 <button type="submit" disabled={paymentProcessing} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 mt-4">
                   {paymentProcessing ? <Loader2 className="w-5 h-5 animate-spin"/> : "Confirmar Ingreso"}
                 </button>
               </form>
             </div>
           </div>
        )}

        {/* Header Principal */}
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

        {/* Contenido Principal */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Columna Izquierda: Datos principales y Metadatos */}
            <div className="space-y-6">
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

              <div className="bg-secondary-100/50 p-4 rounded-xl border border-secondary-200/60 space-y-3">
                <div className="flex items-center gap-2 text-xs text-secondary-500">
                  <Clock className="w-3.5 h-3.5 text-secondary-400" />
                  <span>Creado: <span className="font-semibold text-secondary-700">{formatDate(event.created_at)}</span></span>
                </div>
                {event.updated_at && (
                  <div className="flex items-center gap-2 text-xs text-secondary-500">
                    <Save className="w-3.5 h-3.5 text-secondary-400" />
                    <span>Actualizado: <span className="font-semibold text-secondary-700">{formatDate(event.updated_at)}</span></span>
                  </div>
                )}
                <div className="pt-2 mt-2 border-t border-secondary-200/60 flex items-center gap-2 text-xs text-secondary-500">
                  <UserCog className="w-3.5 h-3.5 text-secondary-400" />
                  <span>Por: <span className="font-bold text-secondary-800 uppercase">{creatorName || 'Cargando...'}</span></span>
                </div>
              </div>

              {canEdit && !isCancelled && displayStatus !== 'completed' && (
                <button onClick={initiateCancel} className="w-full py-3 border-2 border-red-100 text-red-600 rounded-xl font-bold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /> Cancelar Evento</button>
              )}
            </div>

            {/* Columna Derecha: Finanzas, Logística, Docs */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* === NUEVA SECCIÓN FINANCIERA === */}
              {!isBartender && (
                <div className="bg-white p-5 rounded-xl border border-secondary-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-wider flex items-center gap-2"><CreditCard className="w-4 h-4" /> Estado Financiero</h3>
                      <div className={`px-2 py-1 rounded text-xs font-mono font-medium ${isCancelled ? 'bg-red-100 text-red-600' : 'bg-secondary-100 text-secondary-600'}`}>
                          {isCancelled ? 'CANCELADO' : `${paymentPercentage}% Pagado`}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="p-3 bg-secondary-50 rounded-lg border border-secondary-100 relative group">
                          <p className="text-xs text-secondary-500 mb-1">Costo Total</p>
                          
                          {isSuperAdmin && !isCancelled ? (
                            <div className="flex items-center">
                              <span className="text-gray-500 font-bold mr-1">S/</span>
                              <input 
                                type="number" 
                                value={formData.total_price} 
                                onChange={(e) => setFormData(prev => ({ ...prev, total_price: parseFloat(e.target.value) }))}
                                className="w-full bg-transparent font-bold text-xl text-secondary-900 focus:outline-none focus:ring-2 focus:ring-primary-200 rounded px-1"
                              />
                            </div>
                          ) : (
                            <p className="text-xl font-bold text-secondary-900">{formatCurrency(currentTotalPrice)}</p>
                          )}
                          {isSuperAdmin && !isCancelled && <p className="text-[9px] text-gray-400 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Editar</p>}
                      </div>

                      <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                          <p className="text-xs text-green-700 mb-1">A cuenta (Pagado)</p>
                          <p className="text-xl font-bold text-green-700">{formatCurrency(totalPaid)}</p>
                      </div>
                      <div className={`p-3 rounded-lg border ${pendingAmount > 0 ? 'bg-orange-50 border-orange-100' : 'bg-gray-50 border-gray-100'}`}>
                          <p className={`text-xs mb-1 ${pendingAmount > 0 ? 'text-orange-700' : 'text-gray-500'}`}>{pendingAmount > 0 ? 'Saldo Pendiente' : 'Saldo'}</p>
                          <p className={`text-xl font-bold ${pendingAmount > 0 ? 'text-orange-700' : 'text-gray-400'}`}>{formatCurrency(pendingAmount)}</p>
                      </div>
                    </div>
                    
                    {canEdit && pendingAmount > 0 && !isCancelled && (
                      <button 
                        onClick={() => setShowPaymentModal(true)} 
                        className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-sm flex items-center justify-center gap-2 transition-colors"
                      >
                         <Plus className="w-4 h-4" /> Registrar Nuevo Pago
                      </button>
                    )}
                </div>
              )}

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

        {canEdit && !isCancelled && (
          <div className="px-6 py-4 bg-white border-t border-secondary-100 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-secondary-600 hover:bg-secondary-50 rounded-lg">Cancelar</button>
            <button onClick={initiateSave} disabled={loading} className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-lg shadow-md flex items-center gap-2">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar Cambios</button>
          </div>
        )}
      </div>
    </div>
  );
}