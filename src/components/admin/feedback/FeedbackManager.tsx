import { useState, useEffect } from 'react';
import { Switch, Tab } from '@headlessui/react';
import { 
  MessageCircle, Star, Calendar, User, 
  CheckCircle2, ExternalLink, Loader2, Filter
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useUserRole } from '@/hooks/useUserRole'; // Tu hook existente
import { cn } from '@/utils/utils';

// Tipos auxiliares
type EventWithReview = {
  id: string;
  client_name: string; // Asumiendo que viene de join o es campo plano
  client_phone: string;
  event_type: string;
  event_date: string;
  testimonial?: {
    id: string;
    rating: number;
    comment: string;
    approved: boolean;
    created_at: string;
  } | null;
};

export function FeedbackManager() {
  const { isSuperAdmin } = useUserRole();
  const [events, setEvents] = useState<EventWithReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0); // 0: Por Solicitar, 1: Recibidos

  useEffect(() => {
    fetchPastEvents();
  }, []);

  const fetchPastEvents = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];

    // 1. Traemos eventos pasados Y sus clientes
    const { data: eventsData, error } = await supabase
      .from('events')
      .select(`
        id, event_type, event_date,
        client:clients ( name, phone )
      `)
      .lt('event_date', today) // Solo eventos pasados
      .order('event_date', { ascending: false });

    if (error || !eventsData) {
      console.error(error);
      setLoading(false);
      return;
    }

    // 2. Traemos todos los testimonios existentes
    const { data: reviewsData } = await supabase
      .from('testimonials')
      .select('*');

    // 3. Combinamos la data
    const formatted: EventWithReview[] = eventsData.map((evt: any) => {
      const review = reviewsData?.find((r: any) => r.event_id === evt.id);
      return {
        id: evt.id,
        client_name: evt.client?.name || 'Cliente Desconocido',
        client_phone: evt.client?.phone || '',
        event_type: evt.event_type,
        event_date: evt.event_date,
        testimonial: review || null
      };
    });

    setEvents(formatted);
    setLoading(false);
  };

  const handleToggleApproval = async (reviewId: string, currentStatus: boolean) => {
    if (!isSuperAdmin) return; // Seguridad extra en frontend

    // Optimistic Update
    setEvents(prev => prev.map(evt => {
      if (evt.testimonial?.id === reviewId) {
        return { 
          ...evt, 
          testimonial: { ...evt.testimonial, approved: !currentStatus } 
        };
      }
      return evt;
    }));

    // DB Update
    await supabase.from('testimonials').update({ approved: !currentStatus }).eq('id', reviewId);
  };

  const generateWhatsAppLink = (evt: EventWithReview) => {
    if (!evt.client_phone) return '#';
    
    // URL Pública donde está el form (Ajusta tu dominio en producción)
    const feedbackUrl = `https://lareservabartending.com/feedback/${evt.id}`;
    
    const message = `Hola ${evt.client_name.split(' ')[0]}! Esperamos que hayas disfrutado del servicio de La Reserva. ⭐\n\nNos encantaría conocer tu opinión, te tomará menos de 1 minuto:\n${feedbackUrl}`;
    
    return `https://wa.me/51${evt.client_phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
  };

  // Filtros
  const pendingRequest = events.filter(e => !e.testimonial);
  const receivedReviews = events.filter(e => e.testimonial);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 text-secondary-400 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      
      {/* Header Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-secondary-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-secondary-500 uppercase font-bold">Eventos Pasados</p>
            <p className="text-2xl font-display font-bold text-secondary-900">{events.length}</p>
          </div>
          <Calendar className="text-secondary-300 w-8 h-8"/>
        </div>
        <div className="bg-white p-4 rounded-xl border border-secondary-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-secondary-500 uppercase font-bold">Reseñas Recibidas</p>
            <p className="text-2xl font-display font-bold text-green-600">{receivedReviews.length}</p>
          </div>
          <Star className="text-green-200 w-8 h-8 fill-green-100"/>
        </div>
        <div className="bg-white p-4 rounded-xl border border-secondary-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-secondary-500 uppercase font-bold">Por Solicitar</p>
            <p className="text-2xl font-display font-bold text-orange-500">{pendingRequest.length}</p>
          </div>
          <MessageCircle className="text-orange-200 w-8 h-8"/>
        </div>
      </div>

      {/* Tabs y Listas */}
      <Tab.Group selectedIndex={selectedIndex} onChange={setSelectedIndex}>
        <Tab.List className="flex space-x-1 rounded-xl bg-secondary-100/50 p-1 max-w-md">
          <Tab className={({ selected }) =>
            cn("w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all outline-none",
            selected ? "bg-white text-secondary-900 shadow" : "text-secondary-500 hover:bg-white/[0.12] hover:text-secondary-700")
          }>
            Pendientes ({pendingRequest.length})
          </Tab>
          <Tab className={({ selected }) =>
            cn("w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all outline-none",
            selected ? "bg-white text-secondary-900 shadow" : "text-secondary-500 hover:bg-white/[0.12] hover:text-secondary-700")
          }>
            Reseñas ({receivedReviews.length})
          </Tab>
        </Tab.List>

        <Tab.Panels className="mt-6">
          
          {/* PANEL 1: Pendientes de Solicitar */}
          <Tab.Panel className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4">
            {pendingRequest.length === 0 && <p className="text-secondary-500 col-span-full text-center py-10">¡Estás al día! No hay eventos pendientes de reseña.</p>}
            
            {pendingRequest.map((evt) => (
              <div key={evt.id} className="bg-white p-5 rounded-xl border border-secondary-200 shadow-sm flex flex-col justify-between h-full">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold bg-secondary-100 text-secondary-600 px-2 py-1 rounded uppercase tracking-wider">{evt.event_type}</span>
                    <span className="text-xs text-secondary-400">{new Date(evt.event_date).toLocaleDateString()}</span>
                  </div>
                  <h3 className="font-bold text-secondary-900 text-lg mb-1">{evt.client_name}</h3>
                  <p className="text-sm text-secondary-500 mb-4">{evt.client_phone || 'Sin teléfono'}</p>
                </div>
                
                <a 
                  href={generateWhatsAppLink(evt)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex items-center justify-center gap-2 w-full py-2.5 rounded-lg font-bold text-sm transition-colors",
                    evt.client_phone 
                      ? "bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg" 
                      : "bg-secondary-200 text-secondary-400 cursor-not-allowed"
                  )}
                  onClick={(e) => !evt.client_phone && e.preventDefault()}
                >
                  <MessageCircle className="w-4 h-4" />
                  Solicitar Feedback
                </a>
              </div>
            ))}
          </Tab.Panel>

          {/* PANEL 2: Reseñas Recibidas */}
          <Tab.Panel className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
            {receivedReviews.length === 0 && <p className="text-secondary-500 col-span-full text-center py-10">Aún no has recibido reseñas.</p>}

            {receivedReviews.map((evt) => (
              <div key={evt.id} className="bg-white rounded-xl border border-secondary-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
                
                {/* Lado Izquierdo: Info Evento */}
                <div className="bg-secondary-50 p-5 md:w-1/3 border-r border-secondary-100 flex flex-col justify-center">
                  <div className="mb-3">
                    <h4 className="font-bold text-secondary-900">{evt.client_name}</h4>
                    <p className="text-xs text-secondary-500">{evt.event_type}</p>
                    <p className="text-xs text-secondary-400 mt-1">{new Date(evt.event_date).toLocaleDateString()}</p>
                  </div>
                  
                  {/* Switch de Aprobación */}
                  <div className="mt-auto pt-4 border-t border-secondary-200">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase font-bold text-secondary-500">
                        {evt.testimonial?.approved ? 'Visible Web' : 'Oculto'}
                      </span>
                      {isSuperAdmin ? (
                        <Switch
                          checked={evt.testimonial?.approved || false}
                          onChange={() => evt.testimonial && handleToggleApproval(evt.testimonial.id, evt.testimonial.approved)}
                          className={cn(
                            evt.testimonial?.approved ? 'bg-primary-600' : 'bg-secondary-300',
                            'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none'
                          )}
                        >
                          <span
                            aria-hidden="true"
                            className={cn(
                              evt.testimonial?.approved ? 'translate-x-4' : 'translate-x-0',
                              'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
                            )}
                          />
                        </Switch>
                      ) : (
                        <span className="text-xs bg-secondary-200 text-secondary-500 px-2 py-0.5 rounded">Solo Admin</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lado Derecho: La Reseña */}
                <div className="p-5 md:w-2/3 flex flex-col">
                  <div className="flex gap-1 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={cn("w-4 h-4", i < (evt.testimonial?.rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-secondary-200")} 
                      />
                    ))}
                  </div>
                  <div className="flex-grow">
                    <p className="text-secondary-700 text-sm italic leading-relaxed">
                      "{evt.testimonial?.comment}"
                    </p>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <p className="text-xs text-secondary-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Recibido el {new Date(evt.testimonial?.created_at!).toLocaleDateString()}
                    </p>
                  </div>
                </div>

              </div>
            ))}
          </Tab.Panel>

        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}