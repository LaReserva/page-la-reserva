import { useState, useEffect, Fragment } from 'react';
import { Calendar, dateFnsLocalizer, type View, type ToolbarProps } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Loader2, 
  Filter, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  Calendar as CalendarIcon,
  Check
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Event, EventStatus } from '@/types';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { EventDetailModal } from './EventDetailModal';
import { CreateManualEventModal } from './CreateManualEventModal';
import { useUserRole } from '@/hooks/useUserRole'; 

// ✅ HEADLESS UI IMPORTS
import { Listbox, Transition } from '@headlessui/react';
import { cn } from '@/utils/utils'; // Asumiendo que tienes una utilidad 'cn' para clases, si no, usa template literals

const locales = { 'es': es };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

// ==========================================
// CONFIGURACIÓN DE TIPOS Y ESTADOS
// ==========================================

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status: EventStatus;
  resource: Event;
}

const STATUS_COLORS: Record<EventStatus, string> = {
  pending: '#EAB308',   // Yellow-500
  confirmed: '#16A34A', // Green-600
  completed: '#2563EB', // Blue-600
  cancelled: '#DC2626', // Red-600
};

const STATUS_TRANSLATIONS: Record<EventStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

const VIEW_OPTIONS: { id: View; label: string }[] = [
  { id: 'month', label: 'Vista Mensual' },
  { id: 'week', label: 'Vista Semanal' },
  { id: 'agenda', label: 'Agenda / Lista' },
];

// ==========================================
// COMPONENTES AUXILIARES UI
// ==========================================

/**
 * Toolbar Personalizado con Headless UI Listbox
 */
const CustomToolbar = (props: ToolbarProps) => {
  const currentView = VIEW_OPTIONS.find(v => v.id === props.view) || VIEW_OPTIONS[0];

  return (
    <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6 pb-6 border-b border-secondary-100">
      
      {/* 1. Navegación e Info de Fecha */}
      <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
        <div className="flex items-center bg-white rounded-lg border border-secondary-200 shadow-sm p-1">
          <button 
            type="button" 
            onClick={() => props.onNavigate('PREV')} 
            className="p-1.5 text-secondary-500 hover:text-primary-600 hover:bg-secondary-50 rounded-md transition-colors"
            title="Anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            type="button" 
            onClick={() => props.onNavigate('TODAY')} 
            className="px-3 py-1 text-xs font-bold text-secondary-700 hover:bg-secondary-50 rounded-md transition-colors uppercase tracking-wider"
          >
            Hoy
          </button>
          <button 
            type="button" 
            onClick={() => props.onNavigate('NEXT')} 
            className="p-1.5 text-secondary-500 hover:text-primary-600 hover:bg-secondary-50 rounded-md transition-colors"
            title="Siguiente"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <h2 className="text-xl font-display font-bold text-secondary-900 capitalize min-w-[150px]">
          {props.label}
        </h2>
      </div>

      {/* 2. Selector de Vista (Headless UI Listbox) */}
      <div className="w-full md:w-56 relative z-20">
        <Listbox value={props.view} onChange={(val) => props.onView(val as View)}>
          <div className="relative mt-1">
            <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-white py-2.5 pl-4 pr-10 text-left border border-secondary-200 shadow-sm focus:outline-none focus-visible:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500/20 sm:text-sm transition-all hover:border-secondary-300">
              <span className="block truncate font-medium text-secondary-700">{currentView.label}</span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronDown className="h-4 w-4 text-secondary-400" aria-hidden="true" />
              </span>
            </Listbox.Button>
            
            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-50">
                {VIEW_OPTIONS.map((viewOption) => (
                  <Listbox.Option
                    key={viewOption.id}
                    className={({ active }) =>
                      cn(
                        "relative cursor-pointer select-none py-2.5 pl-10 pr-4 transition-colors",
                        active ? "bg-secondary-50 text-primary-700" : "text-secondary-900"
                      )
                    }
                    value={viewOption.id}
                  >
                    {({ selected }) => (
                      <>
                        <span className={cn("block truncate", selected ? "font-bold" : "font-normal")}>
                          {viewOption.label}
                        </span>
                        {selected ? (
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-600">
                            <Check className="h-4 w-4" aria-hidden="true" />
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
  );
};

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

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
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const formattedEvents: CalendarEvent[] = data.map((evt: any) => {
          const dateStr = evt.event_date;
          const timeStr = evt.event_time || '12:00:00';
          
          const start = new Date(`${dateStr}T${timeStr}`);
          const end = new Date(start.getTime() + (5 * 60 * 60 * 1000));
          const eventDateObj = new Date(`${dateStr}T00:00:00`);

          let displayStatus = evt.status;
          if (displayStatus === 'confirmed' && eventDateObj < today) {
            displayStatus = 'completed';
          }

          return {
            id: evt.id,
            title: `${evt.event_type} - ${evt.client?.name || 'Cliente'}`,
            start,
            end,
            status: displayStatus as EventStatus,
            resource: evt,
          };
        });
        setEvents(formattedEvents);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      // Pequeño delay artificial para que la transición se aprecie si la carga es muy rápida
      setTimeout(() => setLoading(false), 300);
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
        borderRadius: '4px',
        opacity: 0.95,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '0.75rem',
        fontWeight: '500',
        cursor: 'pointer',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
      }
    };
  };

  return (
    <div className="space-y-6">
      
      {/* Header / Leyenda */}
      {showHeader && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-secondary-200 shadow-sm">
          <div className="flex flex-wrap gap-4 items-center">
            <span className="text-sm font-medium text-secondary-900 flex items-center gap-2 bg-secondary-50 px-3 py-1.5 rounded-lg border border-secondary-100">
              <Filter className="w-4 h-4 text-secondary-500" /> 
              Filtros
            </span>
            <div className="flex gap-3 flex-wrap">
              {Object.entries(STATUS_COLORS).map(([status, color]) => (
                <div key={status} className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-secondary-50 transition-colors cursor-help" title={`Eventos ${STATUS_TRANSLATIONS[status as EventStatus]}`}>
                  <span className="w-2.5 h-2.5 rounded-full ring-1 ring-inset ring-black/10" style={{ backgroundColor: color }}></span>
                  <span className="text-xs font-medium text-secondary-600 capitalize">
                    {STATUS_TRANSLATIONS[status as EventStatus]}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {!isOperations && (
            <button 
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-secondary-900 hover:bg-black text-white text-sm font-bold rounded-xl shadow-lg shadow-secondary-900/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" /> 
              <span>Nuevo Evento</span>
            </button>
          )}
        </div>
      )}

      {/* Contenedor del Calendario con Transición de Carga */}
      <div className="relative bg-white p-6 rounded-xl shadow-sm border border-secondary-200 min-h-[700px]">
        
        {/* Loading Overlay */}
        <Transition
          show={loading}
          as={Fragment}
          leave="transition ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-xl">
            <Loader2 className="w-10 h-10 text-primary-500 animate-spin mb-3" />
            <p className="text-sm font-medium text-secondary-500 animate-pulse">Cargando calendario...</p>
          </div>
        </Transition>

        {/* Calendar Component - Solo visible (opacity) cuando no carga para evitar salto de layout */}
        <div className={cn("h-[700px] transition-opacity duration-500", loading ? "opacity-0" : "opacity-100")}>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            culture="es"
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
            onView={(newView: View) => setView(newView)}
            view={view}
            onSelectEvent={handleSelectEvent}
            components={{ toolbar: CustomToolbar }}
          />
        </div>
      </div>

      <EventDetailModal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} event={selectedEvent} onUpdate={handleEventUpdated} />
      <CreateManualEventModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreated={handleEventUpdated} />
    </div>
  );
}