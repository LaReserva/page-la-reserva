import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Calculator, Download, Calendar, Users, List, X, FileText, Snowflake, ChevronDown, ChevronUp, PlusCircle, Clock } from 'lucide-react';
import type { Event, Ingredient, RecipeItem, Cocktail } from '@/types';
import * as XLSX from 'xlsx'; 
import { pdf } from '@react-pdf/renderer'; 
import FileSaver from 'file-saver'; 

import { generateShoppingList, type CalculationResult } from '@/utils/calculator';
import { BarChecklistPdf } from '../templates/BarChecklistPdf';

export function OperationsTab({ userRole }: { userRole: string }) {
  // --- ESTADOS DE DATOS ---
  const [events, setEvents] = useState<Event[]>([]);
  const [recipes, setRecipes] = useState<RecipeItem[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [allCocktails, setAllCocktails] = useState<Cocktail[]>([]); 

  // --- ESTADOS DE SELECCIÓN ---
  const [isFreeMode, setIsFreeMode] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(true);
  
  // Datos para Modo Libre
  const [freeModeData, setFreeModeData] = useState({
    guest_count: 50,
    hours: 4,
    cocktails_selected: [] as string[]
  });

  const [eventHours, setEventHours] = useState(5);

  // --- CONFIGURACIÓN CALCULADORA ---
  const [calcSettings, setCalcSettings] = useState({
    consumptionRate: 1.5,
    safetyMargin: 1.10,
    extraIceBags: 0
  });

  const [distributions, setDistributions] = useState<Record<string, number>>({});
  const [shoppingList, setShoppingList] = useState<CalculationResult[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados UI
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [cocktailSearch, setCocktailSearch] = useState('');
  const [isCocktailDropdownOpen, setIsCocktailDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 1. Carga Inicial
  useEffect(() => {
    fetchEvents();
    fetchCatalogs();
  }, []);

  // Cerrar dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCocktailDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 2. Efecto: Inicializar distribución
  useEffect(() => {
    const activeCocktails = isFreeMode 
      ? freeModeData.cocktails_selected 
      : (selectedEvent?.cocktails_selected || []);

    if (activeCocktails.length > 0) {
      const currentKeys = Object.keys(distributions);
      const hasChanged = activeCocktails.length !== currentKeys.length || !activeCocktails.every(id => currentKeys.includes(id));

      if (hasChanged) {
        const evenSplit = Math.floor(100 / activeCocktails.length);
        const remainder = 100 % activeCocktails.length;
        const newDist: Record<string, number> = {};
        activeCocktails.forEach((id, index) => {
          newDist[id] = index === activeCocktails.length - 1 ? evenSplit + remainder : evenSplit;
        });
        setDistributions(newDist);
      }
    } else {
      setDistributions({});
    }
  }, [isFreeMode ? freeModeData.cocktails_selected.length : selectedEvent?.cocktails_selected?.length, selectedEvent?.id]);


  // 3. Efecto para Calcular
  useEffect(() => {
    const activeData = isFreeMode ? freeModeData : selectedEvent;
    
    if (activeData && activeData.guest_count > 0 && recipes.length > 0 && ingredients.length > 0) {
      
      const mockEvent: Event = {
        ...((!isFreeMode && selectedEvent ? selectedEvent : {}) as Event),
        id: isFreeMode ? 'free-mode' : (selectedEvent?.id || 'temp-id'),
        guest_count: activeData.guest_count,
        cocktails_selected: isFreeMode ? freeModeData.cocktails_selected : activeData.cocktails_selected
      };

      const list = generateShoppingList({
        event: mockEvent,
        recipes,
        ingredients,
        settings: {
          hours: isFreeMode ? freeModeData.hours : eventHours, 
          consumptionRate: calcSettings.consumptionRate,
          safetyMargin: calcSettings.safetyMargin,
          distribution: distributions,
          extraIceBags: calcSettings.extraIceBags
        }
      });
      setShoppingList(list);
    } else {
      setShoppingList([]);
    }
  }, [
    isFreeMode, 
    selectedEvent, 
    isFreeMode ? freeModeData.guest_count : selectedEvent?.guest_count,
    isFreeMode ? freeModeData.hours : eventHours,
    selectedEvent?.cocktails_selected, 
    freeModeData, 
    calcSettings, 
    distributions, 
    recipes, 
    ingredients
  ]);

  // --- FETCHERS ---
  async function fetchEvents() {
    const { data } = await supabase
      .from('events')
      .select('*')
      .in('status', ['confirmed', 'completed'])
      .order('event_date', { ascending: false });
    if (data) setEvents(data);
  }

  async function fetchCatalogs() {
    const [rRes, iRes, cRes] = await Promise.all([
      supabase.from('cocktail_recipes').select('*'),
      supabase.from('catalog_ingredients').select('*'),
      supabase.from('catalog_cocktails').select('*').eq('active', true).order('name')
    ]);
    if (rRes.data) setRecipes(rRes.data);
    if (iRes.data) setIngredients(iRes.data);
    if (cRes.data) setAllCocktails(cRes.data);
  }

  // --- HANDLERS ---
  const handleToggleFreeMode = () => {
    setIsFreeMode(!isFreeMode);
    setSelectedEvent(null);
    setShoppingList([]);
    setDistributions({});
    setCalcSettings(prev => ({ ...prev, extraIceBags: 0 }));
    setEventHours(5);
  };

  const addCocktail = (cocktailId: string) => {
    if (isFreeMode) {
      if (!freeModeData.cocktails_selected.includes(cocktailId)) {
        setFreeModeData(prev => ({ ...prev, cocktails_selected: [...prev.cocktails_selected, cocktailId] }));
      }
    } else {
      if (!selectedEvent) return;
      const currentList = selectedEvent.cocktails_selected || [];
      if (!currentList.includes(cocktailId)) {
        setSelectedEvent({ ...selectedEvent, cocktails_selected: [...currentList, cocktailId] });
      }
    }
    setCocktailSearch(''); 
    setIsCocktailDropdownOpen(false); 
  };

  const removeCocktail = (cocktailId: string) => {
    if (isFreeMode) {
      setFreeModeData(prev => ({ ...prev, cocktails_selected: prev.cocktails_selected.filter(id => id !== cocktailId) }));
    } else {
      if (!selectedEvent) return;
      setSelectedEvent({ ...selectedEvent, cocktails_selected: (selectedEvent.cocktails_selected || []).filter(id => id !== cocktailId) });
    }
    const newDist = { ...distributions };
    delete newDist[cocktailId];
    setDistributions(newDist);
  };

  const handlePercentageChange = (id: string, newVal: number) => {
    setDistributions(prev => ({ ...prev, [id]: newVal }));
  };

  const handleGuestChange = (val: number) => {
    if (isFreeMode) {
      setFreeModeData(prev => ({ ...prev, guest_count: val }));
    } else {
      setSelectedEvent(prev => prev ? { ...prev, guest_count: val } : null);
    }
  };
  
  const handleHoursChange = (val: number) => {
    if (isFreeMode) {
      setFreeModeData(prev => ({ ...prev, hours: val }));
    } else {
      setEventHours(val);
    }
  };

  // --- GENERACIÓN PDF ---
  const handleDownloadPdf = async () => {
    if (shoppingList.length === 0) return;
    try {
      setIsGeneratingPdf(true);
      
      const eventData = {
        ...(isFreeMode ? freeModeData : selectedEvent),
        id: isFreeMode ? 'free-mode' : (selectedEvent?.id || 'temp'),
        event_date: isFreeMode ? new Date().toLocaleDateString() : (selectedEvent?.event_date || ''),
        event_type: isFreeMode ? 'Cálculo Libre' : (selectedEvent?.event_type || 'Evento'),
        guest_count: isFreeMode ? freeModeData.guest_count : (selectedEvent?.guest_count || 0)
      } as any;

      const blob = await pdf(
        <BarChecklistPdf 
          event={eventData} 
          shoppingList={shoppingList} 
          cocktailNames={getCocktailNames()} 
        />
      ).toBlob();

      const fileName = `Checklist_${isFreeMode ? 'Libre' : selectedEvent?.event_date}.pdf`;
      FileSaver.saveAs(blob, fileName); 
      
    } catch (error) {
      console.error(error);
      alert("Error generando PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleExportExcel = () => {
    if (shoppingList.length === 0) return;
    const dataToExport = shoppingList.map(item => ({
      'Categoría': item.category.toUpperCase(),
      'Insumo': item.ingredientName,
      'Cantidad Total': item.totalQuantity,
      'Unidad Compra': item.purchaseUnit,
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lista de Compras");
    const fileName = isFreeMode 
      ? `Compras_ModoLibre_${new Date().toISOString().split('T')[0]}.xlsx`
      : `Compras_${selectedEvent?.event_date || 'Evento'}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const getCocktailNames = () => {
    const ids = isFreeMode 
      ? freeModeData.cocktails_selected 
      : (selectedEvent?.cocktails_selected || []);
    return ids.map(id => {
      const c = allCocktails.find(ac => ac.id === id);
      return c ? c.name : 'Desconocido';
    });
  };

  const totalPercentage = Object.values(distributions).reduce((acc, curr) => acc + curr, 0);
  const isDistributionValid = Math.abs(totalPercentage - 100) < 1;

  const filteredCocktails = allCocktails.filter(c => c.name.toLowerCase().includes(cocktailSearch.toLowerCase()));
  const filteredEvents = events.filter(e => e.event_type.toLowerCase().includes(searchTerm.toLowerCase()) || e.event_date.includes(searchTerm));

  // --- RENDER ---
  return (
    // CAMBIO CLAVE: Quitamos 'h-full' y usamos 'min-h-screen' para que crezca libremente
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 bg-white h-full items-start">
      
      {/* --- COLUMNA IZQUIERDA: SELECTOR --- */}
      {/* Sticky para que acompañe el scroll en Desktop */}
      <div className="lg:col-span-3 border-r border-gray-200 bg-gray-50 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto flex flex-col h-auto">
        <div className="p-4 bg-white border-b border-gray-200 space-y-3 shrink-0">
          <button onClick={handleToggleFreeMode} className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${isFreeMode ? 'bg-primary-600 text-white shadow-md' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
            {isFreeMode ? <List size={18}/> : <Calculator size={18}/>}
            {isFreeMode ? 'Ver Eventos' : 'Modo Libre'}
          </button>
          {!isFreeMode && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"/>
            </div>
          )}
        </div>
        
        {!isFreeMode && (
          <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[300px]">
            {filteredEvents.map(event => (
              <div key={event.id} onClick={() => { setSelectedEvent(event); setCalcSettings(p => ({...p, extraIceBags: 0})); setEventHours(5); }} className={`p-3 rounded-lg cursor-pointer transition-all border ${selectedEvent?.id === event.id ? 'bg-white border-primary-500 shadow-md ring-1 ring-primary-500' : 'bg-white border-gray-200 hover:border-primary-300'}`}>
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full truncate max-w-[120px]">{event.event_type}</span>
                  <span className="text-[10px] text-gray-500">{event.event_date.slice(5)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700 text-xs">
                  <Users size={12} /> <span>{event.guest_count} inv.</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {isFreeMode && (
          <div className="flex-1 overflow-y-auto p-4 space-y-6 min-h-[300px]">
            <div className="space-y-4">
               <div>
                 <label className="text-xs font-bold text-gray-500 uppercase">Invitados</label>
                 <input type="number" className="w-full mt-1 p-2 border rounded-md" value={freeModeData.guest_count} onChange={(e) => setFreeModeData({...freeModeData, guest_count: Number(e.target.value)})}/>
               </div>
               <div>
                 <label className="text-xs font-bold text-gray-500 uppercase">Horas</label>
                 <input type="number" className="w-full mt-1 p-2 border rounded-md" value={freeModeData.hours} onChange={(e) => setFreeModeData({...freeModeData, hours: Number(e.target.value)})}/>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* --- COLUMNA DERECHA: RESULTADOS --- */}
      {/* CAMBIO: Eliminado 'h-full' para que crezca naturalmente */}
      <div className="lg:col-span-9 flex flex-col bg-white min-h-screen">
        {(selectedEvent || isFreeMode) ? (
          <div className="flex flex-col flex-1">
            
            {/* HEADER TOOLBAR (Sticky) */}
            <div className="px-6 py-4 border-b border-gray-200 bg-white flex-none flex justify-between items-center shadow-sm z-10 sticky top-0">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Calculator size={20} className="text-primary-600"/> 
                    {isFreeMode ? 'Cálculo Manual' : `Evento: ${selectedEvent?.event_type}`}
                  </h3>
                  {!isFreeMode && <p className="text-xs text-gray-500">{selectedEvent?.event_date} - Duración estimada: {eventHours}h</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={handleDownloadPdf} disabled={shoppingList.length === 0 || isGeneratingPdf} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors ${shoppingList.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}>
                    <FileText size={16} /> {isGeneratingPdf ? 'Generando...' : 'PDF Barra'}
                  </button>
                  <button onClick={handleExportExcel} disabled={shoppingList.length === 0} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-sm"><Download size={16} /> Excel</button>
                </div>
            </div>

            {/* CONFIGURACIÓN */}
            <div className="flex-none border-b border-gray-200 bg-gray-50 transition-all">
                <div className="px-6 py-2 flex justify-between items-center cursor-pointer hover:bg-gray-100" onClick={() => setIsConfigOpen(!isConfigOpen)}>
                   <span className="text-xs font-bold text-gray-600 uppercase flex items-center gap-2"><List size={14}/> Configuración de Insumos</span>
                   {isConfigOpen ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
                </div>

                {isConfigOpen && (
                  <div className="px-6 pb-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
                      
                      {/* Lado A: Cocteles */}
                      <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col max-h-[220px]">
                          <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100 relative" ref={dropdownRef}>
                             <span className="text-xs font-bold text-gray-500">COCTELES</span>
                             <div className="relative w-48">
                                <div className="flex items-center border rounded bg-gray-50 focus-within:ring-2 ring-primary-100 overflow-hidden">
                                  <Search size={12} className="text-gray-400 ml-2" />
                                  <input type="text" className="w-full border-none bg-transparent text-xs p-1.5 focus:ring-0" placeholder="Agregar coctel..." value={cocktailSearch} onChange={(e) => setCocktailSearch(e.target.value)} onFocus={() => setIsCocktailDropdownOpen(true)}/>
                                </div>
                                {isCocktailDropdownOpen && (
                                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-40 overflow-y-auto z-50">
                                    {filteredCocktails.length > 0 ? filteredCocktails.map(c => (
                                        <div key={c.id} className="px-3 py-2 text-xs hover:bg-primary-50 cursor-pointer flex justify-between items-center" onClick={() => addCocktail(c.id)}>
                                          <span>{c.name}</span><PlusCircle size={12} className="text-primary-500" />
                                        </div>
                                      )) : <div className="px-3 py-2 text-xs text-gray-400">No encontrado</div>}
                                  </div>
                                )}
                             </div>
                          </div>
                          
                          <div className="overflow-y-auto pr-2 space-y-1 flex-1">
                             {((isFreeMode ? freeModeData.cocktails_selected : selectedEvent?.cocktails_selected) || []).map(id => {
                                const c = allCocktails.find(ac => ac.id === id);
                                return (
                                  <div key={id} className="flex items-center gap-2 text-xs">
                                    <span className="flex-1 truncate">{c?.name}</span>
                                    <input type="number" className="w-10 text-right p-0.5 border rounded text-xs" value={distributions[id] || 0} onChange={(e) => handlePercentageChange(id, Number(e.target.value))}/>
                                    <span className="text-gray-400">%</span>
                                    <button onClick={() => removeCocktail(id)} className="text-gray-300 hover:text-red-500"><X size={12}/></button>
                                  </div>
                                )
                             })}
                          </div>
                          <div className="pt-2 border-t border-gray-100 flex justify-between text-xs mt-1">
                             <span>Total:</span>
                             <span className={isDistributionValid ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>{totalPercentage}%</span>
                          </div>
                      </div>

                      {/* Lado B: Parámetros */}
                      <div className="grid grid-cols-2 gap-3">
                         <div className="bg-white p-2 rounded-lg border border-gray-200">
                           <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Invitados</label>
                           <input 
                              type="number" 
                              value={isFreeMode ? freeModeData.guest_count : (selectedEvent?.guest_count || 0)} 
                              onChange={(e) => handleGuestChange(Number(e.target.value))} 
                              className="w-full text-sm font-bold border-0 border-b p-0 focus:ring-0"
                           />
                         </div>
                         <div className="bg-white p-2 rounded-lg border border-gray-200">
                           <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1 mb-1"><Clock size={10}/> Horas</label>
                           <input 
                              type="number" 
                              value={isFreeMode ? freeModeData.hours : eventHours} 
                              onChange={(e) => handleHoursChange(Number(e.target.value))} 
                              className="w-full text-sm font-bold border-0 border-b p-0 focus:ring-0"
                           />
                         </div>
                         <div className="bg-white p-2 rounded-lg border border-gray-200">
                            <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1 mb-1"><Snowflake size={10}/> Hielo Extra</label>
                            <div className="flex items-center justify-between">
                              <button onClick={() => setCalcSettings(p => ({...p, extraIceBags: Math.max(0, p.extraIceBags - 1)}))} className="bg-gray-100 w-6 h-6 rounded hover:bg-gray-200">-</button>
                              <span className="font-bold text-sm">{calcSettings.extraIceBags}</span>
                              <button onClick={() => setCalcSettings(p => ({...p, extraIceBags: p.extraIceBags + 1}))} className="bg-gray-100 w-6 h-6 rounded hover:bg-gray-200">+</button>
                            </div>
                         </div>
                         <div className="bg-white p-2 rounded-lg border border-gray-200 col-span-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Margen de Error</label>
                            <div className="flex justify-around text-xs">
                               {[1, 1.10, 1.20].map(val => (
                                  <label key={val} className="cursor-pointer flex items-center gap-1">
                                    <input type="radio" checked={calcSettings.safetyMargin === val} onChange={() => setCalcSettings({...calcSettings, safetyMargin: val})} className="text-primary-600 w-3 h-3"/>
                                    {val === 1 ? '0%' : `+${Math.round((val-1)*100)}%`}
                                  </label>
                               ))}
                            </div>
                         </div>
                      </div>
                  </div>
                )}
            </div>

            {/* TABLA DE RESULTADOS: Crece infinitamente (sin scroll interno) */}
            <div className="flex-grow bg-gray-50 p-6 min-h-[600px] h-auto">
              {shoppingList.length > 0 ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-20">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-gray-600 font-semibold uppercase text-xs sticky top-0 z-10 shadow-sm">
                      <tr><th className="px-4 py-3 bg-gray-100">Insumo</th><th className="px-4 py-3 bg-gray-100">Categoría</th><th className="px-4 py-3 text-right bg-gray-100">A Comprar</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {shoppingList.map((item) => (
                        <tr key={item.ingredientId} className={`hover:bg-gray-50 ${item.ingredientId === 'ice-auto-generated' ? 'bg-blue-50/40' : ''}`}>
                          <td className="px-4 py-3 font-medium text-gray-800 flex items-center gap-2">
                             {item.ingredientId === 'ice-auto-generated' && <Snowflake size={14} className="text-blue-400"/>}
                             {item.ingredientName}
                          </td>
                          <td className="px-4 py-3"><span className="px-2 py-1 rounded-full text-[10px] bg-gray-100 text-gray-500 border border-gray-200 uppercase tracking-wide">{item.category}</span></td>
                          <td className="px-4 py-3 text-right font-bold text-primary-700 text-base">{item.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 py-20">
                  <Calculator size={64} className="mb-4 opacity-10" />
                  <p>Configura los cocteles para ver la lista.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="min-h-screen flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
            <Calendar size={64} className="mx-auto mb-4 opacity-10" />
            <p>Selecciona un evento o usa el Modo Libre.</p>
          </div>
        )}
      </div>
    </div>
  );
}