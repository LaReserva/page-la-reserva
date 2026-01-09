import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition, Combobox, Listbox } from '@headlessui/react';
import { 
  X, CalendarPlus, Loader2, User, Calendar, DollarSign, 
  AlertCircle, Search, AlertTriangle, Check, ChevronDown, CheckCircle2 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/utils/utils'; 
import type { Client } from '@/types';

// Opciones de Evento
const EVENT_TYPES = [
  { id: 'Boda', name: 'Boda' },
  { id: 'Cumpleaños', name: 'Cumpleaños' },
  { id: 'Corporativo', name: 'Corporativo' },
  { id: 'Graduación', name: 'Graduación' },
  { id: 'Privado', name: 'Privado' },
];

// ✅ ESTILOS BASE (Extraídos de tu ejemplo para consistencia)
const INPUT_BASE_CLASSES = "w-full border border-secondary-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-secondary-500 focus:border-secondary-500 placeholder-gray-400 transition-colors duration-200 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed";
interface CreateManualEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  initialClient?: Client | null;
}

export function CreateManualEventModal({ isOpen, onClose, onCreated, initialClient }: CreateManualEventModalProps) {
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // --- Buscador de Cliente con Combobox ---
  const [query, setQuery] = useState('');
  const [foundClients, setFoundClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  // --- Estados de Error ---
  const [errorModalMsg, setErrorModalMsg] = useState<string | null>(null); 
  const [errors, setErrors] = useState({
    phone: '',
    guestCount: '',
    email: ''
  });

  const [formData, setFormData] = useState({
    clientName: '', 
    clientEmail: '',
    clientPhone: '',
    eventType: EVENT_TYPES[1], 
    eventDate: '',
    guestCount: '',
    price: ''
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (initialClient) {
        handleSelectClient(initialClient);
      } else {
        resetForm();
      }
    }
  }, [isOpen, initialClient]); 

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.length > 1) {
        const { data } = await supabase
          .from('clients')
          .select('*')
          .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
          .limit(5);
        setFoundClients(data as Client[] || []);
      } else {
        setFoundClients([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const resetForm = () => {
    setFormData({ 
      clientName: '', clientEmail: '', clientPhone: '', 
      eventType: EVENT_TYPES[1], eventDate: '', guestCount: '', price: '' 
    });
    setErrors({ phone: '', guestCount: '', email: '' });
    setSelectedClient(null);
    setQuery('');
    setErrorModalMsg(null);
  };

  const handleSelectClient = (client: Client | null) => {
    setSelectedClient(client);
    if (client) {
      setFormData(prev => ({
        ...prev,
        clientName: client.name,
        clientEmail: client.email || '',
        clientPhone: client.phone || '',
      }));
      setErrors(prev => ({ ...prev, phone: '', email: '' }));
    } else {
      setFormData(prev => ({ ...prev, clientName: '', clientEmail: '', clientPhone: '' }));
    }
  };

  // --- VALIDADORES ---
  const handlePhoneChange = (val: string) => {
    const numericVal = val.replace(/\D/g, '').slice(0, 9);
    setFormData(prev => ({ ...prev, clientPhone: numericVal }));

    let errorMsg = '';
    if (numericVal.length > 0) {
      if (numericVal[0] !== '9') errorMsg = 'El número debe empezar con 9';
      else if (numericVal.length < 9) errorMsg = `Faltan ${9 - numericVal.length} dígitos`;
    }
    setErrors(prev => ({ ...prev, phone: errorMsg }));
  };

  const handleGuestChange = (val: string) => {
    setFormData(prev => ({ ...prev, guestCount: val }));
    let errorMsg = '';
    if (val !== '') {
      const num = parseInt(val);
      if (isNaN(num) || num <= 0) errorMsg = 'Mínimo 1 invitado';
    }
    setErrors(prev => ({ ...prev, guestCount: errorMsg }));
  };

  const handleEmailChange = (val: string) => {
    setFormData(prev => ({ ...prev, clientEmail: val }));
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (val && !emailRegex.test(val)) {
        setErrors(prev => ({ ...prev, email: 'Email inválido' }));
    } else {
        setErrors(prev => ({ ...prev, email: '' }));
    }
  };

  // --- SUBMIT ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (errors.phone || errors.guestCount || errors.email) return;
    if (!formData.clientName || !formData.eventDate || !formData.price || !formData.clientPhone || !formData.guestCount) {
      setErrorModalMsg("Por favor completa los campos obligatorios correctamente.");
      return;
    }

    try {
      setLoading(true);
      let clientId = selectedClient?.id || null;

      if (!clientId) {
        if (formData.clientEmail) {
          const { data: existingClient } = await supabase.from('clients').select('id').eq('email', formData.clientEmail).maybeSingle();
          if (existingClient) clientId = existingClient.id;
        }

        if (!clientId) {
           const { data: newClient, error: clientError } = await supabase.from('clients').insert({
             name: formData.clientName,
             email: formData.clientEmail || '',
             phone: formData.clientPhone,
             total_events: 1,
             total_spent: 0
           }).select().single();
           
           if (clientError) throw clientError;
           clientId = newClient.id;
        }
      }

      const { data: quote, error: quoteError } = await supabase.from('quotes').insert({
          client_name: formData.clientName,
          client_email: formData.clientEmail || '',
          client_phone: formData.clientPhone,
          event_type: formData.eventType.name,
          event_date: formData.eventDate,
          guest_count: Number(formData.guestCount),
          estimated_price: Number(formData.price),
          status: 'converted',
          admin_notes: selectedClient ? `[Sistema]: Evento creado para cliente recurrente.` : `[Sistema]: Evento creado manualmente.`,
          updated_by: currentUserId
        }).select().single();

      if (quoteError) throw quoteError;

      const { error: eventError } = await supabase.from('events').insert({
        client_id: clientId,
        quote_id: quote.id,
        event_type: formData.eventType.name,
        event_date: formData.eventDate,
        event_time: '12:00:00',
        guest_count: Number(formData.guestCount),
        total_price: Number(formData.price),
        status: 'pending',
        created_at: new Date().toISOString(),
        closed_by: currentUserId
      });

      if (eventError) throw eventError;

      onCreated();
      onClose();

    } catch (error: any) {
      console.error("Error DB:", error);
      if (error.message?.includes('quotes_guest_count_check')) {
        setErrorModalMsg("El número de invitados excede el límite permitido.");
      } else if (error.code === '23505') { 
        setErrorModalMsg("Ya existe un registro con estos datos.");
      } else {
        setErrorModalMsg(`Error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[60]" onClose={onClose}>
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
                <Dialog.Panel className="w-full max-w-2xl transform overflow-visible rounded-2xl bg-white text-left align-middle shadow-xl transition-all">
                  
                  {/* Header */}
                  <div className="px-6 py-4 border-b bg-secondary-50 flex justify-between items-center rounded-t-2xl">
                    <Dialog.Title as="h3" className="text-lg font-bold text-secondary-900 flex items-center gap-2">
                      <CalendarPlus className="w-5 h-5 text-secondary-600"/> 
                      {selectedClient ? 'Nuevo Evento (Cliente Existente)' : 'Nuevo Evento Manual'}
                    </Dialog.Title>
                    <button onClick={onClose} className="p-1 hover:bg-secondary-200 rounded-full transition-colors outline-none focus:ring-2 focus:ring-secondary-400">
                      <X className="w-5 h-5 text-secondary-400 hover:text-secondary-600"/>
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="p-6 space-y-5">
                      
                     {/* SECCIÓN CLIENTE (Combobox) */}
                     <div className="space-y-4 relative">
                        <div className="flex items-center justify-between">
                           <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-wider flex items-center gap-2">
                             <User className="w-3 h-3"/> Cliente
                           </h3>
                           {selectedClient && (
                             <button 
                               type="button" 
                               onClick={() => handleSelectClient(null)} 
                               className="text-xs text-red-500 hover:text-red-700 font-medium hover:underline"
                             >
                               Limpiar selección
                             </button>
                           )}
                        </div>
                        
                        {/* Combobox de Búsqueda */}
                        <Combobox value={selectedClient} onChange={handleSelectClient} disabled={!!initialClient}>
                          <div className="relative mt-1">
                            <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left focus:outline-none sm:text-sm">
                              <Combobox.Input
                                className={cn(
                                  INPUT_BASE_CLASSES,
                                  "py-2.5 pl-10 pr-10", // Padding extra para el icono de búsqueda
                                  selectedClient ? "bg-green-50 font-bold text-green-800 border-green-300 focus:ring-green-500 focus:border-green-500" : ""
                                )}
                                displayValue={(client: Client) => client?.name || ''}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Buscar cliente existente..."
                              />
                              <Combobox.Button className="absolute inset-y-0 left-0 flex items-center pl-3">
                                {selectedClient ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Search className="h-4 w-4 text-secondary-400" aria-hidden="true" />}
                              </Combobox.Button>
                            </div>
                            <Transition
                              as={Fragment}
                              leave="transition ease-in duration-100"
                              leaveFrom="opacity-100"
                              leaveTo="opacity-0"
                              afterLeave={() => setQuery('')}
                            >
                              <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-50 border border-secondary-100">
                                {foundClients.length === 0 && query !== '' ? (
                                  <div className="relative cursor-default select-none py-2 px-4 text-secondary-500 italic text-xs">
                                    No se encontraron clientes. Se creará uno nuevo.
                                  </div>
                                ) : (
                                  foundClients.map((client) => (
                                    <Combobox.Option
                                      key={client.id}
                                      className={({ active }) =>
                                        `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                                          active ? 'bg-secondary-100 text-secondary-900' : 'text-secondary-900'
                                        }`
                                      }
                                      value={client}
                                    >
                                      {({ selected, active }) => (
                                        <>
                                          <div className="flex flex-col">
                                            <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                              {client.name}
                                            </span>
                                            <span className={`block truncate text-xs ${active ? 'text-secondary-700' : 'text-secondary-500'}`}>
                                              {client.email || client.phone}
                                            </span>
                                          </div>
                                          {selected ? (
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-secondary-600">
                                              <Check className="h-4 w-4" aria-hidden="true" />
                                            </span>
                                          ) : null}
                                        </>
                                      )}
                                    </Combobox.Option>
                                  ))
                                )}
                              </Combobox.Options>
                            </Transition>
                          </div>
                        </Combobox>

                        {/* Campos manuales */}
                        <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-4 transition-all duration-300", selectedClient ? "opacity-75 pointer-events-none grayscale" : "opacity-100")}>
                           <div className="relative">
                              <input 
                                required={!selectedClient}
                                type="text"
                                placeholder="Nombre Completo *"
                                value={formData.clientName}
                                onChange={e => setFormData({...formData, clientName: e.target.value})}
                                className={cn(INPUT_BASE_CLASSES, "p-2.5")} // Padding normal
                              />
                           </div>
                           <div className="relative">
                              <input 
                                type="email" 
                                placeholder="Email (Opcional)" 
                                value={formData.clientEmail}
                                onChange={e => handleEmailChange(e.target.value)}
                                className={cn(INPUT_BASE_CLASSES, "p-2.5", errors.email && "border-red-300 bg-red-50 focus:ring-red-200 focus:border-red-500")}
                              />
                              {errors.email && !selectedClient && <p className="text-[10px] text-red-500 absolute -bottom-4 right-0">{errors.email}</p>}
                           </div>
                           <div className="relative sm:col-span-2">
                              <input 
                                required={!selectedClient}
                                type="tel" 
                                maxLength={9}
                                placeholder="Celular (9 dígitos) *"
                                value={formData.clientPhone}
                                onChange={e => handlePhoneChange(e.target.value)}
                                className={cn(INPUT_BASE_CLASSES, "p-2.5", errors.phone && "border-red-300 bg-red-50 focus:ring-red-200 focus:border-red-500")}
                              />
                              {errors.phone && !selectedClient && <p className="text-[10px] text-red-500 absolute -bottom-4 right-0">{errors.phone}</p>}
                           </div>
                        </div>
                     </div>

                     <div className="space-y-4 pt-4 border-t border-secondary-100">
                        <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-wider flex items-center gap-2">
                           <Calendar className="w-3 h-3"/> Detalles del Evento
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                             <label className="text-xs text-secondary-500 mb-1 block">Fecha *</label>
                             <input 
                               required 
                               type="date" 
                               min={new Date().toISOString().split('T')[0]} 
                               className={cn(INPUT_BASE_CLASSES, "p-2.5")} 
                               value={formData.eventDate} 
                               onChange={e => setFormData({...formData, eventDate: e.target.value})} 
                             />
                           </div>
                           
                           {/* Listbox para Tipo de Evento */}
                           <div>
                             <label className="text-xs text-secondary-500 mb-1 block">Tipo</label>
                             <Listbox value={formData.eventType} onChange={(val) => setFormData({...formData, eventType: val})}>
                               <div className="relative">
                                 <Listbox.Button className={cn(INPUT_BASE_CLASSES, "py-2.5 pl-3 pr-10 text-left bg-white")}>
                                   <span className="block truncate">{formData.eventType.name}</span>
                                   <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                     <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
                                   </span>
                                 </Listbox.Button>
                                 <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                                   <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-50 border border-secondary-100">
                                     {EVENT_TYPES.map((type, typeIdx) => (
                                       <Listbox.Option key={typeIdx} className={({ active }) => `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-secondary-100 text-secondary-900' : 'text-secondary-900'}`} value={type}>
                                         {({ selected }) => (
                                           <>
                                             <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>{type.name}</span>
                                             {selected ? <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-secondary-600"><Check className="h-4 w-4" aria-hidden="true" /></span> : null}
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

                        <div className="grid grid-cols-2 gap-4 items-start">
                           <div className="relative">
                             <label className="text-xs text-secondary-500 mb-1 block">Invitados *</label>
                             <input 
                               required 
                               type="number" 
                               min="1" 
                               placeholder="0" 
                               className={cn(INPUT_BASE_CLASSES, "p-2.5", errors.guestCount && "border-red-300 bg-red-50 focus:ring-red-200 focus:border-red-500")} 
                               value={formData.guestCount} 
                               onChange={e => handleGuestChange(e.target.value)} 
                             />
                           </div>

                           <div className="relative">
                             <label className="text-xs text-secondary-500 mb-1 block">Presupuesto *</label>
                             <div className="relative">
                               <span className="absolute left-3 top-2.5 text-secondary-400"><DollarSign className="w-4 h-4"/></span>
                               {/* Input con Padding Left Extra para el símbolo de dólar */}
                               <input 
                                 required 
                                 type="number" 
                                 min="0" 
                                 placeholder="0.00" 
                                 className={cn(INPUT_BASE_CLASSES, "pl-9 p-2.5")} 
                                 value={formData.price} 
                                 onChange={e => setFormData({...formData, price: e.target.value})} 
                               />
                             </div>
                           </div>
                        </div>
                     </div>

                     <div className="pt-4">
                        <button 
                          type="submit" 
                          disabled={loading || !!errors.phone || !!errors.guestCount || !!errors.email} 
                          className="w-full py-3 bg-secondary-900 text-white rounded-lg font-bold hover:bg-secondary-800 transition-all flex justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-secondary-900/10 hover:shadow-secondary-900/20 active:scale-[0.99]"
                        >
                          {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : "Crear Evento"}
                        </button>
                     </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Modal de Error */}
      <Transition appear show={!!errorModalMsg} as={Fragment}>
        <Dialog as="div" className="relative z-[70]" onClose={() => setErrorModalMsg(null)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
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
                <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-xl bg-white p-6 text-center align-middle shadow-xl transition-all">
                   <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 mx-auto animate-bounce">
                     <AlertTriangle className="w-6 h-6" />
                   </div>
                   <Dialog.Title as="h3" className="text-lg font-bold text-secondary-900 mb-2">
                     Error al Crear
                   </Dialog.Title>
                   <p className="text-secondary-600 mb-6 text-sm">
                     {errorModalMsg}
                   </p>
                   <button onClick={() => setErrorModalMsg(null)} className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors shadow-md">
                     Entendido
                   </button>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}