import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Event } from '@/types';

import { EventSelector } from './EventSelector';
import { CalculatorManager } from './CalculatorManager';

// 1. EXTENSIÓN DE INTERFAZ
// Definimos este tipo local para manejar el dato extra que viene del JOIN con 'clients'
interface EventWithData extends Event {
  clients?: { name: string } | null;
  client_name?: string; // Por si acaso tienes un view que lo devuelva plano
}

export function OperationsShell({ userRole }: { userRole: string }) {
  // 2. ESTADO TIPADO CON LA EXTENSIÓN
  // Usamos EventWithData[] en lugar de Event[] para que el estado acepte la estructura con clientes
  const [events, setEvents] = useState<EventWithData[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventWithData | null>(null);
  const [isFreeMode, setIsFreeMode] = useState(false);
  
  // Mobile Sidebar State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    // 3. CONSULTA ACTUALIZADA (JOIN)
    const { data, error } = await supabase
      .from('events')
      // Solicitamos todas las columnas (*) Y el nombre de la tabla relacionada 'clients'
      .select('*, clients(name)') 
      .in('status', ['confirmed', 'completed']) 
      .order('event_date', { ascending: false });

    if (error) {
      console.error("Error al cargar eventos:", error);
      return;
    }

    if (data) {
      // Casteamos a nuestro tipo extendido para que TS esté feliz
      setEvents(data as unknown as EventWithData[]);
    }
  }

  const handleEventSelect = (event: Event | null) => {
    setIsFreeMode(false);
    // Aseguramos el tipo al guardar en el estado
    setSelectedEvent(event as EventWithData | null);
    setIsMobileMenuOpen(false); 
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

      <main className="flex-1 w-full bg-gray-50 relative overflow-y-auto">
         {selectedEvent || isFreeMode ? (
            <CalculatorManager 
               key={isFreeMode ? 'free' : selectedEvent?.id}
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