import { useState } from 'react';
import { Search, Calculator, Calendar, Users, ChevronRight } from 'lucide-react';
import type { Event } from '@/types';

interface EventSelectorProps {
  events: Event[];
  selectedEventId: string | 'free' | null;
  onSelect: (event: Event | null) => void;
  onToggleFreeMode: () => void;
  isFreeMode: boolean;
}

export function EventSelector({ events, selectedEventId, onSelect, onToggleFreeMode, isFreeMode }: EventSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEvents = events.filter(e => 
    e.event_type.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.event_date.includes(searchTerm) ||
    e.client_id?.toLowerCase().includes(searchTerm.toLowerCase()) // Si tuvieras nombre de cliente aquí sería ideal
  );

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      
      {/* Header del Selector */}
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
            placeholder="Buscar evento..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-100 outline-none transition-all"
          />
        </div>
      </div>

      {/* Lista de Eventos */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <div className="text-[10px] font-bold text-gray-400 uppercase px-2 py-1 tracking-wider">
          Eventos Confirmados
        </div>
        
        {filteredEvents.length === 0 ? (
          <div className="p-4 text-center text-xs text-gray-400">No se encontraron eventos.</div>
        ) : (
          filteredEvents.map(event => (
            <button
              key={event.id}
              onClick={() => onSelect(event)}
              className={`w-full text-left p-3 rounded-xl transition-all border group relative ${
                selectedEventId === event.id
                  ? 'bg-blue-50 border-blue-200 shadow-sm'
                  : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${selectedEventId === event.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                  {event.event_type}
                </span>
                <span className="text-[10px] text-gray-400 font-mono">{event.event_date.slice(5)}</span>
              </div>
              
              <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                <span className="flex items-center gap-1"><Users size={12}/> {event.guest_count}</span>
                {/* Indicador visual si está seleccionado */}
                {selectedEventId === event.id && (
                  <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500"/>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}