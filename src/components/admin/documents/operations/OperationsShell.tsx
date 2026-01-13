import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Event } from '@/types';

import { EventSelector } from './EventSelector';
import { CalculatorManager } from './CalculatorManager';

export function OperationsShell({ userRole }: { userRole: string }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isFreeMode, setIsFreeMode] = useState(false);
  
  // Mobile Sidebar State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    const { data } = await supabase
      .from('events')
      .select('*')
      .in('status', ['confirmed', 'completed']) // Solo eventos relevantes
      .order('event_date', { ascending: false });
    if (data) setEvents(data);
  }

  const handleEventSelect = (event: Event | null) => {
    setIsFreeMode(false);
    setSelectedEvent(event);
    setIsMobileMenuOpen(false); // Cerrar menú en móvil
  };

  const handleToggleFreeMode = () => {
    setIsFreeMode(true);
    setSelectedEvent(null);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex flex-col md:flex-row h-full relative overflow-hidden">
      
      {/* Botón Hamburguesa Móvil */}
      <div className="md:hidden p-4 border-b border-gray-200 bg-white flex justify-between items-center flex-none">
        <span className="font-bold text-gray-700">Menú de Eventos</span>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 bg-gray-100 rounded-lg">
          {isMobileMenuOpen ? <X size={20}/> : <Menu size={20}/>}
        </button>
      </div>

      {/* Sidebar: Selector de Eventos */}
      <aside className={`
        absolute inset-0 z-20 bg-white md:static md:w-72 border-r border-gray-200 flex-col transition-transform duration-300 md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0 flex' : '-translate-x-full md:flex hidden'}
      `}>
         <div className="md:hidden flex justify-end p-2"><button onClick={() => setIsMobileMenuOpen(false)}><X className="text-gray-400"/></button></div>
         
         <EventSelector 
            events={events} 
            selectedEventId={isFreeMode ? 'free' : selectedEvent?.id || null} 
            onSelect={handleEventSelect}
            onToggleFreeMode={handleToggleFreeMode}
            isFreeMode={isFreeMode}
         />
      </aside>

      {/* ✅ CORRECCIÓN AQUÍ: 'overflow-y-auto' permite que el contenido hijo crezca y scrollee */}
      <main className="flex-1 w-full bg-gray-50 relative overflow-y-auto">
         {selectedEvent || isFreeMode ? (
            <CalculatorManager 
               key={isFreeMode ? 'free' : selectedEvent?.id} // Forzar re-render al cambiar evento
               initialEvent={selectedEvent} 
               isFreeMode={isFreeMode}
            />
         ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6 text-center">
               <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                 <Menu size={40} className="opacity-20"/>
               </div>
               <h3 className="text-lg font-bold text-gray-600">Selecciona un Evento</h3>
               <p className="max-w-xs mt-2">Elige un evento del menú lateral o activa el "Modo Manual" para comenzar a calcular insumos.</p>
            </div>
         )}
      </main>
    </div>
  );
}