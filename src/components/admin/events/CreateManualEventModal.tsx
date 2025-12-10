// src/components/admin/events/CreateManualEventModal.tsx

import { useState, useEffect } from 'react';
import { X, CalendarPlus, Loader2, User, Calendar, DollarSign, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/utils/utils'; 
import type { Client } from '@/types'; // ✅ Importamos el tipo Client

interface CreateManualEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  initialClient?: Client | null; // ✅ Nueva prop opcional
}

export function CreateManualEventModal({ isOpen, onClose, onCreated, initialClient }: CreateManualEventModalProps) {
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
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
      // ✅ LÓGICA DE PRE-LLENADO
      if (initialClient) {
        setFormData({
          clientName: initialClient.name,
          clientEmail: initialClient.email || '',
          clientPhone: initialClient.phone || '',
          eventType: 'Cumpleaños',
          eventDate: '',
          guestCount: '',
          price: ''
        });
      } else {
        // Reset normal si no hay cliente inicial
        setFormData({ clientName: '', clientEmail: '', clientPhone: '', eventType: 'Cumpleaños', eventDate: '', guestCount: '', price: '' });
      }
      setPhoneError('');
      setEmailError('');
    }
  }, [isOpen, initialClient]); 

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones (Igual que antes) ...
    if (!formData.clientName || !formData.eventDate || !formData.price) {
      alert("Por favor completa los campos obligatorios (*)");
      return;
    }
    // ... (Validaciones de regex phone/email se mantienen igual) ...

    try {
      setLoading(true);

      let clientId = null;

      // ✅ OPTIMIZACIÓN: Si ya tenemos initialClient, usamos su ID directamente
      if (initialClient) {
        clientId = initialClient.id;
      } else {
        // Lógica original de búsqueda/creación si no viene pre-seleccionado
        if (formData.clientEmail) {
          const { data: existingClient } = await supabase
            .from('clients')
            .select('id')
            .eq('email', formData.clientEmail)
            .maybeSingle();
          if (existingClient) clientId = existingClient.id;
        }

        if (!clientId) {
           // ... (Código de creación de cliente nuevo igual que antes) ...
           const newClientData = {
             name: formData.clientName,
             email: formData.clientEmail || '',
             phone: formData.clientPhone,
             total_events: 1,
             total_spent: 0
           };
           const { data: newClient, error: clientError } = await supabase.from('clients').insert(newClientData).select().single();
           if (clientError) throw clientError;
           clientId = newClient.id;
        }
      }

      // ... (Creación de Cotización y Evento se mantienen igual) ...
      // Para brevedad, el código de inserción de quotes y events es idéntico al anterior,
      // solo asegúrate de usar la variable 'clientId' que ya resolvimos arriba.

      // 3. Crear Cotización
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
          admin_notes: initialClient 
            ? `[Sistema]: Evento creado desde el perfil del cliente.`
            : `[Sistema]: Evento creado manualmente desde Calendario.`,
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

      onCreated();
      onClose();

    } catch (error: any) {
      console.error(error);
      alert(`Error al crear: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSuccess = () => onClose();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      {/* z-[60] para asegurarse que quede encima del otro modal si se abren en cascada */}
      <div className="absolute inset-0 bg-secondary-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 border-b bg-secondary-50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-secondary-900 flex items-center gap-2">
            <CalendarPlus className="w-5 h-5 text-primary-600"/> 
            {initialClient ? `Nuevo Evento para ${initialClient.name}` : 'Nuevo Evento Manual'}
          </h2>
          <button onClick={onClose}><X className="w-5 h-5 text-secondary-400 hover:text-secondary-600"/></button>
        </div>

        {/* ... (Resto del formulario igual que antes, usando formData) ... */}
        {/* Solo asegúrate de que los inputs tengan value={formData...} y onChange correcto */}
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
             {/* ... inputs ... */}
             {/* Un detalle: Si initialClient existe, podrías deshabilitar el nombre/email para que no lo cambien por error, o dejarlos editables. */}
             <div className="space-y-3">
                <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-wider flex items-center gap-2"><User className="w-3 h-3"/> Cliente</h3>
                <input required type="text" placeholder="Nombre" className="w-full p-2.5 border rounded-lg text-sm bg-gray-50" value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} disabled={!!initialClient} /> 
                {/* He puesto disabled={!!initialClient} como opción segura, puedes quitarlo si prefieres editar */}
                
                <div className="grid grid-cols-2 gap-4">
                   <input type="email" placeholder="Email" className="w-full p-2.5 border rounded-lg text-sm bg-gray-50" value={formData.clientEmail} onChange={e => setFormData({...formData, clientEmail: e.target.value})} disabled={!!initialClient} />
                   <input type="tel" placeholder="Teléfono" className="w-full p-2.5 border rounded-lg text-sm" value={formData.clientPhone} onChange={e => setFormData({...formData, clientPhone: e.target.value})} />
                </div>
             </div>

             {/* ... Resto de inputs de Detalles (Fecha, Tipo, Invitados, Precio) IGUAL QUE ANTES ... */}
             <div className="space-y-3 pt-6 border-t border-secondary-100">
                <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-wider flex items-center gap-2"><Calendar className="w-3 h-3"/> Detalles</h3>
                {/* ... Inputs de fecha, tipo, invitados, presupuesto ... */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-secondary-500 mb-1 block">Fecha *</label>
                    <input required type="date" min={new Date().toISOString().split('T')[0]} className="w-full p-2.5 border border-secondary-200 rounded-lg text-sm" value={formData.eventDate} onChange={e => setFormData({...formData, eventDate: e.target.value})} />
                  </div>
                  {/* ... resto de inputs ... */}
                  <div>
                    <label className="text-xs text-secondary-500 mb-1 block">Tipo</label>
                    <select className="w-full p-2.5 border rounded-lg text-sm bg-white" value={formData.eventType} onChange={e => setFormData({...formData, eventType: e.target.value})}>
                      <option>Boda</option><option>Cumpleaños</option><option>Corporativo</option><option>Graduación</option><option>Privado</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <input required type="number" placeholder="Invitados" className="w-full p-2.5 border rounded-lg text-sm" value={formData.guestCount} onChange={e => setFormData({...formData, guestCount: e.target.value})} />
                   <input required type="number" placeholder="Precio" className="w-full p-2.5 border rounded-lg text-sm" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                </div>
             </div>

             <div className="pt-6">
                <button type="submit" disabled={loading} className="w-full py-3 bg-secondary-900 text-white rounded-lg font-bold hover:bg-secondary-800 transition-all flex justify-center gap-2">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : "Crear Evento"}
                </button>
             </div>
        </form>
      </div>
    </div>
  );
}