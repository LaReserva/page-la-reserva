// src/components/admin/documents/tabs/OperationsTab.tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Calculator, Download, Calendar, Users, Clock, List, X, FileText } from 'lucide-react';
import type { Event, Ingredient, RecipeItem, Cocktail } from '@/types';
import * as XLSX from 'xlsx'; 
import { PDFDownloadLink } from '@react-pdf/renderer';

// Importaciones internas
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
  
  // Datos para Modo Libre
  const [freeModeData, setFreeModeData] = useState({
    guest_count: 50,
    hours: 4,
    cocktails_selected: [] as string[]
  });

  // --- CONFIGURACIÓN CALCULADORA ---
  const [calcSettings, setCalcSettings] = useState({
    consumptionRate: 1.5,
    safetyMargin: 1.10
  });

  const [shoppingList, setShoppingList] = useState<CalculationResult[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Carga Inicial
  useEffect(() => {
    fetchEvents();
    fetchCatalogs();
  }, []);

  // 2. Efecto para Calcular (Reactivo)
  useEffect(() => {
    // Determinamos qué datos usar
    const activeData = isFreeMode ? freeModeData : selectedEvent;

    // Validación básica
    const hasCocktails = isFreeMode 
      ? freeModeData.cocktails_selected.length > 0
      : (activeData?.cocktails_selected?.length || 0) > 0;

    if (activeData && hasCocktails && recipes.length > 0 && ingredients.length > 0) {
      
      // Construimos un objeto "Event" temporal compatible
      const mockEvent: Event = {
        ...((!isFreeMode && selectedEvent ? selectedEvent : {}) as Event), // Heredar props si es real
        id: isFreeMode ? 'free-mode' : (selectedEvent?.id || 'temp-id'),
        guest_count: activeData.guest_count,
        cocktails_selected: isFreeMode ? freeModeData.cocktails_selected : activeData.cocktails_selected
      };

      const list = generateShoppingList({
        event: mockEvent,
        recipes,
        ingredients,
        settings: {
          hours: isFreeMode ? freeModeData.hours : 5, 
          consumptionRate: calcSettings.consumptionRate,
          safetyMargin: calcSettings.safetyMargin
        }
      });
      setShoppingList(list);
    } else {
      setShoppingList([]);
    }
  }, [
    isFreeMode, 
    selectedEvent, 
    selectedEvent?.guest_count, // Escuchar cambios manuales en el input
    freeModeData, 
    calcSettings, 
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

  // --- HANDLERS MODO LIBRE ---
  const handleToggleFreeMode = () => {
    setIsFreeMode(!isFreeMode);
    setSelectedEvent(null);
    setShoppingList([]);
  };

  const addCocktailToFreeMode = (cocktailId: string) => {
    if (!freeModeData.cocktails_selected.includes(cocktailId)) {
      setFreeModeData(prev => ({
        ...prev,
        cocktails_selected: [...prev.cocktails_selected, cocktailId]
      }));
    }
  };

  const removeCocktailFromFreeMode = (cocktailId: string) => {
    setFreeModeData(prev => ({
      ...prev,
      cocktails_selected: prev.cocktails_selected.filter(id => id !== cocktailId)
    }));
  };

  // --- EXPORTAR EXCEL ---
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

  // --- PREPARAR DATOS PARA PDF ---
  const getPdfEventData = () => {
    if (isFreeMode) {
      return {
        ...freeModeData,
        id: 'free-mode',
        event_date: new Date().toLocaleDateString(),
        event_type: 'Cálculo Libre',
        status: 'draft',
        total_price: 0,
        deposit_paid: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as unknown as Event;
    }
    return selectedEvent!;
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

  // Filtrado lateral
  const filteredEvents = events.filter(e => 
    e.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.event_date.includes(searchTerm)
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 h-full">
      
      {/* --- COLUMNA IZQUIERDA: SELECTOR --- */}
      <div className="lg:col-span-4 border-r border-gray-200 flex flex-col h-full bg-gray-50">
        
        {/* Toggle Modo Libre */}
        <div className="p-4 bg-white border-b border-gray-200 space-y-3">
          <button 
            onClick={handleToggleFreeMode}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
              isFreeMode 
                ? 'bg-primary-600 text-white shadow-md' 
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {isFreeMode ? <List size={18}/> : <Calculator size={18}/>}
            {isFreeMode ? 'Ver Lista de Eventos' : 'Usar Calculadora Libre'}
          </button>

          {!isFreeMode && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar evento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
              />
            </div>
          )}
        </div>
        
        {/* Lista de Eventos */}
        {!isFreeMode && (
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredEvents.map(event => (
              <div
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className={`p-3 rounded-lg cursor-pointer transition-all border ${
                  selectedEvent?.id === event.id
                    ? 'bg-white border-primary-500 shadow-md ring-1 ring-primary-500'
                    : 'bg-white border-gray-200 hover:border-primary-300'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full">
                    {event.event_type}
                  </span>
                  <span className="text-xs text-gray-500">{event.event_date}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700 text-sm mb-1">
                  <Users size={14} /> <span>{event.guest_count} inv.</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Panel Modo Libre */}
        {isFreeMode && (
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
              <p className="font-semibold mb-1">Modo Manual</p>
              Simula un evento sin guardar datos. Configura invitados y cocteles abajo.
            </div>

            <div className="space-y-4">
               <div>
                 <label className="text-xs font-bold text-gray-500 uppercase">Invitados</label>
                 <input 
                   type="number" 
                   className="w-full mt-1 p-2 border rounded-md focus:ring-primary-500 focus:border-primary-500"
                   value={freeModeData.guest_count}
                   onChange={(e) => setFreeModeData({...freeModeData, guest_count: Number(e.target.value)})}
                 />
               </div>
               <div>
                 <label className="text-xs font-bold text-gray-500 uppercase">Duración (Horas)</label>
                 <input 
                   type="number" 
                   className="w-full mt-1 p-2 border rounded-md focus:ring-primary-500 focus:border-primary-500"
                   value={freeModeData.hours}
                   onChange={(e) => setFreeModeData({...freeModeData, hours: Number(e.target.value)})}
                 />
               </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Agregar Cocteles</label>
              <select 
                className="w-full p-2 border rounded-md text-sm mb-3"
                onChange={(e) => {
                  if(e.target.value) {
                    addCocktailToFreeMode(e.target.value);
                    e.target.value = ''; 
                  }
                }}
              >
                <option value="">+ Seleccionar Coctel</option>
                {allCocktails.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <div className="space-y-2">
                {freeModeData.cocktails_selected.map(id => {
                  const cocktail = allCocktails.find(c => c.id === id);
                  return (
                    <div key={id} className="flex justify-between items-center bg-white p-2 rounded border border-gray-200 shadow-sm text-sm">
                      <span>{cocktail?.name || 'Desconocido'}</span>
                      <button 
                        onClick={() => removeCocktailFromFreeMode(id)}
                        className="text-red-500 hover:bg-red-50 p-1 rounded"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
                {freeModeData.cocktails_selected.length === 0 && (
                  <p className="text-xs text-gray-400 italic">No hay cocteles seleccionados</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- COLUMNA DERECHA: RESULTADOS --- */}
      <div className="lg:col-span-8 flex flex-col h-full bg-white overflow-hidden">
        {(selectedEvent || isFreeMode) ? (
          <>
            {/* Toolbar Superior */}
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Calculator size={20} className="text-primary-600"/> 
                    {isFreeMode ? 'Cálculo Manual' : 'Cálculo de Evento'}
                  </h3>
                  {!isFreeMode && selectedEvent && (
                     <p className="text-sm text-gray-500">{selectedEvent.event_type} - {selectedEvent.event_date}</p>
                  )}
                </div>
                
                {/* BOTONES DE ACCIÓN */}
                <div className="flex gap-2">
                  {/* Botón PDF Checklist */}
                  <PDFDownloadLink
                    document={
                      <BarChecklistPdf 
                        event={getPdfEventData()}
                        shoppingList={shoppingList}
                        cocktailNames={getCocktailNames()}
                      />
                    }
                    fileName={`Checklist_${isFreeMode ? 'Libre' : selectedEvent?.event_date}.pdf`}
                    className={`flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-medium shadow-sm transition-colors ${
                      shoppingList.length === 0 ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    {({ loading }) => (
                      <>
                        <FileText size={16} /> 
                        {loading ? '...' : 'PDF Barra'}
                      </>
                    )}
                  </PDFDownloadLink>

                  {/* Botón Excel Compras */}
                  <button 
                    onClick={handleExportExcel}
                    disabled={shoppingList.length === 0}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-sm transition-colors"
                  >
                    <Download size={16} /> Excel Compras
                  </button>
                </div>
              </div>

              {/* Configuración Rápida (Solo visible si NO es modo libre) */}
              {!isFreeMode && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                     <label className="text-xs font-medium text-gray-500 mb-1 block">Invitados (Editable)</label>
                     <div className="flex items-center gap-2">
                       <Users size={16} className="text-gray-400"/>
                       <input 
                         type="number" 
                         value={selectedEvent?.guest_count || 0}
                         onChange={(e) => setSelectedEvent(prev => prev ? {...prev, guest_count: Number(e.target.value)} : null)}
                         className="w-full font-bold text-gray-800 outline-none border-b border-transparent focus:border-primary-500"
                       />
                     </div>
                   </div>
                   
                   <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm md:col-span-2">
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Margen de Seguridad (Mermas)</label>
                      <div className="flex gap-4">
                        {[1, 1.05, 1.10, 1.20].map(val => (
                          <label key={val} className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="radio" 
                              name="safety" 
                              checked={calcSettings.safetyMargin === val}
                              onChange={() => setCalcSettings({...calcSettings, safetyMargin: val})}
                              className="text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm">
                              {val === 1 ? '0%' : `+${Math.round((val-1)*100)}%`}
                            </span>
                          </label>
                        ))}
                      </div>
                   </div>
                </div>
              )}
            </div>

            {/* Tabla de Resultados */}
            <div className="flex-1 overflow-auto p-6">
              {shoppingList.length > 0 ? (
                <div className="border rounded-lg overflow-hidden shadow-sm">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-gray-600 font-semibold uppercase text-xs">
                      <tr>
                        <th className="px-4 py-3">Insumo</th>
                        <th className="px-4 py-3">Categoría</th>
                        <th className="px-4 py-3 text-right">Cantidad Compra</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {shoppingList.map((item) => (
                        <tr key={item.ingredientId} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-800">{item.ingredientName}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                              {item.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                             <span className="font-bold text-primary-700 text-lg">{item.details}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <Calculator size={48} className="mb-4 opacity-20" />
                  <p>Agrega cocteles para ver los insumos necesarios.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
            <div className="text-center max-w-md p-6">
              <Calendar size={48} className="mx-auto mb-4 opacity-20" />
              <h3 className="font-medium text-gray-900 mb-2">Comienza aquí</h3>
              <p className="text-sm">Selecciona un evento de la lista o usa el <b>Modo Libre</b> para calcular insumos sin un evento previo.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}