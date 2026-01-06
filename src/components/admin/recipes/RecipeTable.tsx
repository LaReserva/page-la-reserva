import { useState, useEffect, useRef } from 'react';
import { Loader2, Trash2, Package, Wine, GlassWater, ScrollText, Search, Plus, X } from 'lucide-react';
import type { Cocktail, Ingredient, RecipeItem } from '@/types';
import { UNIT_OPTIONS, calculatePurchaseRequirement } from '@/utils/conversions';

interface RecipeTableProps {
  cocktail: Cocktail | undefined;
  recipe: RecipeItem[];
  loadingRecipe: boolean;
  isAdmin: boolean;
  ingredients: Ingredient[];
  testQty: number;
  onTestQtyChange: (n: number) => void;
  onUpdateQty: (id: string, qty: number) => void;
  onUpdateUnit: (id: string, unit: string) => void;
  onDeleteFromRecipe: (id: string) => void;
  onAddToRecipe: (ingId: string) => void;
  onOpenCatalog: () => void;
  onOpenInstructions: () => void; // ✅ NUEVO: Abrir modal de receta
}

export function RecipeTable({
  cocktail, recipe, loadingRecipe, isAdmin, ingredients,
  testQty, onTestQtyChange, onUpdateQty, onUpdateUnit, onDeleteFromRecipe, onAddToRecipe, onOpenCatalog, onOpenInstructions
}: RecipeTableProps) {

  // Estado para el buscador de ingredientes
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Cerrar el buscador si hago clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  // Filtrar ingredientes
  const filteredIngredients = ingredients.filter(ing => 
    ing.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!cocktail) {
    return (
      <div className="lg:col-span-8 flex flex-col items-center justify-center h-full bg-white rounded-xl shadow-sm border border-secondary-200 text-secondary-400 p-10 min-h-[500px]">
        <div className="w-16 h-16 bg-secondary-50 rounded-full flex items-center justify-center mb-4">
          <Wine className="w-8 h-8 text-secondary-300" />
        </div>
        <p className="text-lg font-medium text-secondary-600">Selecciona un coctel</p>
      </div>
    );
  }

  return (
    <div className="lg:col-span-8 flex flex-col bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden h-full">
      {/* HEADER */}
      <div className="p-6 border-b border-secondary-100 flex flex-col md:flex-row justify-between items-start gap-4 bg-gradient-to-r from-white to-secondary-50">
        <div className="flex gap-5 flex-1">
           <div className="w-20 h-20 rounded-xl bg-secondary-100 flex items-center justify-center border border-secondary-200 shadow-sm overflow-hidden flex-shrink-0">
            {cocktail.image_url ? (
              <img src={cocktail.image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <GlassWater className="w-8 h-8 text-secondary-300" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">{cocktail.name}</h1>
            <p className="text-sm text-secondary-500 mb-3">{cocktail.description}</p>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Input Prueba de Cálculo Mejorado */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-wider hidden sm:block">
                  Prueba de Cálculo:
                </span>
                <div className="relative group">
                  {/* Icono Izquierda */}
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <GlassWater className="h-5 w-5 text-primary-500" />
                  </div>
                  
                  {/* Input Principal */}
                  <input 
                    type="number" 
                    min="1"
                    value={testQty}
                    onChange={(e) => onTestQtyChange(Math.max(1, parseInt(e.target.value) || 0))}
                    className="pl-10 pr-16 py-2 w-40 sm:w-44 bg-white border border-secondary-300 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-bold text-2xl text-secondary-900 outline-none transition-all"
                  />
                  
                  {/* Texto Derecha (Unidad) */}
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-wide">
                      Cocteles
                    </span>
                  </div>
                </div>
              </div>

              {/* ✅ BOTÓN RECETA (NUEVO) */}
              <button 
                onClick={onOpenInstructions}
                className="flex items-center gap-2 px-3 py-1.5 bg-secondary-900 text-white rounded-lg hover:bg-black transition-all shadow-md active:scale-95 ml-2"
                title="Ver Ficha Técnica y Preparación"
              >
                <ScrollText className="w-4 h-4" />
                <span className="text-xs font-bold">Ficha Técnica</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TABLA */}
      <div className="flex-1 overflow-auto p-6 bg-secondary-50/30">
        {loadingRecipe ? (
          <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary-600 mr-2" /> Cargando receta...</div>
        ) : recipe.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-40 text-secondary-400 border-2 border-dashed border-secondary-200 rounded-xl">
              <Package className="w-8 h-8 mb-2 opacity-30" />
              <p className="font-medium">Receta vacía</p>
           </div>
        ) : (
          <div className="space-y-3">
            {recipe.map((item) => {
              const ing = item.ingredient!;
              const purchaseAmount = calculatePurchaseRequirement(item.quantity, item.unit, testQty, ing);
              
              return (
                <div key={item.id} className="bg-white rounded-xl border border-secondary-200 p-4 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-center gap-4 group">
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-secondary-900 truncate">{ing.name}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary-100 text-secondary-600 uppercase font-medium">{ing.category}</span>
                    </div>
                    <div className="text-xs text-secondary-500 flex items-center gap-1 flex-wrap">
                      <span className="font-medium text-secondary-700 bg-secondary-50 px-1.5 py-0.5 rounded border border-secondary-100">
                        1 {ing.purchase_unit} = {ing.package_volume} {ing.measurement_unit}
                      </span>
                      {ing.yield_pieces && ing.yield_pieces > 0 && (
                        <span className="text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-100 font-medium text-[10px]">
                          Rinde {ing.yield_pieces} pz
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end md:items-center w-full md:w-auto">
                    <label className="text-[10px] font-bold text-secondary-400 uppercase mb-1.5 hidden md:block">Receta Unitari</label>
                    <div className="flex rounded-md shadow-sm w-full md:w-auto">
                       {isAdmin ? (
                         <input 
                           type="number" step="0.25" min="0" value={item.quantity}
                           onChange={(e) => onUpdateQty(item.id, parseFloat(e.target.value))}
                           className="flex-1 md:w-20 px-3 py-1.5 text-right font-mono font-bold text-secondary-900 border border-r-0 border-secondary-300 rounded-l-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                         />
                       ) : (
                         <span className="flex-1 md:w-20 px-3 py-1.5 text-right font-mono font-bold bg-secondary-50 border border-r-0 border-secondary-200 rounded-l-lg block">{item.quantity}</span>
                       )}
                       <select 
                         value={item.unit}
                         onChange={(e) => onUpdateUnit(item.id, e.target.value)}
                         disabled={!isAdmin}
                         className="w-20 px-2 py-1.5 bg-secondary-50 border border-secondary-300 rounded-r-lg text-xs font-medium text-secondary-700 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none hover:bg-secondary-100 cursor-pointer"
                       >
                         {UNIT_OPTIONS.map(u => (<option key={u.value} value={u.value}>{u.label}</option>))}
                       </select>
                    </div>
                  </div>

                  <div className="flex flex-row md:flex-col justify-between md:justify-center items-center md:items-end w-full md:min-w-[120px] md:w-auto border-t md:border-t-0 border-secondary-100 pt-2 md:pt-0 mt-2 md:mt-0">
                    <label className="text-[10px] font-bold text-secondary-400 uppercase md:mb-1.5">Requerimiento Total</label>
                    <div className="text-right flex items-baseline gap-1 md:block">
                      <div className="text-lg font-bold text-primary-700 leading-none">
                        {purchaseAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs font-medium text-secondary-500 md:mt-0.5">{ing.purchase_unit}s</div>
                    </div>
                  </div>

                  {isAdmin && (
                    <button onClick={() => onDeleteFromRecipe(item.id)} className="hidden md:flex p-2 text-secondary-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* --- FOOTER: AGREGAR INGREDIENTES (BUSCADOR) --- */}
        {isAdmin && (
          <div className="mt-6 bg-white p-4 rounded-xl border border-secondary-200 shadow-sm sticky bottom-0 z-20">
             <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold text-secondary-500 uppercase flex items-center gap-2">
                   <Package className="w-4 h-4" /> Agregar a la Receta
                </h3>
                <button 
                    onClick={onOpenCatalog}
                    className="text-xs flex items-center gap-1.5 text-primary-600 bg-primary-50 px-3 py-1.5 rounded-lg hover:bg-primary-100 font-bold transition-colors border border-primary-100"
                >
                    <Package className="w-3.5 h-3.5" /> Gestionar Catálogo
                </button>
             </div>
             
             {/* ✅ BUSCADOR PERSONALIZADO (COMBOBOX) */}
             <div className="relative" ref={wrapperRef}>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-secondary-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar insumo para agregar..."
                    value={searchQuery}
                    onFocus={() => setIsSearchOpen(true)}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsSearchOpen(true);
                    }}
                    className="w-full pl-9 pr-10 py-2.5 text-sm border border-secondary-300 rounded-lg shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => { setSearchQuery(''); setIsSearchOpen(false); }}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary-400 hover:text-secondary-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* LISTA DESPLEGABLE */}
                {isSearchOpen && (
                  <div className="absolute bottom-full mb-1 w-full bg-white rounded-lg border border-secondary-200 shadow-xl max-h-60 overflow-y-auto z-50">
                    {filteredIngredients.length === 0 ? (
                      <div className="p-3 text-sm text-secondary-400 text-center">No se encontraron insumos.</div>
                    ) : (
                      filteredIngredients.map(ing => (
                        <button
                          key={ing.id}
                          onClick={() => {
                            onAddToRecipe(ing.id);
                            setSearchQuery('');
                            setIsSearchOpen(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-primary-50 hover:text-primary-700 transition-colors flex justify-between items-center border-b border-secondary-50 last:border-0"
                        >
                          <span className="font-medium">{ing.name}</span>
                          <span className="text-xs text-secondary-400">{ing.package_volume} {ing.measurement_unit}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
             </div>
          </div>
        )}
      </div>
    </div>
  );
}