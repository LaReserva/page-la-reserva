import { useState, useMemo } from 'react';
import { Search, Calculator, Users, ChevronRight, CalendarDays } from 'lucide-react';
import type { Event } from '@/types';

// 1. EXTENSIÓN DE TIPO LOCAL (Solución al error de TS)
// Esto permite manejar el nombre del cliente tanto si viene plano (client_name) 
// como si viene de un JOIN de Supabase (clients.name)
interface EventWithData extends Event {
  client_name?: string;
  clients?: { name: string };
}

interface EventSelectorProps {
  events: Event[];
  selectedEventId: string | 'free' | null;
  onSelect: (event: Event | null) => void;
  onToggleFreeMode: () => void;
  isFreeMode: boolean;
}

export function EventSelector({ events, selectedEventId, onSelect, onToggleFreeMode, isFreeMode }: EventSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const monthName = currentDate.toLocaleString('es-ES', { month: 'long' });

  const filteredEvents = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return events.filter(e => {
      // Casteamos 'e' a nuestro tipo extendido para leer el nombre sin error
      const eventData = e as EventWithData;
      const clientName = eventData.client_name || eventData.clients?.name || '';

      // 1. Si HAY búsqueda: Buscamos globalmente
      if (term.length > 0) {
        return (
          clientName.toLowerCase().includes(term) ||
          e.event_type.toLowerCase().includes(term) ||
          e.event_date.includes(term)
        );
      }

      // 2. Si NO hay búsqueda: Filtramos MES ACTUAL
      const eventDate = new Date(e.event_date + 'T00:00:00');
      return (
        eventDate.getMonth() === currentMonth &&
        eventDate.getFullYear() === currentYear
      );
    });
  }, [events, searchTerm, currentMonth, currentYear]);

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gray-50 space-y-3">
        <button 
          onClick={onToggleFreeMode} 
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all shadow-sm ${
            isFreeMode 
              ? 'bg-gray-800 text-white ring-2 ring-gray-900 ring-offset-2' 
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Calculator size={18}/>
          {isFreeMode ? 'Modo Manual Activo' : 'Activar Modo Manual'}
        </button>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Buscar por cliente, fecha..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        <div className="flex justify-between items-center px-2 py-2">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            {searchTerm ? 'Resultados de Búsqueda' : `Eventos de ${monthName}`}
            </div>
            {!searchTerm && (
                <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                    Mes Actual
                </span>
            )}
        </div>
        
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400 space-y-2">
            <CalendarDays size={32} className="opacity-20"/>
            <p className="text-xs">
                {searchTerm ? 'No se encontraron coincidencias' : 'Sin eventos este mes'}
            </p>
          </div>
        ) : (
          filteredEvents.map(event => {
            // Casteamos también aquí para el renderizado
            const eventData = event as EventWithData;
            const clientNameDisplay = eventData.client_name || eventData.clients?.name || 'Cliente sin nombre';

            return (
              <button
                key={event.id}
                onClick={() => onSelect(event)}
                className={`w-full text-left p-3 rounded-xl transition-all border group relative ${
                  selectedEventId === event.id
                    ? 'bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-100'
                    : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide ${
                      selectedEventId === event.id ? 'bg-blue-200 text-blue-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {event.event_type}
                  </span>
                  <span className={`text-[10px] font-mono ${selectedEventId === event.id ? 'text-blue-600' : 'text-gray-400'}`}>
                      {event.event_date}
                  </span>
                </div>
                
                {/* Nombre del Cliente CORREGIDO */}
                <div className="mb-2 pr-4">
                    <h4 className={`text-sm font-bold truncate ${selectedEventId === event.id ? 'text-blue-900' : 'text-gray-800'}`}>
                        {clientNameDisplay}
                    </h4>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                      <Users size={12} className="text-gray-400"/> 
                      <span className="font-medium">{event.guest_count}</span>
                  </span>
                  
                  {selectedEventId === event.id && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-500 p-1 rounded-full animate-in fade-in zoom-in duration-200">
                      <ChevronRight size={14} className="text-white"/>
                    </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}