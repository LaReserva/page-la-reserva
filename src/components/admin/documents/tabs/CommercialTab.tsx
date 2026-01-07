import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { FileText, Plus, Trash2, User, Calendar, Users, ListPlus, Search, DollarSign, FileStack, Mail, Phone, ChevronDown, Loader2, UserPlus, UserCheck, XCircle } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import FileSaver from 'file-saver';
import { ProposalPdf } from '../templates/ProposalPdf';

// LISTA DE EVENTOS POR DEFECTO (Para que siempre tengas opciones)
const DEFAULT_EVENT_TYPES = [
  "Boda",
  "Corporativo",
  "Cumpleaños",
  "Privado",
  "15 Años",
  "Graduación",
  "Aniversario",
  "Baby Shower",
  "Cocktail",
  "Despedida",
  "Activación de Marca"
];

export function CommercialTab({ userRole }: { userRole: string }) {
  // --- MODO CLIENTE ---
  const [clientMode, setClientMode] = useState<'search' | 'new'>('new');

  // --- DATOS DEL CLIENTE ---
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  
  // --- DATOS DEL EVENTO ---
  const [eventType, setEventType] = useState('Boda'); // Valor inicial
  const [eventDate, setEventDate] = useState('');
  const [guestCount, setGuestCount] = useState<number>(50);
  
  // --- DATOS FINANCIEROS ---
  const [quoteAmount, setQuoteAmount] = useState<string>('');
  
  // --- LISTA DE INCLUSIONES ---
  const [includesList, setIncludesList] = useState<string[]>([
    "2 Bartenders profesionales correctamente uniformados",
    "4 Horas de servicio continuo de Open Bar",
    "1 Barra Capitone de color blanco (2 metros)",
    "Hielo ilimitado durante el servicio",
    "Insumos de primera calidad (Jarabes, Frutas, Decoraciones)",
    "Cristalería completa para todos los cocteles"
  ]);
  const [newInclude, setNewInclude] = useState('');

  // --- ESTADOS DE UI Y BÚSQUEDA ---
  const [clients, setClients] = useState<any[]>([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  
  // Tipos de eventos (Defaults + BD)
  const [suggestionEventTypes, setSuggestionEventTypes] = useState<string[]>(DEFAULT_EVENT_TYPES);
  const [showTypeSuggestions, setShowTypeSuggestions] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const typeRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<'new' | 'list'>('new');

  useEffect(() => {
    fetchEventTypes();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowClientSuggestions(false);
      }
      if (typeRef.current && !typeRef.current.contains(event.target as Node)) {
        setShowTypeSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchEventTypes() {
    // 1. Obtenemos lo que ya existe en BD
    const { data } = await supabase.from('events').select('event_type');
    const dbTypes = data ? data.map(e => e.event_type).filter(Boolean) : [];
    
    // 2. Combinamos con la lista por defecto y quitamos duplicados
    const combinedTypes = Array.from(new Set([...DEFAULT_EVENT_TYPES, ...dbTypes])).sort();
    
    setSuggestionEventTypes(combinedTypes);
  }

  // --- LÓGICA DE CLIENTES ---
  const switchClientMode = (mode: 'search' | 'new') => {
    setClientMode(mode);
    setClientName('');
    setClientPhone('');
    setClientEmail('');
    setClients([]);
    setShowClientSuggestions(false);
  };

  const handleSearchClient = async (val: string) => {
    setClientName(val);
    if (clientMode === 'new') return;

    if (val.trim().length === 0) {
      setClients([]);
      setShowClientSuggestions(false);
      return;
    }

    setIsSearchingClient(true);
    setShowClientSuggestions(true);

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .ilike('name', `%${val}%`) // Asegúrate que tu columna es 'name' o 'full_name'
        .limit(5);

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error("Error buscando clientes:", error);
      setClients([]);
    } finally {
      setIsSearchingClient(false);
    }
  };

  const selectClient = (client: any) => {
    setClientName(client.name || client.full_name || '');
    setClientPhone(client.phone || '');
    setClientEmail(client.email || '');
    setShowClientSuggestions(false);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^[0-9]+$/.test(val)) {
      setClientPhone(val);
    }
  };

  // --- HANDLERS LISTA ---
  const handleAddInclude = () => {
    if (!newInclude.trim()) return;
    setIncludesList([...includesList, newInclude]);
    setNewInclude('');
  };

  const handleRemoveInclude = (index: number) => {
    const newList = [...includesList];
    newList.splice(index, 1);
    setIncludesList(newList);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddInclude();
  };

  // --- GENERACIÓN PDF ---
  const handleGenerateProposal = async () => {
    if (!clientName.trim()) {
      alert("Por favor ingresa el nombre del cliente.");
      return;
    }
    try {
      setIsGenerating(true);
      const blob = await pdf(
        <ProposalPdf 
          clientName={clientName}
          clientPhone={clientPhone}
          clientEmail={clientEmail}
          eventType={eventType}
          eventDate={eventDate}
          guestCount={guestCount}
          items={includesList}
          totalCost={Number(quoteAmount) || 0}
        />
      ).toBlob();

      const dateStr = eventDate || new Date().toISOString().split('T')[0];
      const fileName = `Propuesta_${clientName.replace(/\s+/g, '_')}_${dateStr}.pdf`;
      FileSaver.saveAs(blob, fileName);
    } catch (error) {
      console.error(error);
      alert("Error al generar la propuesta");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 bg-gray-50 min-h-screen items-start">
      
      {/* SIDEBAR */}
      <div className="lg:col-span-3 border-r border-gray-200 bg-white lg:sticky lg:top-0 lg:h-screen flex flex-col h-auto shadow-sm z-10">
        <div className="p-5 border-b border-gray-100 space-y-3">
           <button onClick={() => setViewMode('new')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all shadow-sm ${viewMode === 'new' ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
             <Plus size={18}/> Nueva Propuesta
           </button>
           <button onClick={() => setViewMode('list')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all shadow-sm ${viewMode === 'list' ? 'bg-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
             <FileStack size={18}/> Ver Cotizaciones
           </button>
        </div>
        {viewMode === 'new' && (
           <div className="p-5 text-xs text-gray-400 leading-relaxed">
             <p>Genera propuestas PDF al instante. Usa el selector de "Cliente" para buscar en tu base de datos o registrar uno nuevo.</p>
           </div>
        )}
      </div>

      {/* ÁREA DE TRABAJO */}
      {viewMode === 'new' ? (
        <div className="lg:col-span-9 p-6 lg:p-10 min-h-screen flex flex-col">
          <div className="max-w-6xl mx-auto w-full space-y-6">
            
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 sticky top-4 z-30">
               <div>
                 <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FileText className="text-primary-600"/> Propuesta Comercial</h2>
                 <p className="text-gray-500 text-sm mt-1">Generador de Cotizaciones</p>
               </div>
               <button onClick={handleGenerateProposal} disabled={isGenerating} className="bg-red-600 text-white px-8 py-3 rounded-xl font-bold shadow-md hover:bg-red-700 transition-all flex items-center gap-2 disabled:opacity-50 transform active:scale-95">
                 {isGenerating ? 'Generando...' : 'Descargar PDF'}
               </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                
                {/* COLUMNA IZQUIERDA: DATOS */}
                <div className="space-y-6">
                    
                    {/* TARJETA CLIENTE */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative z-20">
                        <div className="flex justify-between items-center mb-5 border-b border-gray-100 pb-3">
                           <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2"><User size={16}/> Cliente</h3>
                           
                           {/* SWITCHER TIPO PESTAÑA */}
                           <div className="flex bg-gray-100 p-1 rounded-lg">
                              <button 
                                onClick={() => switchClientMode('search')}
                                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${clientMode === 'search' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                              >
                                Buscar Existente
                              </button>
                              <button 
                                onClick={() => switchClientMode('new')}
                                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${clientMode === 'new' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                              >
                                Crear Nuevo
                              </button>
                           </div>
                        </div>

                        <div className="space-y-4">
                            {/* Input Nombre / Buscador */}
                            <div className="relative" ref={searchRef}>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                                   {clientMode === 'search' ? 'Buscar en Base de Datos' : 'Nombre Completo / Razón Social'}
                                </label>
                                <div className={`flex items-center border rounded-lg transition-all ${clientMode === 'search' ? 'bg-blue-50/50 border-blue-200 focus-within:ring-2 ring-blue-100' : 'bg-white border-gray-300 focus-within:ring-2 ring-green-100'}`}>
                                    {isSearchingClient ? <Loader2 size={16} className="text-primary-500 ml-3 animate-spin"/> : <Search size={16} className={`ml-3 ${clientMode === 'search' ? 'text-blue-400' : 'text-gray-400'}`}/>}
                                    <input 
                                        type="text" 
                                        value={clientName} 
                                        onChange={(e) => handleSearchClient(e.target.value)} 
                                        placeholder={clientMode === 'search' ? "Escribe el nombre..." : "Ej: Juan Pérez"}
                                        className="w-full p-2.5 bg-transparent border-none focus:ring-0 text-sm"
                                        autoComplete="off"
                                        onFocus={() => { if(clientMode === 'search' && clientName.length > 0) setShowClientSuggestions(true); }}
                                    />
                                    {clientMode === 'search' && clientName && (
                                      <button onClick={() => { setClientName(''); setClients([]); }} className="mr-2 text-gray-400 hover:text-gray-600">
                                        <XCircle size={16}/>
                                      </button>
                                    )}
                                </div>

                                {/* SUGERENCIAS CLIENTE */}
                                {clientMode === 'search' && showClientSuggestions && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50 animate-in fade-in zoom-in-95 duration-100">
                                        {clients.length > 0 ? (
                                          <>
                                            <div className="px-3 py-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider border-b border-gray-50 bg-gray-50">Resultados Encontrados</div>
                                            {clients.map(client => (
                                                <div key={client.id} onClick={() => selectClient(client)} className="px-4 py-3 hover:bg-blue-50 cursor-pointer text-sm text-gray-700 border-b border-gray-50 last:border-0 flex justify-between items-center group transition-colors">
                                                    <div>
                                                      <span className="font-bold block text-gray-800">{client.name || client.full_name}</span>
                                                      <span className="text-xs text-gray-500">{client.email || 'Sin correo'}</span>
                                                    </div>
                                                    <ChevronDown size={14} className="text-gray-300 -rotate-90 group-hover:text-blue-500"/>
                                                </div>
                                            ))}
                                          </>
                                        ) : (
                                          !isSearchingClient && clientName.length > 0 && (
                                            <div className="p-4 text-center">
                                              <p className="text-sm text-gray-500 mb-2">No se encontraron clientes.</p>
                                              <button 
                                                onClick={() => switchClientMode('new')}
                                                className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full font-bold hover:bg-green-200 transition-colors"
                                              >
                                                Ingresar Manualmente
                                              </button>
                                            </div>
                                          )
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Celular</label>
                                    <input type="tel" value={clientPhone} onChange={handlePhoneChange} placeholder="Solo números" className={`w-full p-2.5 border rounded-lg text-sm outline-none ${clientMode === 'search' ? 'bg-gray-50' : 'bg-white border-gray-300 focus:ring-2 focus:ring-green-100'}`} readOnly={clientMode === 'search' && !!clientName} />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Correo</label>
                                    <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="cliente@mail.com" className={`w-full p-2.5 border rounded-lg text-sm outline-none ${clientMode === 'search' ? 'bg-gray-50' : 'bg-white border-gray-300 focus:ring-2 focus:ring-green-100'}`} readOnly={clientMode === 'search' && !!clientName} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* TARJETA EVENTO CON SUGERENCIAS MEJORADAS */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative z-10">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Calendar size={16}/> Evento</h3>
                        <div className="space-y-4">
                            <div className="relative" ref={typeRef}>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Tipo de Evento</label>
                                <div className="relative">
                                  <input 
                                    type="text" 
                                    value={eventType} 
                                    onChange={e => { setEventType(e.target.value); setShowTypeSuggestions(true); }}
                                    onFocus={() => setShowTypeSuggestions(true)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-100 outline-none"
                                    placeholder="Ej. Boda, Corporativo..."
                                  />
                                  <button onClick={() => setShowTypeSuggestions(!showTypeSuggestions)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                     <ChevronDown size={16}/>
                                  </button>
                                </div>
                                
                                {/* DROPDOWN DE TIPOS DE EVENTO */}
                                {showTypeSuggestions && suggestionEventTypes.length > 0 && (
                                   <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto z-50 animate-in fade-in zoom-in-95">
                                      {suggestionEventTypes.filter(t => t.toLowerCase().includes(eventType.toLowerCase())).map(type => (
                                         <div key={type} onClick={() => { setEventType(type); setShowTypeSuggestions(false); }} className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                                            {type}
                                         </div>
                                      ))}
                                      {suggestionEventTypes.filter(t => t.toLowerCase().includes(eventType.toLowerCase())).length === 0 && (
                                         <div className="px-4 py-2 text-xs text-gray-400">Presiona enter para usar "{eventType}"</div>
                                      )}
                                   </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Fecha Tentativa</label>
                                    <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-100 outline-none"/>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Invitados</label>
                                    <input type="number" value={guestCount} onChange={e => setGuestCount(Number(e.target.value))} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-100 outline-none"/>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* COSTOS */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm border-l-4 border-l-green-500 relative z-0">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2"><DollarSign size={16}/> Propuesta Económica</h3>
                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1 block">Precio Total (S/)</label>
                            <input 
                                type="number" 
                                value={quoteAmount} 
                                onChange={e => setQuoteAmount(e.target.value)} 
                                placeholder="0.00"
                                className="w-full p-3 border border-gray-300 rounded-lg text-xl font-bold text-gray-800 focus:ring-2 focus:ring-green-100 outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* COLUMNA DERECHA: LISTA */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col h-auto min-h-[600px]">
                   <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100 flex-none">
                     <div className="p-2 bg-primary-50 rounded-lg text-primary-600"><ListPlus size={20}/></div>
                     <div>
                       <h3 className="text-lg font-bold text-gray-800">Detalles del Servicio</h3>
                       <p className="text-xs text-gray-400">Items incluidos en la propuesta</p>
                     </div>
                   </div>

                   <div className="flex gap-2 mb-4 flex-none">
                     <input type="text" value={newInclude} onChange={(e) => setNewInclude(e.target.value)} onKeyDown={handleKeyDown} placeholder="Ej: Barra Capitone..." className="flex-1 p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-100 outline-none"/>
                     <button onClick={handleAddInclude} className="bg-gray-800 text-white px-4 rounded-lg text-sm font-medium hover:bg-gray-900 flex items-center gap-2"><Plus size={16}/> Agregar</button>
                   </div>

                   <div className="flex-1 overflow-y-auto pr-2 space-y-2 min-h-[400px] custom-scrollbar border border-gray-100 rounded-lg p-2 bg-gray-50/50">
                     {includesList.map((item, index) => (
                       <div key={index} className="flex items-start justify-between p-3 bg-white rounded-lg border border-gray-100 shadow-sm hover:border-primary-200 transition-all">
                          <div className="flex gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2 flex-none"></div>
                            <span className="text-sm text-gray-700 leading-relaxed">{item}</span>
                          </div>
                          <button onClick={() => handleRemoveInclude(index)} className="text-gray-300 hover:text-red-500 p-1 hover:bg-red-50 rounded transition-colors flex-none"><Trash2 size={16}/></button>
                       </div>
                     ))}
                   </div>
                   <p className="text-[10px] text-gray-400 text-center mt-3 pt-3 border-t border-gray-100 flex-none">{includesList.length} items</p>
                </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="lg:col-span-9 p-10 flex flex-col items-center justify-center min-h-screen bg-white">
           <FileStack size={64} className="text-gray-200 mb-4"/>
           <h2 className="text-xl font-bold text-gray-800">Historial</h2>
           <p className="text-gray-500">Próximamente...</p>
        </div>
      )}
    </div>
  );
}