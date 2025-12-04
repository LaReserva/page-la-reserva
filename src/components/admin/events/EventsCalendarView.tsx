import { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer, type View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Event, EventStatus } from '@/types';
import 'react-big-calendar/lib/css/react-big-calendar.css'; // Estilos base del calendario

// 1. Configuración de Localización (Español)
const locales = {
  'es': es,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// 2. Tipo interno para el Calendario
interface CalendarEvent {
  id: string;
  title: string; // "Boda - Juan Pérez"
  start: Date;
  end: Date;
  status: EventStatus;
  resource: Event; // Guardamos el objeto original por si acaso
}

// 3. Configuración de Colores por Estado
const STATUS_COLORS: Record<EventStatus, string> = {
  pending: '#EAB308',   // Amarillo (Warning)
  confirmed: '#16A34A', // Verde (Success)
  completed: '#2563EB', // Azul (Primary)
  cancelled: '#DC2626', // Rojo (Danger)
};

export function EventsCalendarView() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('month');

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      setLoading(true);
      // Traemos eventos y el nombre del cliente (join)
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          client:clients ( name )
        `);

      if (error) throw error;

      if (data) {
        // Transformamos los datos de Supabase al formato del Calendario
        const formattedEvents: CalendarEvent[] = data.map((evt: any) => {
          // Construir fecha de inicio
          const dateStr = evt.event_date; // "2025-10-15"
          const timeStr = evt.event_time || '12:00:00'; // "19:00:00"
          
          // Crear objetos Date
          const start = new Date(`${dateStr}T${timeStr}`);
          
          // Asumimos duración de 5 horas por defecto para visualización
          const end = new Date(start.getTime() + (5 * 60 * 60 * 1000));

          return {
            id: evt.id,
            title: `${evt.event_type} - ${evt.client?.name || 'Cliente'}`,
            start,
            end,
            status: evt.status,
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

  // Estilos personalizados para los eventos en el calendario
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
        fontWeight: '600'
      }
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96 bg-white rounded-xl border border-secondary-200">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Leyenda de Colores */}
      <div className="flex flex-wrap gap-4 bg-white p-4 rounded-xl border border-secondary-200 shadow-sm">
        <span className="text-sm font-medium text-secondary-500 flex items-center gap-2">
          <Filter className="w-4 h-4" /> Estados:
        </span>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></span>
            <span className="text-xs text-secondary-600 capitalize">{status}</span>
          </div>
        ))}
      </div>

      {/* Calendario */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-secondary-200 h-[700px]">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          culture="es" // Forzar español
          messages={{
            next: "Siguiente",
            previous: "Anterior",
            today: "Hoy",
            month: "Mes",
            week: "Semana",
            day: "Día",
            agenda: "Agenda",
            date: "Fecha",
            time: "Hora",
            event: "Evento",
            noEventsInRange: "No hay eventos en este rango."
          }}
          eventPropGetter={eventStyleGetter}
          onView={(newView) => setView(newView)}
          view={view}
          // Personalización de componentes (opcional)
          components={{
            toolbar: (props) => (
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
                  <button type="button" onClick={() => props.onView('month')} className={`px-3 py-1.5 text-sm ${view === 'month' ? 'bg-primary-500 text-white' : 'bg-white text-secondary-600 hover:bg-secondary-50'}`}>Mes</button>
                  <button type="button" onClick={() => props.onView('week')} className={`px-3 py-1.5 text-sm ${view === 'week' ? 'bg-primary-500 text-white' : 'bg-white text-secondary-600 hover:bg-secondary-50'}`}>Semana</button>
                  <button type="button" onClick={() => props.onView('agenda')} className={`px-3 py-1.5 text-sm ${view === 'agenda' ? 'bg-primary-500 text-white' : 'bg-white text-secondary-600 hover:bg-secondary-50'}`}>Agenda</button>
                </span>
              </div>
            )
          }}
        />
      </div>
    </div>
  );
}