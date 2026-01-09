import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition, Listbox } from '@headlessui/react';
import { 
  X, Save, User, Calendar, DollarSign, FileText, Clock, Package, 
  CalendarCheck, Loader2, AlertTriangle, Ban, Trash2, AlertCircle, 
  UserCog, Check, ChevronDown 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Quote } from '@/types';
import { formatCurrency } from '@/utils/formatters';
import { cn } from '@/utils/utils';
import { useUserRole } from '@/hooks/useUserRole'; 

// --- CONSTANTS ---
const AVAILABLE_PACKAGES = [
  { value: 'esencial', label: 'Esencial' },
  { value: 'premium', label: 'Premium' },
  { value: 'exclusive', label: 'Exclusive' },
  { value: 'corporativo-esencial', label: 'Corporativo Esencial' },
  { value: 'corporativo-premium', label: 'Corporativo Premium' },
  { value: 'barra-movil', label: 'Solo Barra Móvil' },
];

const INPUT_STYLES = "w-full p-2.5 border border-secondary-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-colors disabled:bg-secondary-50 disabled:text-secondary-400 disabled:cursor-not-allowed";
interface QuoteDetailModalProps {
  quote: Quote | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedQuote: Quote) => void;
}

export function QuoteDetailModal({ quote, isOpen, onClose, onUpdate }: QuoteDetailModalProps) {
  const { isSuperAdmin } = useUserRole();

  // --- STATES ---
  const [notes, setNotes] = useState('');
  const [price, setPrice] = useState<string>('');
  const [eventDate, setEventDate] = useState('');
  const [guestCount, setGuestCount] = useState<number | ''>('');
  const [selectedPackage, setSelectedPackage] = useState(AVAILABLE_PACKAGES[0]);

  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dateError, setDateError] = useState(false);
  
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [eventExists, setEventExists] = useState(false);
  const [checkingEvent, setCheckingEvent] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [updaterName, setUpdaterName] = useState<string>('');

  // --- EFFECTS ---
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
  }, []);

  useEffect(() => {
    if (quote && isOpen) {
      const cleanNotes = (quote.admin_notes || '').split('\n[Sistema]:')[0].trim();
      setNotes(cleanNotes);
      setPrice(quote.estimated_price?.toString() || '');
      setEventDate(quote.event_date);
      setGuestCount(quote.guest_count);
      
      const foundPackage = AVAILABLE_PACKAGES.find(p => p.value === quote.interested_package) || AVAILABLE_PACKAGES[0];
      setSelectedPackage(foundPackage);
      
      setShowConfirm(false);
      setShowDeleteConfirm(false);
      setDateError(false);
      
      checkEventExistence(quote.id);
      fetchUpdaterName(quote.updated_by);
    }
  }, [quote, isOpen]);

  useEffect(() => {
    if (eventDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(`${eventDate}T00:00:00`);
      setDateError(selected < today);
    }
  }, [eventDate]);

  // --- LOGIC ---
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  async function fetchUpdaterName(userId?: string) {
    if (!userId) { setUpdaterName(''); return; }
    const { data } = await supabase.from('admin_users').select('full_name').eq('id', userId).single();
    if (data) setUpdaterName(data.full_name);
  }

  async function checkEventExistence(quoteId: string) {
    setCheckingEvent(true);
    const { data } = await supabase.from('events').select('id').eq('quote_id', quoteId).maybeSingle();
    setEventExists(!!data);
    setCheckingEvent(false);
  }

  if (!isOpen || !quote) return null;

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

  const initiateConversion = () => {
    if (!price || parseFloat(price) <= 0) return alert("Ingresa un presupuesto estimado.");
    if (dateError) return alert("Corrige la fecha pasada.");
    if (!guestCount) return alert("Ingresa cantidad de invitados.");
    setShowConfirm(true);
  };

  const executeConversion = async () => {
    try {
      setIsProcessing(true);
      const totalPrice = parseFloat(price);
      const depositAmount = totalPrice / 2;
      
      let clientId = null;
      const { data: existingClient } = await supabase.from('clients').select('id').eq('email', quote.client_email).maybeSingle();

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
              total_spent: depositAmount 
          })
          .select().single();
        if (clientError) throw clientError;
        clientId = newClient.id;
      }

      const { data: eventData, error: eventError } = await supabase.from('events').insert({
        client_id: clientId,
        quote_id: quote.id,
        event_type: quote.event_type,
        event_date: eventDate,
        event_time: '12:00:00', 
        guest_count: Number(guestCount),
        total_price: totalPrice,
        status: 'pending',
        deposit_paid: depositAmount,
        notes: notes,
        closed_by: currentUserId
      }).select().single();

      if (eventError) throw eventError;
      if (!eventData) throw new Error("No se pudo obtener el ID del evento creado.");

      await supabase.from('event_payments' as any).insert({
        event_id: eventData.id,
        quote_id: quote.id,
        amount: depositAmount,
        payment_date: new Date().toISOString().split('T')[0],
        is_deposit: true,
        payment_method: 'transferencia_inicial',
        recorded_by: currentUserId
      });

      const originalNotes = quote.admin_notes || '';
      const notesToSave = originalNotes.includes(notes) && notes !== '' ? originalNotes : notes;

      const { data: updatedQuote, error: quoteError } = await supabase
        .from('quotes')
        .update({ 
          status: 'converted',
          estimated_price: totalPrice,
          event_date: eventDate,
          guest_count: Number(guestCount),
          interested_package: selectedPackage.value,
          admin_notes: notesToSave + `\n[Sistema]: Convertido a evento y registrado adelanto (${formatCurrency(depositAmount)}) el ${new Date().toLocaleDateString()}.`,
          updated_by: currentUserId
        })
        .eq('id', quote.id)
        .select().single();

      if (quoteError) throw quoteError;

      if (updatedQuote) onUpdate(updatedQuote as Quote);
      setEventExists(true);
      setShowConfirm(false);
      alert(`¡Evento y Adelanto (${formatCurrency(depositAmount)}) registrado con éxito!`);
      
    } catch (error: any) {
      console.error(error);
      alert(`Error al convertir: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmDelete = () => setShowDeleteConfirm(true);

  const executeDelete = async () => {
    try {
      setIsProcessing(true);
      const { error: deleteError } = await supabase.from('events').delete().eq('quote_id', quote.id);
      if (deleteError) throw deleteError;

      const { data: updatedQuote, error: updateError } = await supabase
        .from('quotes')
        .update({ status: 'quoted', updated_by: currentUserId })
        .eq('id', quote.id)
        .select().single();

      if (updateError) throw updateError;

      if (updatedQuote) onUpdate(updatedQuote as Quote);
      setEventExists(false);
      setShowDeleteConfirm(false);
      
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      if (guestCount === '' || Number(guestCount) <= 0) { alert("Invitados obligatorio."); setIsSaving(false); return; }
      if (!eventDate) { alert("Fecha obligatoria."); setIsSaving(false); return; }

      const updates = {
        admin_notes: notes,
        estimated_price: price ? parseFloat(price) : null,
        event_date: eventDate,
        guest_count: Number(guestCount),
        interested_package: selectedPackage.value || null,
        updated_by: currentUserId
      };

      const { data, error } = await supabase
        .from('quotes')
        .update(updates)
        .eq('id', quote.id)
        .select().single();

      if (error) throw error;
      if (data) { onUpdate(data as Quote); onClose(); }
    } catch (error) {
      alert('Error al guardar cambios');
    } finally {
      setIsSaving(false);
    }
  };

  const isDeclined = quote.status === 'declined';
  const isLocked = eventExists || isDeclined; 

  return (
    <>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-4xl transform overflow-visible rounded-2xl bg-white text-left align-middle shadow-xl transition-all">
                  
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-100 bg-secondary-50/50 rounded-t-2xl">
                    <div>
                      <Dialog.Title as="h2" className="text-xl font-display font-bold text-secondary-900">
                        Detalles de Cotización
                      </Dialog.Title>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-secondary-500 font-mono bg-secondary-200 px-1.5 py-0.5 rounded">{quote.id.slice(0, 8)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border bg-white border-secondary-200 text-secondary-600`}>{quote.status.toUpperCase()}</span>
                      </div>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-secondary-200 rounded-full transition-colors outline-none focus:ring-2 focus:ring-secondary-400">
                      <X className="w-5 h-5 text-secondary-400 hover:text-secondary-600" />
                    </button>
                  </div>

                  {/* Body Scrollable */}
                  <div className="p-6 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      
                      {/* Left Column */}
                      <div className="lg:col-span-2 space-y-8">
                        {/* Cliente */}
                        <section>
                          <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <User className="w-4 h-4 text-secondary-600" /> Información del Cliente
                          </h3>
                          <div className="bg-secondary-50 p-4 rounded-xl border border-secondary-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><label className="text-xs text-secondary-400 block mb-1 font-medium">Nombre</label><p className="font-bold text-secondary-900 text-lg">{quote.client_name}</p></div>
                            <div><label className="text-xs text-secondary-400 block mb-1 font-medium">Teléfono</label><p className="font-medium text-secondary-900 font-mono">{quote.client_phone}</p></div>
                            <div className="sm:col-span-2"><label className="text-xs text-secondary-400 block mb-1 font-medium">Email</label><p className="font-medium text-secondary-900">{quote.client_email}</p></div>
                          </div>
                        </section>

                        {/* Detalles Evento */}
                        <section>
                          <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-secondary-600" /> Detalles del Evento {isLocked && <span className="text-xs normal-case ml-2 text-secondary-400">(Lectura)</span>}
                          </h3>
                          <div className="bg-secondary-50 p-4 rounded-xl border border-secondary-100 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-xs text-secondary-400 block mb-1 font-medium">Fecha</label>
                                <input type="date" value={eventDate} min={new Date().toISOString().split('T')[0]} onChange={(e) => setEventDate(e.target.value)} disabled={isLocked} className={cn(INPUT_STYLES, dateError && "border-red-300 bg-red-50")} />
                                {dateError && !isLocked && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Fecha pasada</p>}
                              </div>
                              <div>
                                <label className="text-xs text-secondary-400 block mb-1 font-medium">Invitados</label>
                                <input type="number" min="1" value={guestCount} onChange={handleGuestChange} disabled={isLocked} className={INPUT_STYLES} />
                              </div>
                            </div>
                            
                            <div>
                              <label className="text-xs text-secondary-400 block mb-1 font-medium">Paquete</label>
                              <Listbox value={selectedPackage} onChange={setSelectedPackage} disabled={isLocked}>
                                <div className="relative">
                                  <Listbox.Button className={cn(INPUT_STYLES, "text-left flex items-center justify-between bg-white")}>
                                    <span className="block truncate">{selectedPackage.label}</span>
                                    <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
                                  </Listbox.Button>
                                  <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                                    <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-50">
                                      {AVAILABLE_PACKAGES.map((pkg, idx) => (
                                        <Listbox.Option key={idx} className={({ active }) => `relative cursor-default select-none py-2 pl-3 pr-9 ${active ? 'bg-secondary-100 text-secondary-900' : 'text-secondary-900'}`} value={pkg}>
                                          {({ selected }) => (
                                            <>
                                              <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>{pkg.label}</span>
                                              {selected && <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-secondary-600"><Check className="h-4 w-4" aria-hidden="true" /></span>}
                                            </>
                                          )}
                                        </Listbox.Option>
                                      ))}
                                    </Listbox.Options>
                                  </Transition>
                                </div>
                              </Listbox>
                            </div>

                            <div>
                              <label className="text-xs text-secondary-400 block mb-1 font-medium">Mensaje Original</label>
                              <div className="bg-white p-3 rounded-lg border border-secondary-200 text-sm italic text-secondary-600">"{quote.message || 'Sin mensaje.'}"</div>
                            </div>
                          </div>
                        </section>
                      </div>

                      {/* Right Column */}
                      <div className="space-y-6">
                        <div className="bg-white rounded-xl border border-secondary-200 p-5 space-y-6 shadow-sm">
                          <div>
                            <label className="text-sm font-bold text-secondary-900 mb-2 flex items-center gap-2"><FileText className="w-4 h-4 text-secondary-600" /> Notas Administrativas</label>
                            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full min-h-[120px] p-3 text-sm border border-secondary-200 rounded-lg resize-none focus:ring-primary-500 focus:border-primary-500 placeholder:text-secondary-400" placeholder="Escribe notas internas aquí..." />
                          </div>

                          <div>
                            <label className="text-sm font-bold text-secondary-900 mb-2 flex items-center gap-2"><DollarSign className="w-4 h-4 text-secondary-600" /> Presupuesto Estimado</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 font-semibold">S/</span>
                              <input type="number" min="0" step="0.01" value={price} onChange={handlePriceChange} disabled={isLocked} className={cn(INPUT_STYLES, "pl-8 pr-4 font-mono font-medium text-lg")} placeholder="0.00" />
                            </div>
                            {price && parseFloat(price) > 0 && (
                              <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-100">
                                <div className="flex justify-between text-xs text-green-700 mb-1"><span>Adelanto (50%):</span><span className="font-bold">{formatCurrency(parseFloat(price) / 2)}</span></div>
                                <div className="flex justify-between text-xs text-green-700"><span>Saldo:</span><span className="font-bold">{formatCurrency(parseFloat(price) / 2)}</span></div>
                              </div>
                            )}
                          </div>

                          <div className="pt-4 border-t border-secondary-100">
                            {checkingEvent ? (
                              <div className="flex justify-center py-2"><Loader2 className="w-5 h-5 animate-spin text-secondary-400"/></div>
                            ) : isDeclined ? (
                              <div className="w-full py-3 px-4 bg-gray-100 text-gray-400 rounded-lg font-bold flex items-center justify-center gap-2 cursor-not-allowed border border-gray-200"><Ban className="w-5 h-5" /> Declinada</div>
                            ) : eventExists ? (
                              isSuperAdmin ? (
                                <button onClick={confirmDelete} disabled={isProcessing} className="w-full py-3 px-4 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-bold transition-all flex items-center justify-center gap-2">
                                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-5 h-5" /> Eliminar Evento</>}
                                </button>
                              ) : (
                                <div className="w-full py-3 px-4 bg-green-50 text-green-700 border border-green-200 rounded-lg font-bold flex items-center justify-center gap-2 cursor-default">
                                   <CalendarCheck className="w-5 h-5" /> Evento Confirmado
                                </div>
                              )
                            ) : (
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
                          <div className="flex items-center gap-2"><Clock className="w-3 h-3" /><span>Creado: {formatDate(quote.created_at)}</span></div>
                          {quote.updated_at && (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2 text-secondary-500 font-medium"><Save className="w-3 h-3" /><span>Actualizado: {formatDate(quote.updated_at)}</span></div>
                              {updaterName && <div className="flex items-center gap-2 pl-5 text-secondary-400"><UserCog className="w-3 h-3" /><span>Por: {updaterName}</span></div>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 bg-secondary-50 border-t border-secondary-100 flex justify-between items-center gap-3 rounded-b-2xl">
                    {eventExists ? <div className="flex items-center gap-2 text-green-700 text-sm font-medium bg-green-100 px-3 py-1.5 rounded-lg"><CalendarCheck className="w-4 h-4" /> <span>Evento activo en calendario</span></div> : <div></div>}
                    <div className="flex gap-3">
                      <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-secondary-600 hover:text-secondary-900 hover:bg-white rounded-lg transition-colors">Cerrar</button>
                      {!isLocked && (
                        <button onClick={handleSave} disabled={isSaving || dateError} className="px-6 py-2 text-sm font-bold text-white bg-secondary-900 hover:bg-secondary-800 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                          {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : <><Save className="w-4 h-4" /> Guardar Cambios</>}
                        </button>
                      )}
                    </div>
                  </div>

                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Sub-Modal: Confirmar Creación */}
      <Transition appear show={showConfirm} as={Fragment}>
        <Dialog as="div" className="relative z-[60]" onClose={() => setShowConfirm(false)}>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-center shadow-xl transition-all">
                <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mb-4 mx-auto"><CalendarCheck className="w-8 h-8" /></div>
                <Dialog.Title className="text-xl font-bold text-secondary-900 mb-2">¿Crear Evento en Calendario?</Dialog.Title>
                <p className="text-secondary-500 mb-6">Fecha: <strong>{new Date(eventDate + 'T00:00:00').toLocaleDateString()}</strong></p>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => setShowConfirm(false)} className="px-5 py-2.5 rounded-xl font-medium text-secondary-600 hover:bg-secondary-50">Cancelar</button>
                  <button onClick={executeConversion} disabled={isProcessing} className="px-6 py-2.5 rounded-xl font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-lg flex items-center gap-2">
                    {isProcessing ? <><Loader2 className="w-5 h-5 animate-spin" /> ...</> : "Sí, Crear"}
                  </button>
                </div>
              </Dialog.Panel>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Sub-Modal: Confirmar Eliminación */}
      <Transition appear show={showDeleteConfirm} as={Fragment}>
        <Dialog as="div" className="relative z-[60]" onClose={() => setShowDeleteConfirm(false)}>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-center shadow-xl transition-all">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 mx-auto"><AlertTriangle className="w-8 h-8" /></div>
                <Dialog.Title className="text-xl font-bold text-secondary-900 mb-2">¿Eliminar Evento?</Dialog.Title>
                <p className="text-secondary-500 text-sm mb-6">Esta acción eliminará el evento del calendario y regresará esta cotización al estado "Cotizada". <br/><span className="text-red-500 font-bold">Irreversible.</span></p>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => setShowDeleteConfirm(false)} className="px-5 py-2.5 rounded-xl font-medium text-secondary-600 hover:bg-secondary-50">Cancelar</button>
                  <button onClick={executeDelete} disabled={isProcessing} className="px-6 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg flex items-center gap-2">
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Trash2 className="w-5 h-5" /> Sí, Eliminar</>}
                  </button>
                </div>
              </Dialog.Panel>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}