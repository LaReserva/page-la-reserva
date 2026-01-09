import { useState, useEffect, Fragment } from 'react';
import { createPortal } from 'react-dom'; // ✅ Importamos Portal para sacar el Toast del flujo normal
import { Dialog, Transition, Listbox } from '@headlessui/react';
import { 
  X, Save, Calendar, MapPin, FileText, 
  Upload, Download, Trash2, Ban, CheckCircle2, 
  Clock, Wine, Loader2, AlertCircle, 
  UserCog, DollarSign, CreditCard, Plus, 
  Check as CheckIcon, ChevronDown 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Event, EventStatus } from '@/types';
import { useUserRole } from '@/hooks/useUserRole'; 
import { cn } from '@/utils/utils';

// --- HELPERS ---
const formatCurrency = (amount: number) => 
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);

const PAYMENT_METHODS = [
  { id: 'transferencia', name: 'Transferencia Bancaria' },
  { id: 'efectivo', name: 'Efectivo' },
  { id: 'yape', name: 'Yape / Plin' },
  { id: 'tarjeta', name: 'Tarjeta de Crédito/Débito' },
];

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

  // --- ESTADOS ---
  const [formData, setFormData] = useState<Partial<Event>>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(''); 
  const [dateError, setDateError] = useState(false);
  const [creatorName, setCreatorName] = useState<string>('');

  // Estados Financieros
  const [totalPaid, setTotalPaid] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [newPayment, setNewPayment] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    method: 'transferencia'
  });

  // Estados Modales Internos
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Estado para el montaje del portal (evita errores de SSR en Next.js/Astro)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Lógica de Fecha y Estado
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

  // --- EFECTOS ---
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
      
      if (!isBartender) {
        fetchPaymentTotals(event.id);
      }
    }
  }, [event, isOpen, isBartender]);

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

  if (!event) return null;

  // --- LOGICA DE NEGOCIO ---
  async function fetchCreatorName(userId?: string) {
    if (!userId) { setCreatorName('Sistema / Desconocido'); return; }
    const { data } = await supabase.from('admin_users').select('full_name').eq('id', userId).single();
    if (data) setCreatorName(data.full_name);
    else setCreatorName('Usuario no encontrado');
  }

  async function fetchPaymentTotals(eventId: string) {
    const { data, error } = await supabase.from('event_payments' as any).select('amount').eq('event_id', eventId);
    if (!error && data) {
      const total = data.reduce((acc, curr: any) => acc + Number(curr.amount), 0);
      setTotalPaid(total);
    }
  }

  const handleInputChange = (field: keyof Event, value: any) => {
    if ((field === 'bartender_count' || field === 'guest_count') && typeof value === 'number') {
      if (value < 0) return;
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // --- HELPER PARA FECHAS ---
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('es-PE', {
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true
    });
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

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountToPay = parseFloat(newPayment.amount);
    if (!newPayment.amount || amountToPay <= 0) return;
    
    const currentPrice = Number(formData.total_price) || 0;
    const currentPending = currentPrice - totalPaid;
    
    if (amountToPay > currentPending) {
        alert(`Error: El monto supera el saldo pendiente.`);
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
      alert('Error al registrar pago');
    } finally {
      setPaymentProcessing(false);
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
        total_price: Number(formData.total_price),
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

      if (event.quote_id) {
        const quoteUpdates: any = {};
        if (formData.event_date && formData.event_date !== event.event_date) quoteUpdates.event_date = formData.event_date;
        if (formData.total_price && formData.total_price !== event.total_price) quoteUpdates.estimated_price = formData.total_price;
        if (Object.keys(quoteUpdates).length > 0) await supabase.from('quotes').update(quoteUpdates).eq('id', event.quote_id);
      }

      onUpdate(data as unknown as Event);
      setShowConfirmModal(false);
      setSuccessMessage('Evento guardado correctamente');
      setTimeout(() => { setSuccessMessage(null); onClose(); }, 1500);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const executeCancel = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('events').update({ status: 'cancelled' }).eq('id', event.id).select().single();
      if (error) throw error;

      if (totalPaid > 0) {
        await supabase.from('expenses' as any).insert({
            description: `Devolución - Cancelación Evento: ${(event as any).client?.name || 'Cliente'}`,
            amount: totalPaid,
            category: 'devolucion', 
            date: new Date().toISOString().split('T')[0],
            event_id: event.id
        });
      }
      onUpdate(data as Event);
      setShowCancelModal(false);
      setSuccessMessage('Evento cancelado y devolución registrada');
      setTimeout(() => { setSuccessMessage(null); onClose(); }, 2000);
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
    const current = config[displayStatus as EventStatus] || config.pending;
    const Icon = current.icon;
    return (
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${current.color} ring-1 ring-black/5`}>
        <Icon className="w-3 h-3" />
        <span className="uppercase tracking-wide">{current.label}</span>
      </div>
    );
  };

  const currentTotalPrice = Number(formData.total_price) || 0;
  const pendingAmount = currentTotalPrice - totalPaid;
  const paymentPercentage = currentTotalPrice > 0 ? Math.round((totalPaid / currentTotalPrice) * 100) : 0;

  return (
    <>
      {/* === MODAL PRINCIPAL === */}
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-40" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-secondary-900/40 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-0 sm:p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95 translate-y-4"
                enterTo="opacity-100 scale-100 translate-y-0"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100 translate-y-0"
                leaveTo="opacity-0 scale-95 translate-y-4"
              >
                <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden bg-white text-left align-middle shadow-2xl transition-all sm:rounded-3xl flex flex-col max-h-[100dvh] sm:max-h-[90vh]">
                  
                  {/* Header */}
                  <div className="px-8 py-5 border-b border-secondary-100 bg-secondary-50 flex justify-between items-center shrink-0">
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-1">
                        <Dialog.Title as="h2" className="text-2xl font-display font-bold text-secondary-900">
                          {formData.event_type || 'Detalle del Evento'}
                        </Dialog.Title>
                        <StatusBadge />
                      </div>
                      <p className="text-sm text-secondary-500 font-mono flex items-center gap-2">
                         <span className="bg-secondary-200 text-secondary-600 px-1.5 py-0.5 rounded text-xs font-bold">ID</span> 
                         {event.id.slice(0,8)}
                      </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-secondary-200 rounded-full transition-colors text-secondary-400 hover:text-secondary-600 focus:outline-none focus:ring-2 focus:ring-secondary-400">
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Body Scrollable */}
                  <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-50">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      
                      {/* COLUMNA IZQUIERDA: DATOS PRINCIPALES */}
                      <div className="space-y-6">
                        <div className="bg-white p-6 rounded-3xl border border-secondary-200 shadow-sm">
                          <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-wider mb-5 flex items-center gap-2">
                            <Calendar className="w-4 h-4" /> Datos Generales
                          </h3>
                          <div className="space-y-5">
                            <div>
                              <label className="text-xs text-secondary-500 block mb-1.5 font-bold uppercase">Cliente</label>
                              <p className="font-display font-bold text-secondary-900 text-xl tracking-tight">{(event as any).client?.name || 'Cliente'}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-xs text-secondary-500 block mb-1.5 font-bold uppercase">Fecha</label>
                                <input 
                                  type="date" 
                                  value={formData.event_date || ''} 
                                  min={new Date().toISOString().split('T')[0]} 
                                  onChange={(e) => handleInputChange('event_date', e.target.value)} 
                                  disabled={!canEdit} 
                                  className={cn(
                                    "w-full text-sm font-medium border rounded-xl py-2.5 px-3 resize-none focus:ring-primary-500 focus:border-primary-500 transition-all",
                                    dateError ? "border-red-300 bg-red-50 text-red-900" : "border-secondary-200"
                                  )} 
                                />
                                {dateError && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Inválida</p>}
                              </div>
                              <div>
                                <label className="text-xs text-secondary-500 block mb-1.5 font-bold uppercase">Hora</label>
                                <input type="time" value={formData.event_time || ''} onChange={(e) => handleInputChange('event_time', e.target.value)} disabled={!canEdit} className="w-full text-sm font-medium border-secondary-200 rounded-xl py-2.5 px-3 resize-none focus:ring-primary-500 focus:border-primary-500" />
                              </div>
                            </div>

                            <div>
                              <label className="text-xs text-secondary-500 block mb-1.5 font-bold uppercase">Ubicación</label>
                              <div className="relative group">
                                <MapPin className="absolute top-3 left-3 w-4 h-4 text-secondary-400 group-hover:text-primary-500 transition-colors" />
                                <textarea value={formData.venue || ''} onChange={(e) => handleInputChange('venue', e.target.value)} disabled={!canEdit} rows={2} className="w-full text-sm border-secondary-200 rounded-xl pl-10 py-2.5 resize-none focus:ring-primary-500 focus:border-primary-500" placeholder="Dirección del evento..." />
                              </div>
                            </div>
                            
                            <div className="pt-4 border-t border-secondary-100 flex justify-between items-center">
                              <span className="text-sm text-secondary-600 font-medium">Invitados</span>
                              <div className="flex items-center gap-2 bg-secondary-50 px-3 py-1 rounded-lg border border-secondary-100">
                                <UserCog className="w-4 h-4 text-secondary-400" />
                                <input 
                                  type="number" 
                                  value={formData.guest_count} 
                                  onChange={(e) => handleInputChange('guest_count', parseInt(e.target.value))}
                                  disabled={!canEdit}
                                  className="w-16 text-right font-bold text-lg border-none bg-transparent focus:ring-0 p-0 text-secondary-900"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Metadatos */}
                        <div className="bg-white/50 p-5 rounded-3xl border border-secondary-200/60 space-y-3 text-xs text-secondary-500">
                          <div className="flex justify-between">
                            <span>Creado: {formatDate(event.created_at)}</span>
                          </div>
                          {event.updated_at && <div>Editado: {formatDate(event.updated_at)}</div>}
                          <div className="pt-3 border-t border-secondary-200/50 flex items-center gap-2">
                             <div className="w-6 h-6 rounded-full bg-secondary-200 flex items-center justify-center text-[10px] font-bold text-secondary-600">
                               {creatorName.charAt(0)}
                             </div>
                             <span className="font-bold text-secondary-700 uppercase">{creatorName}</span>
                          </div>
                        </div>

                        {canEdit && !isCancelled && displayStatus !== 'completed' && (
                          <button onClick={() => setShowCancelModal(true)} className="w-full py-3.5 border border-red-200 text-red-600 rounded-2xl font-bold hover:bg-red-50 hover:border-red-300 transition-colors flex items-center justify-center gap-2 text-sm">
                            <Trash2 className="w-4 h-4" /> Cancelar Evento
                          </button>
                        )}
                      </div>

                      {/* COLUMNA DERECHA (2 cols): FINANZAS, LOGÍSTICA, DOCS */}
                      <div className="lg:col-span-2 space-y-8">
                        
                        {/* 1. FINANZAS */}
                        {!isBartender && (
                          <div className="bg-white p-6 rounded-3xl border border-secondary-200 shadow-sm relative overflow-hidden">
                             {/* Progress Bar Background */}
                             <div className="absolute top-0 left-0 h-1.5 bg-secondary-100 w-full">
                                <div className="h-full bg-green-500 transition-all duration-700 ease-out" style={{ width: `${paymentPercentage}%` }} />
                             </div>

                             <div className="flex justify-between items-start mb-6 mt-2">
                                <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-wider flex items-center gap-2">
                                  <CreditCard className="w-4 h-4" /> Estado Financiero
                                </h3>
                                <span className={cn(
                                  "px-3 py-1 rounded-full text-xs font-mono font-bold border",
                                  isCancelled ? "bg-red-50 text-red-600 border-red-100" : "bg-green-50 text-green-700 border-green-100"
                                )}>
                                  {isCancelled ? 'DEVOLUCIÓN PENDIENTE' : `${paymentPercentage}% PAGADO`}
                                </span>
                             </div>

                             <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
                                <div className="p-5 bg-secondary-50 rounded-2xl border border-secondary-100 group hover:border-secondary-300 transition-colors">
                                  <p className="text-xs text-secondary-500 mb-1 font-bold uppercase">Total Evento</p>
                                  {isSuperAdmin && !isCancelled ? (
                                    <div className="flex items-center">
                                      <span className="text-secondary-400 font-bold mr-1 text-sm">S/</span>
                                      <input 
                                        type="number" 
                                        value={formData.total_price} 
                                        onChange={(e) => setFormData(prev => ({ ...prev, total_price: parseFloat(e.target.value) }))}
                                        className="w-full border-none bg-transparent font-bold text-2xl text-secondary-900 focus:outline-none focus:ring-0 p-0"
                                      />
                                    </div>
                                  ) : (
                                    <p className="text-2xl font-bold text-secondary-900">{formatCurrency(currentTotalPrice)}</p>
                                  )}
                                </div>

                                <div className="p-5 bg-green-50 rounded-2xl border border-green-100">
                                  <p className="text-xs text-green-700 mb-1 font-bold uppercase">Cobrado</p>
                                  <p className="text-2xl font-bold text-green-700">{formatCurrency(totalPaid)}</p>
                                </div>

                                <div className={cn("p-5 rounded-2xl border", pendingAmount > 0 ? "bg-orange-50 border-orange-100" : "bg-gray-50 border-gray-100")}>
                                  <p className={cn("text-xs mb-1 font-bold uppercase", pendingAmount > 0 ? "text-orange-700" : "text-gray-500")}>
                                    {pendingAmount > 0 ? 'Pendiente' : 'Saldo'}
                                  </p>
                                  <p className={cn("text-2xl font-bold", pendingAmount > 0 ? "text-orange-700" : "text-gray-400")}>
                                    {formatCurrency(pendingAmount)}
                                  </p>
                                </div>
                             </div>

                             {canEdit && pendingAmount > 0 && !isCancelled && (
                                <button 
                                  type="button" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowPaymentModal(true);
                                  }}
                                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] border-b-4 border-green-800 active:border-b-0 active:translate-y-1"
                                >
                                  <Plus className="w-5 h-5" /> Registrar Pago
                                </button>
                             )}
                          </div>
                        )}

                        {/* 2. LOGÍSTICA (Expanded) */}
                        <div className="bg-white p-6 rounded-3xl border border-secondary-200 shadow-sm">
                          <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-wider mb-5 flex items-center gap-2">
                            <Wine className="w-4 h-4" /> Logística de Barra
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Carta de Bar Grande */}
                            <div className="md:row-span-2">
                              <label className="text-xs text-secondary-500 block mb-2 font-bold uppercase">Carta de Bar</label>
                              <textarea 
                                value={formData.bar_menu || ''} 
                                onChange={(e) => handleInputChange('bar_menu', e.target.value)} 
                                disabled={!canEdit} 
                                rows={8} 
                                className="w-full text-sm border-secondary-200 rounded-2xl resize-none focus:ring-primary-500 focus:border-primary-500 bg-secondary-50/50 min-h-[220px]" 
                                placeholder="Escribe aquí la lista de cócteles y bebidas..." 
                              />
                            </div>
                            
                            <div className="space-y-6">
                              <div>
                                <label className="text-xs text-secondary-500 block mb-2 font-bold uppercase">Bartenders Requeridos</label>
                                <div className="relative">
                                   <input type="number" min="0" value={formData.bartender_count || 0} onChange={(e) => handleInputChange('bartender_count', parseInt(e.target.value))} disabled={!canEdit} className="w-full text-sm border-secondary-200 rounded-xl pl-10 py-2.5 font-bold resize-none focus:ring-primary-500 focus:border-primary-500" />
                                   <UserCog className="absolute top-2.5 left-3 w-4 h-4  text-secondary-400" />
                                </div>
                              </div>
                              <div>
                                <label className="text-xs text-secondary-500 block mb-2 font-bold uppercase">Staff Asignado</label>
                                <textarea value={formData.bartender_names || ''} onChange={(e) => handleInputChange('bartender_names', e.target.value)} disabled={!canEdit} rows={4} className="w-full text-sm border-secondary-200 rounded-2xl resize-none focus:ring-primary-500 focus:border-primary-500 bg-secondary-50/50" placeholder="Nombres del equipo..." />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 3. ARCHIVOS & NOTAS */}
                        <div className="bg-white p-6 rounded-3xl border border-secondary-200 shadow-sm">
                          <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-wider mb-5 flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Documentación
                          </h3>
                          <div className={`grid grid-cols-1 ${!isBartender ? 'sm:grid-cols-2' : ''} gap-5`}>
                            
                            {/* Requerimientos */}
                            <div className={cn(
                              "border-2 rounded-2xl p-5 flex flex-col items-center justify-center text-center transition-colors group relative overflow-hidden",
                              formData.requirements_url 
                                ? "border-grey-200 bg-grey-50/40" 
                                : "border-dashed border-secondary-200 bg-secondary-50/30 hover:bg-secondary-50"
                            )}>
                              <p className="font-bold text-sm text-secondary-700 mb-2 z-10">Requerimientos</p>
                              {formData.requirements_url ? (
                                <div className="flex items-center gap-2 w-full justify-center z-10">
                                  <a href={formData.requirements_url} target="_blank" rel="noopener" className="text-xs bg-yellow-100 text-yellow-600 border border-yellow-200 px-4 py-2 rounded-xl hover:bg-yellow-200 hover:border-yellow-300 flex items-center gap-2 shadow-sm transition-all font-bold">
                                    <Download className="w-4 h-4" /> Abrir PDF
                                  </a>
                                  {canEdit && (
                                    <button onClick={() => handleInputChange('requirements_url', null)} className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              ) : (
                                canEdit ? (
                                  <label className="cursor-pointer z-10">
                                    <input type="file" accept=".pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'requirements')} />
                                    <span className="text-xs bg-secondary-800 text-white px-5 py-2.5 rounded-xl hover:bg-secondary-700 flex items-center gap-2 shadow-md transition-all">
                                      {uploading === 'requirements' ? <Loader2 className="w-3 h-3 animate-spin"/> : <Upload className="w-3 h-3" />} 
                                      Subir PDF
                                    </span>
                                  </label>
                                ) : <span className="text-xs text-secondary-400 italic z-10">No disponible</span>
                              )}
                            </div>

                            {/* Cotización */}
                            {!isBartender && (
                              <div className={cn(
                                "border-2 rounded-2xl p-5 flex flex-col items-center justify-center text-center transition-colors relative overflow-hidden",
                                formData.quote_doc_url
                                  ? "border-grey-200 bg-grey-50/40" 
                                  : "border-dashed border-secondary-200 bg-secondary-50/30 hover:bg-secondary-50"
                              )}>
                                <p className="font-bold text-sm text-secondary-700 mb-2 z-10">Cotización</p>
                                {formData.quote_doc_url ? (
                                  <div className="flex gap-2 justify-center w-full z-10">
                                    <a href={formData.quote_doc_url} target="_blank" rel="noopener" className="text-xs bg-green-100 text-green-700 border border-green-200 px-4 py-2 rounded-xl hover:bg-green-200 hover:border-green-300 flex items-center gap-2 shadow-sm transition-all font-bold">
                                      <Download className="w-4 h-4" /> Abrir PDF
                                    </a>
                                  </div>
                                ) : (
                                  canEdit ? (
                                    <label className="cursor-pointer z-10">
                                      <input type="file" accept=".pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'quote')} />
                                      <span className="text-xs bg-white border border-secondary-300 text-secondary-700 px-5 py-2.5 rounded-xl hover:bg-secondary-50 flex items-center gap-2 transition-all shadow-sm">
                                        {uploading === 'quote' ? <Loader2 className="w-3 h-3 animate-spin"/> : <Upload className="w-3 h-3" />} 
                                        Subir PDF
                                      </span>
                                    </label>
                                  ) : <span className="text-xs text-secondary-400 italic z-10">No disponible</span>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <div className="mt-6">
                            <label className="text-xs text-secondary-500 block mb-2 font-bold uppercase">Acotaciones Extras</label>
                            <textarea value={formData.special_requests || ''} onChange={(e) => handleInputChange('special_requests', e.target.value)} disabled={!canEdit} rows={4} className="w-full text-sm border-secondary-200 rounded-2xl resize-none focus:ring-primary-500 focus:border-primary-500 bg-grey-50/50" placeholder="Detalles importantes..." />
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  {canEdit && !isCancelled && (
                    <div className="px-8 py-5 bg-white border-t border-secondary-100 flex justify-end gap-4 shrink-0 shadow-[0_-5px_20px_rgba(0,0,0,0.02)]">
                      <button onClick={onClose} className="px-6 py-2.5 text-sm font-medium text-secondary-600 hover:bg-secondary-50 rounded-xl transition-colors">
                        Cancelar
                      </button>
                      <button onClick={initiateSave} disabled={loading} className="px-8 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-600/20 flex items-center gap-2 transition-all active:scale-[0.98]">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
                        Guardar Cambios
                      </button>
                    </div>
                  )}

                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* === SUB-MODAL: PAGOS === */}
      <Transition appear show={showPaymentModal} as={Fragment}>
        <Dialog 
          as="div" 
          className="relative z-[100]" 
          onClose={() => setShowPaymentModal(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95 translate-y-4"
                enterTo="opacity-100 scale-100 translate-y-0"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100 translate-y-0"
                leaveTo="opacity-0 scale-95 translate-y-4"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-visible rounded-3xl bg-white p-8 text-left align-middle shadow-2xl transition-all border border-secondary-100 relative">
                  
                  <div className="flex justify-between items-center mb-8">
                    <Dialog.Title as="h3" className="text-xl font-display font-bold text-secondary-900 flex items-center gap-3">
                      <div className="p-2.5 bg-green-100 text-green-600 rounded-xl">
                        <DollarSign className="w-6 h-6"/>
                      </div>
                      Registrar Ingreso
                    </Dialog.Title>
                    <button onClick={() => setShowPaymentModal(false)} className="text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 p-1 rounded-full transition-colors">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  
                  <div className="bg-secondary-50 p-5 rounded-2xl mb-8 border border-secondary-100">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-secondary-500 font-medium uppercase tracking-wide text-xs">Por cobrar</span>
                        <span className="font-bold text-secondary-900 text-lg">{formatCurrency(pendingAmount)}</span>
                      </div>
                      <div className="w-full bg-secondary-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-green-500 h-full" style={{ width: `${paymentPercentage}%` }}></div>
                      </div>
                  </div>

                  <form onSubmit={handleRegisterPayment} className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-secondary-500 uppercase mb-2">Monto a Ingresar</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-400 font-bold text-lg">S/</span>
                        <input 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          required 
                          value={newPayment.amount} 
                          onChange={e => setNewPayment({...newPayment, amount: e.target.value})}
                          className="w-full pl-10 p-4 border border-secondary-300 rounded-2xl text-3xl font-bold font-mono text-secondary-900 focus:ring-4 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all" 
                          placeholder="0.00"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-secondary-500 uppercase mb-2">Fecha</label>
                        <input 
                          type="date" 
                          required 
                          max={new Date().toISOString().split('T')[0]}
                          value={newPayment.date} 
                          onChange={e => setNewPayment({...newPayment, date: e.target.value})}
                          className="w-full p-3 border border-secondary-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-secondary-500 uppercase mb-2">Método</label>
                        <Listbox value={newPayment.method} onChange={(val) => setNewPayment({...newPayment, method: val})}>
                            <div className="relative">
                              <Listbox.Button className="relative w-full cursor-pointer rounded-xl bg-white py-3 pl-3 pr-10 text-left border border-secondary-300 focus:outline-none focus:ring-2 focus:ring-green-500 sm:text-sm shadow-sm">
                                <span className="block truncate capitalize font-medium">{PAYMENT_METHODS.find(m => m.id === newPayment.method)?.name}</span>
                                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                  <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
                                </span>
                              </Listbox.Button>
                              <Transition
                                as={Fragment}
                                leave="transition ease-in duration-100"
                                leaveFrom="opacity-100"
                                leaveTo="opacity-0"
                              >
                                <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white py-1 text-base shadow-xl ring-1 ring-black/5 focus:outline-none sm:text-sm z-50 border border-secondary-100">
                                  {PAYMENT_METHODS.map((method) => (
                                    <Listbox.Option
                                      key={method.id}
                                      className={({ active }) =>
                                        `relative cursor-pointer select-none py-3 pl-10 pr-4 ${
                                          active ? 'bg-green-50 text-green-900' : 'text-secondary-900'
                                        }`
                                      }
                                      value={method.id}
                                    >
                                      {({ selected }) => (
                                        <>
                                          <span className={`block truncate ${selected ? 'font-bold' : 'font-medium'}`}>
                                            {method.name}
                                          </span>
                                          {selected ? (
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-green-600">
                                              <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                            </span>
                                          ) : null}
                                        </>
                                      )}
                                    </Listbox.Option>
                                  ))}
                                </Listbox.Options>
                              </Transition>
                            </div>
                        </Listbox>
                      </div>
                    </div>

                    <div className="pt-4">
                      <button 
                        type="submit" 
                        disabled={paymentProcessing} 
                        className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl shadow-xl shadow-green-600/30 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]"
                      >
                        {paymentProcessing ? <Loader2 className="w-6 h-6 animate-spin"/> : "Confirmar Ingreso"}
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* === SUB-MODAL: CONFIRMACIÓN === */}
      <Transition appear show={showConfirmModal} as={Fragment}>
        <Dialog as="div" className="relative z-[100]" onClose={() => setShowConfirmModal(false)}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-secondary-900/40 backdrop-blur-sm" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-3xl bg-white p-8 text-center align-middle shadow-2xl transition-all">
                  <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <Dialog.Title as="h3" className="text-2xl font-bold text-secondary-900 mb-2">
                    ¡Datos Completos!
                  </Dialog.Title>
                  <p className="text-secondary-500 mb-8 leading-relaxed">
                    Has completado la información requerida. ¿Deseas marcar este evento como <strong className="text-green-600">CONFIRMADO</strong> ahora?
                  </p>
                  <div className="flex gap-4 justify-center">
                    <button onClick={() => executeSave('pending')} className="px-6 py-3 rounded-xl font-bold text-secondary-600 hover:bg-secondary-50 transition-colors">
                      Solo Guardar
                    </button>
                    <button onClick={() => executeSave('confirmed')} disabled={loading} className="px-8 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20 flex items-center gap-2 transition-transform hover:scale-105">
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sí, Confirmar"}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* === SUB-MODAL: CANCELAR === */}
      <Transition appear show={showCancelModal} as={Fragment}>
        <Dialog as="div" className="relative z-[100]" onClose={() => setShowCancelModal(false)}>
           <div className="fixed inset-0 bg-secondary-900/40 backdrop-blur-sm" />
           <div className="fixed inset-0 overflow-y-auto">
             <div className="flex min-h-full items-center justify-center p-4 text-center">
               <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-3xl bg-white p-8 text-center shadow-2xl transition-all">
                 <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                   <Ban className="w-10 h-10" />
                 </div>
                 <h3 className="text-2xl font-bold text-secondary-900 mb-3">¿Cancelar Evento?</h3>
                 <p className="text-secondary-500 mb-6">
                   Esta acción es irreversible. El estado pasará a "Cancelado".
                   {totalPaid > 0 && <div className="mt-4 bg-red-50 text-red-700 p-4 rounded-xl text-sm font-bold border border-red-100 flex items-center gap-2 text-left">
                      <AlertCircle className="w-5 h-5 shrink-0"/> 
                      Se registrará una devolución automática de {formatCurrency(totalPaid)}.
                   </div>}
                 </p>
                 <div className="flex gap-4 justify-center">
                    <button onClick={() => setShowCancelModal(false)} className="px-6 py-3 rounded-xl font-bold text-secondary-600 hover:bg-secondary-50">Volver</button>
                    <button onClick={executeCancel} disabled={loading} className="px-8 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20 flex items-center gap-2 transition-transform hover:scale-105">
                       {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sí, Cancelar"}
                    </button>
                 </div>
               </Dialog.Panel>
             </div>
           </div>
        </Dialog>
      </Transition>

      {/* === SUCCESS TOAST (PORTAL) === */}
      {/* ✅ SE RENDERIZA EN EL BODY USANDO PORTAL PARA ESTAR ENCIMA DE TODO (MODALES/BLURS) */}
      {mounted && !!successMessage && createPortal(
        <Transition 
          show={!!successMessage} 
          as={Fragment} 
          enter="transform ease-out duration-300 transition" 
          enterFrom="translate-y-10 opacity-0 sm:translate-y-10 sm:translate-x-0" 
          enterTo="translate-y-0 opacity-100 sm:translate-x-0" 
          leave="transition ease-in duration-200" 
          leaveFrom="opacity-100 translate-y-0" 
          leaveTo="opacity-0 translate-y-10"
        >
           <div className="fixed bottom-6 right-6 z-[9999] pointer-events-none">
             <div className="bg-secondary-900 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-secondary-800 pointer-events-auto">
                <div className="p-2 bg-green-500 rounded-full shadow-lg shadow-green-500/40">
                  <CheckIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                   <span className="block font-bold text-lg tracking-tight">¡Éxito!</span>
                   <span className="block text-sm text-secondary-300">{successMessage}</span>
                </div>
             </div>
           </div>
        </Transition>,
        document.body
      )}
    </>
  );
}