import { useState, useEffect } from 'react';
import { 
  X, CalendarPlus, Loader2, User, Calendar, DollarSign, 
  AlertCircle, Search, Users, AlertTriangle 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/utils/utils'; 
import type { Client } from '@/types';

interface CreateManualEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  initialClient?: Client | null;
}

export function CreateManualEventModal({ isOpen, onClose, onCreated, initialClient }: CreateManualEventModalProps) {
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // --- Estados de Búsqueda de Cliente ---
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [foundClients, setFoundClients] = useState<Client[]>([]);
  const [searchingLoading, setSearchingLoading] = useState(false);
  const [selectedExistingClient, setSelectedExistingClient] = useState<Client | null>(null);

  // --- Estados de Error (Modal y Campos) ---
  const [errorModalMsg, setErrorModalMsg] = useState<string | null>(null); // Para el modal de error
  const [errors, setErrors] = useState({
    phone: '',
    guestCount: '',
    email: ''
  });

  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    eventType: 'Cumpleaños',
    eventDate: '',
    guestCount: '',
    price: ''
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
  }, []);

  // Reiniciar formulario al abrir
  useEffect(() => {
    if (isOpen) {
      if (initialClient) {
        selectClient(initialClient);
      } else {
        resetForm();
      }
    }
  }, [isOpen, initialClient]); 

  // Buscador de clientes en tiempo real
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (isSearchingClient && clientSearchTerm.length > 2) {
        setSearchingLoading(true);
        const { data } = await supabase
          .from('clients')
          .select('*')
          .or(`name.ilike.%${clientSearchTerm}%,email.ilike.%${clientSearchTerm}%,phone.ilike.%${clientSearchTerm}%`)
          .limit(5);
        setFoundClients(data as Client[] || []);
        setSearchingLoading(false);
      } else {
        setFoundClients([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [clientSearchTerm, isSearchingClient]);

  const resetForm = () => {
    setFormData({ clientName: '', clientEmail: '', clientPhone: '', eventType: 'Cumpleaños', eventDate: '', guestCount: '', price: '' });
    setErrors({ phone: '', guestCount: '', email: '' });
    setSelectedExistingClient(null);
    setIsSearchingClient(false);
    setClientSearchTerm('');
    setErrorModalMsg(null);
  };

  const selectClient = (client: Client) => {
    setSelectedExistingClient(client);
    setFormData(prev => ({
      ...prev,
      clientName: client.name,
      clientEmail: client.email || '',
      clientPhone: client.phone || '',
    }));
    setIsSearchingClient(false);
    setErrors(prev => ({ ...prev, phone: '', email: '' })); // Limpiar errores de contacto al seleccionar
  };

  if (!isOpen) return null;

  // --- VALIDADORES ---
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 9);
    setFormData(prev => ({ ...prev, clientPhone: val }));

    let errorMsg = '';
    if (val.length > 0) {
      if (val[0] !== '9') errorMsg = 'El número debe empezar con 9';
      else if (val.length < 9) errorMsg = `Faltan ${9 - val.length} dígitos`;
    }
    setErrors(prev => ({ ...prev, phone: errorMsg }));
  };

  const handleGuestChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData(prev => ({ ...prev, guestCount: val }));

    let errorMsg = '';
    if (val !== '') {
      const num = parseInt(val);
      if (isNaN(num) || num <= 0) errorMsg = 'Debe haber al menos 1 invitado';
    }
    setErrors(prev => ({ ...prev, guestCount: errorMsg }));
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData(prev => ({ ...prev, clientEmail: val }));
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (val && !emailRegex.test(val)) {
        setErrors(prev => ({ ...prev, email: 'Formato de correo inválido' }));
    } else {
        setErrors(prev => ({ ...prev, email: '' }));
    }
  };

  // --- SUBMIT ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones finales
    if (errors.phone || errors.guestCount || errors.email) return;
    if (!formData.clientName || !formData.eventDate || !formData.price || !formData.clientPhone || !formData.guestCount) {
      setErrorModalMsg("Por favor completa los campos obligatorios correctamente.");
      return;
    }

    try {
      setLoading(true);
      let clientId = selectedExistingClient?.id || null;

      // Si no seleccionó un cliente existente, buscar por email o crear uno
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

      // Crear Cotización
      const { data: quote, error: quoteError } = await supabase.from('quotes').insert({
          client_name: formData.clientName,
          client_email: formData.clientEmail || '',
          client_phone: formData.clientPhone,
          event_type: formData.eventType,
          event_date: formData.eventDate,
          guest_count: Number(formData.guestCount),
          estimated_price: Number(formData.price),
          status: 'converted',
          admin_notes: selectedExistingClient ? `[Sistema]: Evento creado para cliente recurrente.` : `[Sistema]: Evento creado manualmente.`,
          updated_by: currentUserId
        }).select().single();

      if (quoteError) throw quoteError;

      // Crear Evento
      const { error: eventError } = await supabase.from('events').insert({
        client_id: clientId,
        quote_id: quote.id,
        event_type: formData.eventType,
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
      
      // ✅ MANEJO DE ERRORES AMIGABLE
      if (error.message?.includes('quotes_guest_count_check')) {
        setErrorModalMsg("El número de invitados excede el límite permitido por la base de datos.");
      } else if (error.code === '23505') { // Código de duplicados unique
        setErrorModalMsg("Ya existe un registro con estos datos.");
      } else {
        setErrorModalMsg(`Ocurrió un error al crear el evento: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
        <div className="absolute inset-0 bg-secondary-900/60 backdrop-blur-sm" onClick={onClose} />
        
        <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
          
          {/* Header */}
          <div className="px-6 py-4 border-b bg-secondary-50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-secondary-900 flex items-center gap-2">
              <CalendarPlus className="w-5 h-5 text-primary-600"/> 
              {selectedExistingClient ? 'Nuevo Evento (Cliente Existente)' : 'Nuevo Evento Manual'}
            </h2>
            <button onClick={onClose}><X className="w-5 h-5 text-secondary-400 hover:text-secondary-600"/></button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
             
             {/* SECCIÓN CLIENTE */}
             <div className="space-y-3 relative">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-wider flex items-center gap-2">
                    <User className="w-3 h-3"/> Cliente
                  </h3>
                  {!initialClient && (
                    <button 
                      type="button"
                      onClick={() => {
                        if(isSearchingClient) {
                          setIsSearchingClient(false);
                          setClientSearchTerm('');
                        } else {
                          setIsSearchingClient(true);
                        }
                      }}
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 bg-primary-50 px-2 py-1 rounded-md transition-colors"
                    >
                      {isSearchingClient ? <X className="w-3 h-3"/> : <Search className="w-3 h-3"/>}
                      {isSearchingClient ? 'Cancelar Búsqueda' : 'Buscar Cliente Existente'}
                    </button>
                  )}
                </div>
                
                {/* BUSCADOR DE CLIENTES */}
                {isSearchingClient ? (
                  <div className="bg-white border border-primary-200 rounded-lg p-3 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-secondary-400" />
                      <input 
                        type="text" 
                        autoFocus
                        placeholder="Buscar por nombre, email o teléfono..." 
                        className="w-full pl-9 p-2 text-sm border border-secondary-200 rounded-md focus:ring-2 focus:ring-primary-500 outline-none"
                        value={clientSearchTerm}
                        onChange={(e) => setClientSearchTerm(e.target.value)}
                      />
                      {searchingLoading && <Loader2 className="absolute right-3 top-2.5 w-4 h-4 text-primary-500 animate-spin" />}
                    </div>
                    
                    {foundClients.length > 0 && (
                      <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                        {foundClients.map(client => (
                          <li key={client.id}>
                            <button
                              type="button"
                              onClick={() => selectClient(client)}
                              className="w-full text-left p-2 hover:bg-primary-50 rounded-md flex items-center gap-3 transition-colors group"
                            >
                              <div className="w-8 h-8 rounded-full bg-secondary-100 flex items-center justify-center text-xs font-bold text-secondary-600 group-hover:bg-primary-100 group-hover:text-primary-700">
                                {client.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-secondary-900">{client.name}</p>
                                <p className="text-xs text-secondary-500">{client.email || client.phone}</p>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {clientSearchTerm.length > 2 && foundClients.length === 0 && !searchingLoading && (
                      <p className="text-xs text-secondary-400 text-center mt-2">No se encontraron clientes.</p>
                    )}
                  </div>
                ) : (
                  // INPUTS NORMALES (Bloqueados si se seleccionó cliente)
                  <>
                    <input 
                      required 
                      type="text" 
                      placeholder="Nombre Completo *" 
                      className={cn(
                        "w-full p-2.5 border border-secondary-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none",
                        selectedExistingClient ? "bg-gray-50 text-gray-500 cursor-not-allowed" : "bg-white"
                      )}
                      value={formData.clientName} 
                      onChange={e => setFormData({...formData, clientName: e.target.value})} 
                      disabled={!!selectedExistingClient || !!initialClient} 
                    />
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                       <div className="relative">
                         <input 
                           type="email" 
                           placeholder="Email (Opcional)" 
                           className={cn(
                             "w-full p-2.5 border rounded-lg text-sm focus:ring-2 outline-none transition-all",
                             errors.email ? "border-red-500 focus:ring-red-200 bg-red-50" : "border-secondary-200 focus:ring-primary-500",
                             selectedExistingClient ? "bg-gray-50 text-gray-500 cursor-not-allowed" : "bg-white"
                           )}
                           value={formData.clientEmail} 
                           onChange={handleEmailChange} 
                           disabled={!!selectedExistingClient || !!initialClient} 
                         />
                         {errors.email && (
                            <p className="text-xs text-red-500 mt-1 flex items-center gap-1 absolute w-full"><AlertCircle className="w-3 h-3" /> {errors.email}</p>
                         )}
                       </div>

                       <div className="relative">
                         <input 
                           required
                           type="tel" 
                           placeholder="Celular (9 dígitos) *" 
                           className={cn(
                             "w-full p-2.5 border rounded-lg text-sm focus:ring-2 outline-none transition-all",
                             errors.phone ? "border-red-500 focus:ring-red-200 bg-red-50" : "border-secondary-200 focus:ring-primary-500",
                             selectedExistingClient ? "bg-gray-50 text-gray-500 cursor-not-allowed" : "bg-white"
                           )}
                           value={formData.clientPhone} 
                           onChange={handlePhoneChange} 
                           maxLength={9}
                           disabled={!!selectedExistingClient || !!initialClient}
                         />
                         {errors.phone && (
                            <p className="text-xs text-red-500 mt-1 flex items-center gap-1 absolute w-full"><AlertCircle className="w-3 h-3" /> {errors.phone}</p>
                         )}
                       </div>
                    </div>
                  </>
                )}
             </div>

             <div className="space-y-3 pt-6 border-t border-secondary-100">
                <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-wider flex items-center gap-2"><Calendar className="w-3 h-3"/> Detalles</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-secondary-500 mb-1 block">Fecha *</label>
                    <input required type="date" min={new Date().toISOString().split('T')[0]} className="w-full p-2.5 border border-secondary-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" value={formData.eventDate} onChange={e => setFormData({...formData, eventDate: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs text-secondary-500 mb-1 block">Tipo</label>
                    <select className="w-full p-2.5 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none border-secondary-200" value={formData.eventType} onChange={e => setFormData({...formData, eventType: e.target.value})}>
                      <option>Boda</option><option>Cumpleaños</option><option>Corporativo</option><option>Graduación</option><option>Privado</option>
                    </select>
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
                       className={cn(
                         "w-full p-2.5 border rounded-lg text-sm focus:ring-2 outline-none transition-all",
                         errors.guestCount ? "border-red-500 focus:ring-red-200 bg-red-50" : "border-secondary-200 focus:ring-primary-500"
                       )}
                       value={formData.guestCount} 
                       onChange={handleGuestChange} 
                     />
                     {errors.guestCount && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1 absolute w-full"><AlertCircle className="w-3 h-3" /> {errors.guestCount}</p>
                     )}
                   </div>

                   <div className="relative">
                     <label className="text-xs text-secondary-500 mb-1 block">Presupuesto *</label>
                     <div className="relative">
                       <span className="absolute left-3 top-2.5 text-secondary-400"><DollarSign className="w-4 h-4"/></span>
                       <input 
                         required 
                         type="number" 
                         min="0" 
                         placeholder="0.00" 
                         className="w-full pl-9 p-2.5 border border-secondary-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" 
                         value={formData.price} 
                         onChange={e => setFormData({...formData, price: e.target.value})} 
                       />
                     </div>
                   </div>
                </div>
             </div>

             <div className="pt-6">
                <button 
                  type="submit" 
                  disabled={loading || !!errors.phone || !!errors.guestCount || !!errors.email} 
                  className="w-full py-3 bg-secondary-900 text-white rounded-lg font-bold hover:bg-secondary-800 transition-all flex justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : "Crear Evento"}
                </button>
             </div>
          </form>
        </div>
      </div>

      {/* ✅ MODAL DE ERROR (Reemplaza al alert) */}
      {errorModalMsg && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={() => setErrorModalMsg(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full animate-in zoom-in-95">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-center text-secondary-900 mb-2">Error al Crear</h3>
            <p className="text-center text-secondary-600 mb-6 text-sm">{errorModalMsg}</p>
            <button 
              onClick={() => setErrorModalMsg(null)}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}