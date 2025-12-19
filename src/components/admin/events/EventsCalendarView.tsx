import { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer, type View, type ToolbarProps } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, Filter, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Event, EventStatus } from '@/types';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { EventDetailModal } from './EventDetailModal';
import { CreateManualEventModal } from './CreateManualEventModal';
import { useUserRole } from '@/hooks/useUserRole'; 

// ... (Configuración de locales y tipos internos se mantienen igual)
const locales = { 'es': es };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status: EventStatus;
  resource: Event;
}

const STATUS_COLORS: Record<EventStatus, string> = {
  pending: '#EAB308',
  confirmed: '#16A34A',
  completed: '#2563EB',
  cancelled: '#DC2626',
};

const STATUS_TRANSLATIONS: Record<EventStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

// ✅ Componente Toolbar extraído (Se mantiene igual)
const CustomToolbar = (props: ToolbarProps) => {
  return (
    <div className="rbc-toolbar mb-4 flex flex-col md:flex-row gap-4 items-center justify-between">
      <span className="rbc-btn-group shadow-sm rounded-lg overflow-hidden">
        <button type="button" onClick={() => props.onNavigate('PREV')} className="px-3 py-1.5 bg-white hover:bg-secondary-50 text-secondary-600 border-r text-sm">Anterior</button>
        <button type="button" onClick={() => props.onNavigate('TODAY')} className="px-3 py-1.5 bg-secondary-50 font-semibold text-secondary-900 border-r text-sm">Hoy</button>
        <button type="button" onClick={() => props.onNavigate('NEXT')} className="px-3 py-1.5 bg-white hover:bg-secondary-50 text-secondary-600 text-sm">Siguiente</button>
      </span>
      
      <span className="rbc-toolbar-label font-display font-bold text-xl text-secondary-900 capitalize">
        {props.label}
      </span>

      <span className="rbc-btn-group shadow-sm rounded-lg overflow-hidden">
        <button type="button" onClick={() => props.onView('month')} className={`px-3 py-1.5 text-sm ${props.view === 'month' ? 'bg-primary-500 text-white' : 'bg-white text-secondary-600 hover:bg-secondary-50'}`}>Mes</button>
        <button type="button" onClick={() => props.onView('week')} className={`px-3 py-1.5 text-sm ${props.view === 'week' ? 'bg-primary-500 text-white' : 'bg-white text-secondary-600 hover:bg-secondary-50'}`}>Semana</button>
        <button type="button" onClick={() => props.onView('agenda')} className={`px-3 py-1.5 text-sm ${props.view === 'agenda' ? 'bg-primary-500 text-white' : 'bg-white text-secondary-600 hover:bg-secondary-50'}`}>Agenda</button>
      </span>
    </div>
  );
};

// ✅ DEFINICIÓN DE PROPS: Agregamos showHeader opcional
interface EventsCalendarViewProps {
  showHeader?: boolean;
}

export function EventsCalendarView({ showHeader = true }: EventsCalendarViewProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('month');

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { role } = useUserRole();
  const isOperations = role === 'operations';

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('events').select(`*, client:clients ( name )`);
      if (error) throw error;

      if (data) {
        // Obtenemos "Hoy" a las 00:00:00 para comparar solo fechas puras
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const formattedEvents: CalendarEvent[] = data.map((evt: any) => {
          const dateStr = evt.event_date; // YYYY-MM-DD
          const timeStr = evt.event_time || '12:00:00';
          
          // Construimos fechas
          const start = new Date(`${dateStr}T${timeStr}`);
          const end = new Date(start.getTime() + (5 * 60 * 60 * 1000));
          
          // Crear objeto fecha del evento a medianoche para comparar con 'today'
          // Usamos la cadena YYYY-MM-DD para evitar problemas de zona horaria con las horas
          const eventDateObj = new Date(`${dateStr}T00:00:00`);

          // ✅ LÓGICA DE ESTADO DINÁMICO
          // Si el estado es 'confirmed' Y la fecha del evento es estrictamente MENOR que hoy
          // entonces visualmente es 'completed'.
          // (Si es igual a hoy, eventDateObj < today será falso, así que se mantiene verde).
          let displayStatus = evt.status;
          
          if (displayStatus === 'confirmed' && eventDateObj < today) {
            displayStatus = 'completed';
          }

          return {
            id: evt.id,
            title: `${evt.event_type} - ${evt.client?.name || 'Cliente'}`,
            start,
            end,
            status: displayStatus as EventStatus, // Forzamos el tipo visual
            resource: evt,
          };
        });
        setEvents(formattedEvents);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSelectEvent = (calendarEvent: CalendarEvent) => {
    setSelectedEvent(calendarEvent.resource);
    setIsDetailOpen(true);
  };

  const handleEventUpdated = () => {
    fetchEvents();
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    const backgroundColor = STATUS_COLORS[event.status] || '#6B7280';
    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '0.75rem',
        fontWeight: '600',
        cursor: 'pointer'
      }
    };
  };

  if (loading) return <div className="flex justify-center items-center h-96 bg-white rounded-xl border border-secondary-200"><Loader2 className="w-8 h-8 text-primary-500 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      
      {/* ✅ RENDERIZADO CONDICIONAL DEL HEADER (LEYENDA Y BOTÓN) */}
      {showHeader && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-secondary-200 shadow-sm">
          <div className="flex flex-wrap gap-4">
            <span className="text-sm font-medium text-secondary-500 flex items-center gap-2">
              <Filter className="w-4 h-4" /> Estados:
            </span>
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <div key={status} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></span>
                <span className="text-xs text-secondary-600 capitalize">
                  {STATUS_TRANSLATIONS[status as EventStatus]}
                </span>
              </div>
            ))}
          </div>
          
          {!isOperations && (
            <button 
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2 bg-secondary-900 text-white text-sm font-bold rounded-lg shadow hover:bg-secondary-800 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Nuevo Evento Manual
            </button>
          )}
        </div>
      )}

      {/* Calendario */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-secondary-200 h-[700px]">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          culture="es"
          messages={{ next: "Siguiente", previous: "Anterior", today: "Hoy", month: "Mes", week: "Semana", day: "Día", agenda: "Agenda", date: "Fecha", time: "Hora", event: "Evento", noEventsInRange: "No hay eventos." }}
          eventPropGetter={eventStyleGetter}
          onView={(newView: View) => setView(newView)}
          view={view}
          onSelectEvent={handleSelectEvent}
          components={{ toolbar: CustomToolbar }}
        />
      </div>

      <EventDetailModal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} event={selectedEvent} onUpdate={handleEventUpdated} />
      <CreateManualEventModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreated={handleEventUpdated} />
    </div>
  );
}