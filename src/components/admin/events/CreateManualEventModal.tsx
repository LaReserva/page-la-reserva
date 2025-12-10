import { useState, useEffect } from 'react';
import { X, CalendarPlus, Loader2, User, Calendar, DollarSign, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/utils/utils'; 

// Simulación de un hook/función para mostrar notificaciones (toast)
// Si usas una librería real (como react-toastify), úsala aquí.
const showSuccessNotification = (message: string) => {
    console.log(`[NOTIFICACIÓN DE ÉXITO]: ${message}`);
    // Ejemplo: toast.success(message);
};

interface CreateManualEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateManualEventModal({ isOpen, onClose, onCreated }: CreateManualEventModalProps) {
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // ✅ Eliminamos showSuccess

  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');

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

  useEffect(() => {
    if (isOpen) {
      // Limpiar el formulario y errores al abrir
      setFormData({ clientName: '', clientEmail: '', clientPhone: '', eventType: 'Cumpleaños', eventDate: '', guestCount: '', price: '' });
      setPhoneError('');
      setEmailError('');
    }
  }, [isOpen]); // Depende solo de isOpen

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.clientName || !formData.eventDate || !formData.price) {
      alert("Por favor completa los campos obligatorios (*)");
      return;
    }

    const phoneRegex = /^9\d{8}$/;
    if (formData.clientPhone && !phoneRegex.test(formData.clientPhone)) {
      setPhoneError("El formato debe ser de 9 dígitos y empezar con 9.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.clientEmail && !emailRegex.test(formData.clientEmail)) {
      setEmailError("Ingresa un correo electrónico válido.");
      return;
    }

    try {
      setLoading(true);

      let clientId = null;

      // 1. Buscar/Crear Cliente... (Lógica igual)
      if (formData.clientEmail) {
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('email', formData.clientEmail)
          .maybeSingle();
        
        if (existingClient) {
          clientId = existingClient.id;
        }
      }

      if (!clientId) {
        const newClientData = {
          name: formData.clientName,
          email: formData.clientEmail || '', 
          phone: formData.clientPhone,
          total_events: 1,
          total_spent: 0
        };

        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert(newClientData)
          .select()
          .single();
        
        if (clientError) throw clientError;
        clientId = newClient.id;
      }

      // 3. Crear Cotización... (Lógica igual)
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          client_name: formData.clientName,
          client_email: formData.clientEmail || '',
          client_phone: formData.clientPhone,
          event_type: formData.eventType,
          event_date: formData.eventDate,
          guest_count: Number(formData.guestCount),
          estimated_price: Number(formData.price),
          status: 'converted',
          admin_notes: '[Sistema]: Evento creado manualmente desde Calendario.',
          updated_by: currentUserId
        }).select().single();

      if (quoteError) throw quoteError;

      // 4. Crear Evento... (Lógica igual)
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

      // ✅ ÉXITO: Mostrar notificación rápida y CERRAR el modal
      showSuccessNotification(`Evento '${formData.clientName}' creado para ${new Date(formData.eventDate).toLocaleDateString()}.`);
      onCreated();
      onClose(); // <-- Cierre automático

    } catch (error: any) {
      console.error(error);
      alert(`Error al crear el evento: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-secondary-900/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal ancho max-w-2xl */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        
        {/*
          // ✅ Eliminamos el bloque condicional showSuccess y mostramos solo el formulario
        */}
        <>
            <div className="px-6 py-4 border-b bg-secondary-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-secondary-900 flex items-center gap-2">
                <CalendarPlus className="w-5 h-5 text-primary-600"/> Nuevo Evento Manual
              </h2>
              <button onClick={onClose}><X className="w-5 h-5 text-secondary-400 hover:text-secondary-600"/></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-wider flex items-center gap-2">
                  <User className="w-3 h-3"/> Cliente
                </h3>
                <input 
                  required 
                  type="text" 
                  placeholder="Nombre Completo *" 
                  className="w-full p-2.5 border border-secondary-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" 
                  value={formData.clientName} 
                  onChange={e => setFormData({...formData, clientName: e.target.value})} 
                />
                
                <div className="grid grid-cols-2 gap-4 items-start">
                  {/* Input Email con Validación Visual */}
                  <div className="relative">
                    <input 
                      type="email" 
                      placeholder="Email (Opcional)" 
                      className={cn(
                        "w-full p-2.5 border rounded-lg text-sm focus:ring-2 outline-none transition-all",
                        emailError 
                          ? "border-red-500 focus:ring-red-200 bg-red-50" 
                          : "border-secondary-200 focus:ring-primary-500"
                      )}
                      value={formData.clientEmail} 
                      onChange={e => {
                        setFormData({...formData, clientEmail: e.target.value});
                        setEmailError(''); 
                      }}
                      onBlur={() => {
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (formData.clientEmail && !emailRegex.test(formData.clientEmail)) {
                          setEmailError("Email inválido");
                        }
                      }}
                    />
                    {emailError && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1 absolute -bottom-5 left-0 w-full whitespace-nowrap">
                        <AlertCircle className="w-3 h-3" /> {emailError}
                      </p>
                    )}
                  </div>
                  
                  {/* Input Teléfono con Validación Visual */}
                  <div className="relative">
                    <input 
                      type="tel" 
                      placeholder="Celular (9 dígitos)" 
                      maxLength={9}
                      className={cn(
                        "w-full p-2.5 border rounded-lg text-sm focus:ring-2 outline-none transition-all",
                        phoneError 
                          ? "border-red-500 focus:ring-red-200 bg-red-50" 
                          : "border-secondary-200 focus:ring-primary-500"
                      )}
                      value={formData.clientPhone} 
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        setFormData({...formData, clientPhone: val});
                        
                        if (val.length > 0 && (!/^9/.test(val) || val.length > 9)) {
                          setPhoneError("Debe empezar con 9");
                        } else {
                          setPhoneError("");
                        }
                      }} 
                    />
                    {phoneError && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1 absolute -bottom-5 left-0 w-full whitespace-nowrap">
                        <AlertCircle className="w-3 h-3" /> {phoneError}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-6 border-t border-secondary-100">
                <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-3 h-3"/> Detalles
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-secondary-500 mb-1 block">Fecha *</label>
                    <input required type="date" min={new Date().toISOString().split('T')[0]} className="w-full p-2.5 border border-secondary-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" value={formData.eventDate} onChange={e => setFormData({...formData, eventDate: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs text-secondary-500 mb-1 block">Tipo de Evento</label>
                    <select className="w-full p-2.5 border border-secondary-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white" value={formData.eventType} onChange={e => setFormData({...formData, eventType: e.target.value})}>
                      <option>Boda</option><option>Cumpleaños</option><option>Corporativo</option><option>Graduación</option><option>Privado</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="text-xs text-secondary-500 mb-1 block">Invitados *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-secondary-400 text-xs font-bold">INV</span>
                      <input required type="number" min="1" placeholder="0" className="w-full pl-10 p-2.5 border border-secondary-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" value={formData.guestCount} onChange={e => setFormData({...formData, guestCount: e.target.value})} />
                    </div>
                  </div>
                  <div className="relative">
                    <label className="text-xs text-secondary-500 mb-1 block">Presupuesto *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-secondary-400"><DollarSign className="w-4 h-4"/></span>
                      <input required type="number" min="0" placeholder="0.00" className="w-full pl-9 p-2.5 border border-secondary-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full py-3 bg-secondary-900 hover:bg-secondary-800 text-white rounded-lg font-bold shadow-md flex items-center justify-center gap-2 transition-all"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : "Crear Evento"}
                </button>
              </div>
            </form>
          </>
      </div>
    </div>
  );
}