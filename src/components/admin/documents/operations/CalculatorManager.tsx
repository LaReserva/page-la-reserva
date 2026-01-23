import { useState, useEffect, Fragment } from 'react';
import { Combobox, Disclosure, Transition, Dialog, Listbox } from '@headlessui/react';
import { supabase } from '@/lib/supabase';
import { Search, ChevronUp, Plus, X, Download, FileText, Settings2, CheckCircle, AlertTriangle, Loader2, Check, ShoppingBasket } from 'lucide-react';
import type { Event, Ingredient, RecipeItem, Cocktail } from '@/types';
import { generateShoppingList, type CalculationResult } from '@/utils/calculator';
// Ajusta esta ruta si tu archivo está en otra carpeta
import { BarChecklistPdf } from '@/components/admin/documents/templates/BarChecklistPdf'; 

interface CalculatorManagerProps {
  initialEvent: Event | null;
  isFreeMode: boolean;
}

const marginOptions = [
  { value: 1, label: '0% (Exacto)' },
  { value: 1.1, label: '10% (Recomendado)' },
  { value: 1.2, label: '20% (Alto)' }
];

// Tipo simple para items extra
interface ExtraItem {
  ingredientId: string;
  quantity: number;
}

export function CalculatorManager({ initialEvent, isFreeMode }: CalculatorManagerProps) {
  // --- DATA STATES ---
  const [recipes, setRecipes] = useState<RecipeItem[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [allCocktails, setAllCocktails] = useState<Cocktail[]>([]);

  // --- CONFIG STATE ---
  const [settings, setSettings] = useState({
    guestCount: 50,
    hours: 5,
    consumptionRate: 1.5,
    safetyMargin: 1.10,
    extraIceBags: 0
  });

  const [selectedCocktails, setSelectedCocktails] = useState<string[]>([]);
  const [distribution, setDistribution] = useState<Record<string, number>>({});
  
  // ✅ NUEVO ESTADO: Items Extra
  const [extraItems, setExtraItems] = useState<ExtraItem[]>([]);
  
  const [shoppingList, setShoppingList] = useState<CalculationResult[]>([]);

  // --- UI STATES ---
  const [query, setQuery] = useState('');
  // ✅ NUEVO ESTADO UI: Búsqueda de Insumos Extra
  const [extraQuery, setExtraQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // --- INITIAL LOAD ---
  useEffect(() => {
    fetchCatalogs();
  }, []);

  useEffect(() => {
    if (initialEvent && !isFreeMode) {
      setSettings(prev => ({ ...prev, guestCount: initialEvent.guest_count, hours: 5 }));
      setSelectedCocktails(initialEvent.cocktails_selected || []);
    }
  }, [initialEvent, isFreeMode]);

  useEffect(() => {
    if (selectedCocktails.length > 0) {
      const newCocktails = selectedCocktails.filter(id => distribution[id] === undefined);
      if (newCocktails.length > 0) rebalanceDistribution(selectedCocktails);
    } else {
      setDistribution({});
    }
  }, [selectedCocktails.length]);

  // --- CALCULATOR ENGINE MODIFICADO ---
  useEffect(() => {
    // Generamos la lista base desde las recetas
    let list: CalculationResult[] = [];
    
    if (recipes.length > 0 && ingredients.length > 0 && selectedCocktails.length > 0) {
      const mockEvent: Event = {
        ...((initialEvent || {}) as Event),
        id: isFreeMode ? 'free-mode' : (initialEvent?.id || 'temp'),
        guest_count: settings.guestCount,
        cocktails_selected: selectedCocktails
      };

      list = generateShoppingList({
        event: mockEvent,
        recipes,
        ingredients,
        settings: {
          hours: settings.hours,
          consumptionRate: settings.consumptionRate,
          safetyMargin: settings.safetyMargin,
          distribution: distribution,
          extraIceBags: settings.extraIceBags
        }
      });
    }

    // ✅ LÓGICA AGREGADA: Integrar Extra Items a la lista
    if (extraItems.length > 0 && ingredients.length > 0) {
        extraItems.forEach(extra => {
            const ing = ingredients.find(i => i.id === extra.ingredientId);
            if (!ing) return;

            // Buscar si ya existe en la lista calculada para sumar, o crear nuevo
            const existingIndex = list.findIndex(item => item.ingredientId === ing.id);
            
            if (existingIndex >= 0) {
                // Si ya existe (ej: Limón para Pisco Sour + Limón Extra), sumamos
                const currentItem = list[existingIndex];
                const addedQty = extra.quantity; 
                
                list[existingIndex] = {
                    ...currentItem,
                    totalQuantity: currentItem.totalQuantity + addedQty,
                    totalCost: currentItem.totalCost + (addedQty * ing.estimated_price),
                    details: `${(currentItem.totalQuantity + addedQty).toFixed(1)} ${ing.purchase_unit} (Incluye ${addedQty} extra)`
                };
            } else {
                // Si no existe (ej: Vino Blanco), lo agregamos
                list.push({
                    ingredientId: ing.id,
                    ingredientName: ing.name,
                    category: ing.category,
                    purchaseUnit: ing.purchase_unit,
                    price: ing.estimated_price,
                    totalQuantity: extra.quantity,
                    totalCost: extra.quantity * ing.estimated_price,
                    details: `${extra.quantity} ${ing.purchase_unit} (Extra)`
                });
            }
        });
    }

    setShoppingList(list);
  }, [settings, selectedCocktails, distribution, recipes, ingredients, isFreeMode, extraItems]);

  async function fetchCatalogs() {
    const [r, i, c] = await Promise.all([
      supabase.from('cocktail_recipes').select('*'),
      supabase.from('catalog_ingredients').select('*').order('name'),
      supabase.from('catalog_cocktails').select('*').eq('active', true).order('name')
    ]);
    if (r.data) setRecipes(r.data);
    if (i.data) setIngredients(i.data);
    if (c.data) setAllCocktails(c.data);
  }

  const rebalanceDistribution = (cocktailIds: string[]) => {
    if (cocktailIds.length === 0) { setDistribution({}); return; }
    const evenSplit = Math.floor(100 / cocktailIds.length);
    const remainder = 100 % cocktailIds.length;
    const newDist: Record<string, number> = {};
    cocktailIds.forEach((id, idx) => { newDist[id] = idx === cocktailIds.length - 1 ? evenSplit + remainder : evenSplit; });
    setDistribution(newDist);
  };
  const addCocktail = (cocktail: Cocktail) => { if (!selectedCocktails.includes(cocktail.id)) { setSelectedCocktails([...selectedCocktails, cocktail.id]); setQuery(''); } };
  const removeCocktail = (id: string) => { const remaining = selectedCocktails.filter(c => c !== id); setSelectedCocktails(remaining); rebalanceDistribution(remaining); };
  const updateDist = (id: string, newVal: number) => {
    let clampedVal = Math.max(0, Math.min(100, newVal));
    if (selectedCocktails.length === 1) { setDistribution({ [id]: 100 }); return; }
    const remainder = 100 - clampedVal;
    const otherCocktails = selectedCocktails.filter(cId => cId !== id);
    if (otherCocktails.length === 0) return;
    const split = Math.floor(remainder / otherCocktails.length);
    const leftover = remainder % otherCocktails.length;
    const newDist: Record<string, number> = { ...distribution };
    newDist[id] = clampedVal;
    otherCocktails.forEach((cId, idx) => { newDist[cId] = idx === otherCocktails.length - 1 ? split + leftover : split; });
    setDistribution(newDist);
  };

  // ✅ NUEVAS FUNCIONES PARA EXTRAS
  const addExtraItem = (ingredient: Ingredient) => {
    const exists = extraItems.find(e => e.ingredientId === ingredient.id);
    if (exists) {
        setExtraItems(prev => prev.map(e => e.ingredientId === ingredient.id ? { ...e, quantity: e.quantity + 1 } : e));
    } else {
        setExtraItems([...extraItems, { ingredientId: ingredient.id, quantity: 1 }]);
    }
    setExtraQuery('');
  };

  const updateExtraQuantity = (id: string, qty: number) => {
    if (qty <= 0) {
        setExtraItems(prev => prev.filter(e => e.ingredientId !== id));
    } else {
        setExtraItems(prev => prev.map(e => e.ingredientId === id ? { ...e, quantity: qty } : e));
    }
  };

  const removeExtraItem = (id: string) => {
    setExtraItems(prev => prev.filter(e => e.ingredientId !== id));
  };

  // Filtrados
  const filteredCocktails = query === '' ? allCocktails : allCocktails.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
  
  // ✅ Filtrado de Ingredientes Extra
  const filteredIngredients = extraQuery === '' ? [] : ingredients.filter(i => i.name.toLowerCase().includes(extraQuery.toLowerCase())).slice(0, 10);

  const totalDist = Object.values(distribution).reduce((a, b) => a + b, 0);

  // --- EXPORTS ---
  const handleExportExcel = async () => {
    if (shoppingList.length === 0) return;
    setIsProcessing(true);
    try {
      const XLSX = await import('xlsx');
      const tableData = shoppingList.map(item => ({
        Categoría: item.category.toUpperCase(),
        Insumo: item.ingredientName,
        Cantidad: item.totalQuantity,
        Unidad: item.purchaseUnit,
        'Precio Unit.': item.price,
        Total: item.totalCost
      }));
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(tableData);
      ws['!cols'] = [{wch:15}, {wch:30}, {wch:10}, {wch:10}, {wch:12}, {wch:12}];
      XLSX.utils.book_append_sheet(wb, ws, "Lista de Compras");
      const name = isFreeMode ? 'Lista_Manual' : `Evento_${initialEvent?.event_date}`;
      XLSX.writeFile(wb, `${name}.xlsx`);
      setSuccessMsg("Excel descargado correctamente.");
    } catch (e) {
      console.error(e);
      alert("Error exportando Excel");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportPdf = async () => {
    if (shoppingList.length === 0) return;
    setIsProcessing(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const FileSaver = (await import('file-saver')).default;
      
      const eventData = {
        ...(initialEvent || {} as Event),
        event_type: isFreeMode ? 'Cálculo Manual' : initialEvent?.event_type || 'Evento',
        event_date: isFreeMode ? new Date().toISOString() : initialEvent?.event_date || '',
        guest_count: settings.guestCount
      } as Event;

      const cocktailNames = selectedCocktails.map(id => allCocktails.find(c => c.id === id)?.name || 'Desconocido');
      
      const blob = await pdf(
        <BarChecklistPdf 
           event={eventData} 
           shoppingList={shoppingList} 
           cocktailNames={cocktailNames} 
        />
      ).toBlob();

      FileSaver.saveAs(blob, `Checklist_${isFreeMode ? 'Manual' : eventData.event_date}.pdf`);
      setSuccessMsg("PDF descargado correctamente.");
    } catch (e) {
      console.error(e);
      alert("Error generando PDF");
    } finally {
      setIsProcessing(false);
    }
  };

  // CLASE COMÚN DE FOCUS
  const inputFocusClass = "border border-gray-300 rounded-lg p-2 text-sm resize-none focus:ring-primary-500 focus:border-primary-500 outline-none transition-all shadow-sm";

  return (
    <div className="flex flex-col relative pb-10">
      
      {/* MODAL DE ÉXITO */}
      <Transition appear show={!!successMsg} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setSuccessMsg(null)}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="fixed inset-0 bg-black/30 backdrop-blur-sm" /></Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
               <Dialog.Panel className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
                 <CheckCircle size={48} className="text-green-500 mx-auto mb-4"/>
                 <h3 className="text-lg font-bold">¡Exportación Exitosa!</h3>
                 <p className="text-sm text-gray-500 mt-2">{successMsg}</p>
                 <button onClick={() => setSuccessMsg(null)} className="mt-6 w-full bg-gray-900 text-white py-2 rounded-lg font-bold">Cerrar</button>
               </Dialog.Panel>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* HEADER CONFIGURACIÓN */}
      <div className="bg-white border-b border-gray-200 p-4 lg:p-6 shadow-sm z-30">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
               {isFreeMode ? 'Calculadora Manual' : `Evento: ${initialEvent?.event_type}`}
               {isFreeMode && <span className="bg-yellow-100 text-yellow-800 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide">Modo Libre</span>}
            </h2>
            <p className="text-sm text-gray-500">Configura los parámetros para generar la lista de compras.</p>
          </div>
          <div className="flex gap-2 w-full lg:w-auto">
            <button onClick={handleExportPdf} disabled={shoppingList.length === 0 || isProcessing} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors text-sm font-bold">
               {isProcessing ? <Loader2 className="animate-spin" size={16}/> : <FileText size={16}/>} PDF
            </button>
            <button onClick={handleExportExcel} disabled={shoppingList.length === 0 || isProcessing} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm transition-colors text-sm font-bold">
               {isProcessing ? <Loader2 className="animate-spin" size={16}/> : <Download size={16}/>} Excel
            </button>
          </div>
        </div>

        {/* ✅ GRID DE CONFIGURACIÓN */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
           <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Invitados</label>
              <input type="number" min="1" value={settings.guestCount} onChange={e => setSettings({...settings, guestCount: Number(e.target.value)})} className={`w-full font-bold ${inputFocusClass}`}/>
           </div>
           <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Horas</label>
              <input type="number" min="1" value={settings.hours} onChange={e => setSettings({...settings, hours: Number(e.target.value)})} className={`w-full font-bold ${inputFocusClass}`}/>
           </div>
           <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hielo Extra</label>
              <div className="flex items-center gap-2">
                 <button onClick={() => setSettings(p => ({...p, extraIceBags: Math.max(0, p.extraIceBags - 1)}))} className="w-8 h-9 bg-gray-100 rounded-lg font-bold hover:bg-gray-200 transition-colors">-</button>
                 <span className="flex-1 text-center font-bold text-sm">{settings.extraIceBags}</span>
                 <button onClick={() => setSettings(p => ({...p, extraIceBags: p.extraIceBags + 1}))} className="w-8 h-9 bg-gray-100 rounded-lg font-bold hover:bg-gray-200 transition-colors">+</button>
              </div>
           </div>
           <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Margen Seguridad</label>
              <Listbox value={settings.safetyMargin} onChange={val => setSettings({...settings, safetyMargin: val})}>
                 <div className="relative mt-1">
                    <Listbox.Button className={`relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm shadow-sm ${inputFocusClass}`}>
                       <span className="block truncate">{marginOptions.find(o => o.value === settings.safetyMargin)?.label}</span>
                       <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                          <ChevronUp className="h-5 w-5 text-gray-400 rotate-180" aria-hidden="true" />
                       </span>
                    </Listbox.Button>
                    <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                       <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-50 border border-gray-100">
                          {marginOptions.map((option) => (
                             <Listbox.Option key={option.value} className={({ active }) => `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-primary-500 text-white' : 'text-gray-900'}`} value={option.value}>
                                {({ selected, active }) => (
                                   <>
                                      <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>{option.label}</span>
                                      {selected ? (<span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-white' : 'text-primary-500'}`}><Check className="h-5 w-5" aria-hidden="true" /></span>) : null}
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

        {/* ACORDEÓNES DE CONFIGURACIÓN */}
        <div className="space-y-4">
            {/* 1. COCTELES */}
            <Disclosure defaultOpen>
            {({ open }) => (
                <div className="border border-gray-200 rounded-xl">
                <Disclosure.Button className="w-full flex justify-between items-center px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-xl">
                    <span className="text-sm font-bold text-gray-700 flex items-center gap-2"><Settings2 size={16}/> Configuración de Cocteles ({selectedCocktails.length})</span>
                    <ChevronUp className={`${open ? '' : 'rotate-180'} transform transition-transform text-gray-500`} size={16} />
                </Disclosure.Button>
                <Disclosure.Panel className="p-4 bg-white rounded-b-xl">
                    <div className="flex flex-col lg:flex-row gap-6">
                        <div className="w-full lg:w-1/3 space-y-2 relative z-20">
                            <label className="text-xs font-bold text-gray-400 uppercase">Agregar Coctel</label>
                            <Combobox value={null} onChange={(val: any) => addCocktail(val)}>
                                <div className="relative">
                                    <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left border border-gray-300 focus-within:ring-2 focus-within:ring-primary-500 sm:text-sm">
                                        <Combobox.Input className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0" onChange={(event) => setQuery(event.target.value)} placeholder="Escribe para buscar..."/>
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-2"><Search className="h-4 w-4 text-gray-400" /></div>
                                    </div>
                                    <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0" afterLeave={() => setQuery('')}>
                                        <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-50 border border-gray-100">
                                            {filteredCocktails.length === 0 && query !== '' ? (
                                                <div className="relative cursor-default select-none py-2 px-4 text-gray-700">No encontrado.</div>
                                            ) : (
                                                filteredCocktails.map((cocktail) => (
                                                    <Combobox.Option key={cocktail.id} className={({ active }) => `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-primary-600 text-white' : 'text-gray-900'}`} value={cocktail}>
                                                        {({ selected, active }) => (
                                                            <><span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>{cocktail.name}</span>{selected ? <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-white' : 'text-primary-600'}`}><Plus className="h-4 w-4"/></span> : null}</>
                                                        )}
                                                    </Combobox.Option>
                                                ))
                                            )}
                                        </Combobox.Options>
                                    </Transition>
                                </div>
                            </Combobox>
                        </div>
                        <div className="w-full lg:w-2/3 z-0">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-bold text-gray-400 uppercase">Distribución de Consumo</label>
                                <span className={`text-xs font-bold ${Math.abs(totalDist - 100) < 1 ? 'text-green-600' : 'text-red-500'}`}>Total: {Math.round(totalDist)}%</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2">
                                {selectedCocktails.map(id => {
                                    const c = allCocktails.find(ac => ac.id === id);
                                    return (
                                        <div key={id} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                            <span className="flex-1 text-xs font-medium truncate" title={c?.name}>{c?.name}</span>
                                            <input type="number" min="0" max="100" value={Math.round(distribution[id] || 0)} onChange={(e) => updateDist(id, Number(e.target.value))} className={`w-12 text-right p-1 text-xs ${inputFocusClass}`}/>
                                            <span className="text-xs text-gray-400">%</span>
                                            <button onClick={() => removeCocktail(id)} className="text-gray-400 hover:text-red-500"><X size={14}/></button>
                                        </div>
                                    )
                                })}
                                {selectedCocktails.length === 0 && <div className="col-span-2 text-center text-xs text-gray-400 italic py-2">Agrega cocteles para comenzar el cálculo.</div>}
                            </div>
                        </div>
                    </div>
                </Disclosure.Panel>
                </div>
            )}
            </Disclosure>

            {/* ✅ 2. NUEVA SECCIÓN: INSUMOS EXTRA */}
            <Disclosure>
            {({ open }) => (
                <div className="border border-gray-200 rounded-xl">
                <Disclosure.Button className="w-full flex justify-between items-center px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-xl">
                    <span className="text-sm font-bold text-gray-700 flex items-center gap-2"><ShoppingBasket size={16}/> Insumos Extra ({extraItems.length})</span>
                    <ChevronUp className={`${open ? '' : 'rotate-180'} transform transition-transform text-gray-500`} size={16} />
                </Disclosure.Button>
                <Disclosure.Panel className="p-4 bg-white rounded-b-xl">
                    <div className="flex flex-col gap-6">
                        {/* ⚠️ CAMBIO PRINCIPAL: BUSCADOR A 100% WIDTH */}
                        <div className="w-full space-y-2 relative z-10">
                            <label className="text-xs font-bold text-gray-400 uppercase">Buscar Insumo (Vino, Cerveza...)</label>
                            <Combobox value={null} onChange={(val: any) => addExtraItem(val)}>
                                <div className="relative">
                                    <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left border border-gray-300 focus-within:ring-2 focus-within:ring-primary-500 sm:text-sm">
                                        <Combobox.Input className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0" onChange={(event) => setExtraQuery(event.target.value)} placeholder="Ej: Vino Blanco..."/>
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-2"><Search className="h-4 w-4 text-gray-400" /></div>
                                    </div>
                                    <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0" afterLeave={() => setExtraQuery('')}>
                                        <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-50 border border-gray-100">
                                            {filteredIngredients.length === 0 && extraQuery !== '' ? (
                                                <div className="relative cursor-default select-none py-2 px-4 text-gray-700">No encontrado.</div>
                                            ) : (
                                                filteredIngredients.map((ing) => (
                                                    <Combobox.Option key={ing.id} className={({ active }) => `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-primary-600 text-white' : 'text-gray-900'}`} value={ing}>
                                                        {({ selected, active }) => (
                                                            <><span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>{ing.name} ({ing.purchase_unit})</span>{selected ? <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-white' : 'text-primary-600'}`}><Plus className="h-4 w-4"/></span> : null}</>
                                                        )}
                                                    </Combobox.Option>
                                                ))
                                            )}
                                        </Combobox.Options>
                                    </Transition>
                                </div>
                            </Combobox>
                        </div>
                        {/* LISTA DE ITEMS TAMBIÉN A FULL WIDTH */}
                        <div className="w-full">
                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-2">
                                {extraItems.map(item => {
                                    const ing = ingredients.find(i => i.id === item.ingredientId);
                                    if(!ing) return null;
                                    return (
                                        <div key={item.ingredientId} className="flex items-center gap-2 bg-yellow-50 p-2 rounded-lg border border-yellow-100">
                                            <span className="flex-1 text-xs font-medium truncate" title={ing.name}>{ing.name}</span>
                                            <input 
                                                type="number" 
                                                min="1" 
                                                value={item.quantity} 
                                                onChange={(e) => updateExtraQuantity(item.ingredientId, Number(e.target.value))} 
                                                className={`w-16 text-right p-1 text-xs ${inputFocusClass}`}
                                            />
                                            <span className="text-xs text-gray-400 w-12 truncate">{ing.purchase_unit}s</span>
                                            <button onClick={() => removeExtraItem(item.ingredientId)} className="text-gray-400 hover:text-red-500"><X size={14}/></button>
                                        </div>
                                    )
                                })}
                                {extraItems.length === 0 && <div className="col-span-3 text-center text-xs text-gray-400 italic py-2">No hay insumos extra agregados.</div>}
                             </div>
                        </div>
                    </div>
                </Disclosure.Panel>
                </div>
            )}
            </Disclosure>
        </div>
      </div>

      {/* --- TABLA DE RESULTADOS --- */}
      <div className="bg-gray-50 p-4 lg:p-6">
         {shoppingList.length > 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
               <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                     <thead className="bg-gray-100 text-gray-600 font-bold uppercase text-xs sticky top-0 z-10 shadow-sm">
                        <tr>
                           <th className="px-6 py-3">Insumo</th>
                           <th className="px-6 py-3">Categoría</th>
                           <th className="px-6 py-3">Unidad Compra</th>
                           <th className="px-6 py-3 text-right">Cantidad Total</th>
                           <th className="px-6 py-3 text-right">Costo Est.</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-50">
                        {shoppingList.map((item) => (
                           <tr key={item.ingredientId} className={`hover:bg-blue-50/50 transition-colors ${item.ingredientId === 'ice-auto-generated' ? 'bg-blue-50/20' : ''}`}>
                              <td className="px-6 py-3 font-medium text-gray-800">{item.ingredientName}</td>
                              <td className="px-6 py-3"><span className="text-[10px] font-bold uppercase px-2 py-1 bg-gray-100 text-gray-500 rounded border border-gray-200">{item.category}</span></td>
                              <td className="px-6 py-3 text-gray-500">{item.purchaseUnit}</td>
                              <td className="px-6 py-3 text-right font-bold text-primary-700 text-lg">{item.details.split(' ')[0]} <span className="text-xs text-gray-400 font-normal">{item.details.split(' ').slice(1).join(' ')}</span></td>
                              <td className="px-6 py-3 text-right font-mono text-gray-600">S/ {item.totalCost.toFixed(2)}</td>
                           </tr>
                        ))}
                     </tbody>
                     <tfoot className="bg-gray-50 border-t border-gray-200 font-bold text-gray-800">
                        <tr>
                           <td colSpan={4} className="px-6 py-3 text-right uppercase text-xs">Total Estimado</td>
                           <td className="px-6 py-3 text-right text-lg text-primary-700">S/ {shoppingList.reduce((acc, item) => acc + item.totalCost, 0).toFixed(2)}</td>
                        </tr>
                     </tfoot>
                  </table>
               </div>
            </div>
         ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 min-h-[300px]">
               <AlertTriangle size={48} className="mb-4 opacity-20"/>
               <p>Configura los parámetros y cocteles para ver los resultados.</p>
            </div>
         )}
      </div>
    </div>
  );
}