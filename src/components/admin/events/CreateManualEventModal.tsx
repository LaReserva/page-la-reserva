import { useState, useEffect } from 'react';
import { X, CalendarPlus, Loader2, User, Calendar, DollarSign, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface CreateManualEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateManualEventModal({ isOpen, onClose, onCreated }: CreateManualEventModalProps) {
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  
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
      if (!showSuccess) {
        setFormData({ clientName: '', clientEmail: '', clientPhone: '', eventType: 'Cumpleaños', eventDate: '', guestCount: '', price: '' });
      }
    } else {
      const timer = setTimeout(() => {
        setShowSuccess(false);
        setFormData({ clientName: '', clientEmail: '', clientPhone: '', eventType: 'Cumpleaños', eventDate: '', guestCount: '', price: '' });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.clientName || !formData.eventDate || !formData.price) {
      alert("Por favor completa los campos obligatorios (*)");
      return;
    }

    const phoneRegex = /^9\d{8}$/;
    if (formData.clientPhone && !phoneRegex.test(formData.clientPhone)) {
      alert("El número de celular debe tener 9 dígitos y empezar con 9.");
      return;
    }

    try {
      setLoading(true);

      let clientId = null;

      // 1. Buscar Cliente
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

      // 2. Crear Cliente Nuevo
      if (!clientId) {
        // ✅ CORRECCIÓN TIPADO FUERTE:
        // Como la interfaz espera 'string' para el email, enviamos una cadena vacía '' si no hay email.
        // Esto cumple con el tipo 'string' y evita el error de sobrecarga.
        const newClientData = {
          name: formData.clientName,
          email: formData.clientEmail || '', // Usamos '' en lugar de null para satisfacer el tipo string
          phone: formData.clientPhone,
          total_events: 1,
          total_spent: 0
        };

        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert(newClientData) // Ahora TypeScript aceptará esto sin 'as any'
          .select()
          .single();
        
        if (clientError) throw clientError;
        clientId = newClient.id;
      }

      // 3. Crear Cotización "Dummy"
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

      // 4. Crear Evento
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

      setShowSuccess(true);
      onCreated();

    } catch (error: any) {
      console.error(error);
      alert(`Error al crear: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSuccess = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-secondary-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        
        {showSuccess ? (
          <div className="p-8 flex flex-col items-center justify-center text-center animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-secondary-900 mb-2">¡Evento Creado!</h3>
            <p className="text-secondary-500 mb-6">
              El evento de <strong>{formData.clientName}</strong> se ha agendado correctamente para el <strong>{new Date(formData.eventDate + 'T00:00:00').toLocaleDateString()}</strong>.
            </p>
            <button 
              onClick={handleCloseSuccess}
              className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg transition-colors w-full sm:w-auto"
            >
              Entendido, Cerrar
            </button>
          </div>
        ) : (
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
                <div className="grid grid-cols-2 gap-3">
                  <input 
                    type="email" 
                    placeholder="Email (Opcional)" 
                    className="w-full p-2.5 border border-secondary-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" 
                    value={formData.clientEmail} 
                    onChange={e => setFormData({...formData, clientEmail: e.target.value})} 
                  />
                  <input 
                    type="tel" 
                    placeholder="Celular (9 dígitos)" 
                    maxLength={9}
                    className="w-full p-2.5 border border-secondary-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" 
                    value={formData.clientPhone} 
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      setFormData({...formData, clientPhone: val})
                    }} 
                  />
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-secondary-100">
                <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-3 h-3"/> Detalles
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-secondary-500 mb-1 block">Fecha *</label>
                    <input 
                      required 
                      type="date" 
                      min={new Date().toISOString().split('T')[0]} 
                      className="w-full p-2.5 border border-secondary-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" 
                      value={formData.eventDate} 
                      onChange={e => setFormData({...formData, eventDate: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="text-xs text-secondary-500 mb-1 block">Tipo de Evento</label>
                    <select 
                      className="w-full p-2.5 border border-secondary-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white" 
                      value={formData.eventType} 
                      onChange={e => setFormData({...formData, eventType: e.target.value})}
                    >
                      <option>Boda</option>
                      <option>Cumpleaños</option>
                      <option>Corporativo</option>
                      <option>Graduación</option>
                      <option>Privado</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <label className="text-xs text-secondary-500 mb-1 block">Invitados *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-secondary-400 text-xs font-bold">INV</span>
                      <input 
                        required 
                        type="number" 
                        min="1" 
                        placeholder="0" 
                        className="w-full pl-10 p-2.5 border border-secondary-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" 
                        value={formData.guestCount} 
                        onChange={e => setFormData({...formData, guestCount: e.target.value})} 
                      />
                    </div>
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

              <div className="pt-4">
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
        )}
      </div>
    </div>
  );
}