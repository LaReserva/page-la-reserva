import { useMemo, Fragment } from 'react';
import { Search, Plus, GlassWater, Filter, Check } from 'lucide-react';
import { Listbox, Transition } from '@headlessui/react';
import type { CocktailWithTags } from '@/types';
import { cn } from '@/utils/utils';

interface CocktailListProps {
  cocktails: CocktailWithTags[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filterLiquor: string;
  onFilterLiquorChange: (liquor: string) => void;
  isAdmin: boolean;
  onNewClick: () => void;
}

export function CocktailList({ 
  cocktails, selectedId, onSelect, 
  searchTerm, onSearchChange, 
  filterLiquor, onFilterLiquorChange,
  isAdmin, onNewClick 
}: CocktailListProps) {
  
  const availableLiquors = useMemo(() => {
    const liquors = new Set<string>(['Todos']);
    cocktails.forEach(c => { if (c.main_liquor) liquors.add(c.main_liquor); });
    return Array.from(liquors).sort();
  }, [cocktails]);

  const filtered = cocktails.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.search_tags.some(tag => tag.includes(searchTerm.toLowerCase()));
    const matchesLiquor = filterLiquor === 'Todos' || c.main_liquor === filterLiquor;
    return matchesSearch && matchesLiquor;
  });

  return (
    <div className="w-full lg:col-span-4 flex flex-col bg-white rounded-2xl shadow-sm border border-secondary-200 overflow-hidden h-[500px] lg:h-full">
      
      {/* HEADER */}
      <div className="p-4 border-b border-secondary-100 bg-secondary-50/50 space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-secondary-900">Catálogo</h2>
          {isAdmin && (
            <button onClick={onNewClick} className="text-xs bg-primary-600 text-white px-3 py-1.5 rounded-lg hover:bg-primary-700 transition flex items-center gap-1 font-medium shadow-sm shadow-primary-500/20">
              <Plus className="w-3.5 h-3.5" /> Nuevo
            </button>
          )}
        </div>

        {/* BUSCADOR */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
          <input 
            type="text" 
            placeholder="Buscar por nombre o ingrediente..." 
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-secondary-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all bg-white"
          />
        </div>

        {/* FILTRO DROPDOWN (Compatible v1.7) */}
        <div className="relative z-20">
            <Listbox value={filterLiquor} onChange={onFilterLiquorChange}>
              <div className="relative mt-1">
                <Listbox.Button className="relative w-full cursor-pointer rounded-xl bg-white py-2 pl-3 pr-10 text-left border border-secondary-200 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 sm:text-sm shadow-sm transition-colors hover:bg-gray-50">
                  <span className="block truncate text-secondary-700 font-medium">
                    <span className="text-secondary-400 mr-2">Licor:</span> {filterLiquor}
                  </span>
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <Filter className="h-4 w-4 text-secondary-400" />
                  </span>
                </Listbox.Button>
                
                <Transition
                  as={Fragment}
                  leave="transition ease-in duration-100"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm border border-secondary-100 z-50">
                    {availableLiquors.map((liquor, idx) => (
                      <Listbox.Option
                        key={idx}
                        value={liquor}
                        className={({ active }) =>
                          `relative cursor-default select-none py-2 pl-10 pr-4 ${
                            active ? 'bg-primary-50 text-primary-900' : 'text-secondary-900'
                          }`
                        }
                      >
                        {({ selected }) => (
                          <>
                            <span className={`block truncate ${selected ? 'font-bold' : 'font-normal'}`}>
                              {liquor}
                            </span>
                            {selected ? (
                              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-600">
                                <Check className="h-4 w-4" />
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

      {/* LISTA DE ITEMS */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {filtered.length === 0 ? (
           <div className="text-center py-10 text-secondary-400 text-sm flex flex-col items-center">
             <GlassWater className="w-8 h-8 opacity-20 mb-2" />
             No hay resultados.
           </div>
        ) : (
           filtered.map(cocktail => (
             <div
                key={cocktail.id}
                onClick={() => onSelect(cocktail.id)}
                className={cn(
                  "w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all cursor-pointer border group",
                  selectedId === cocktail.id 
                    ? "bg-primary-50/50 border-primary-200 ring-1 ring-primary-500/30" 
                    : "bg-transparent border-transparent hover:bg-secondary-50 hover:border-secondary-200"
                )}
             >
                <div className="w-12 h-12 rounded-lg bg-white border border-secondary-100 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
                   {cocktail.image_url ? (
                     <img src={cocktail.image_url} alt={cocktail.name} className="w-full h-full object-cover" />
                   ) : (
                     <GlassWater className="w-5 h-5 text-secondary-300" />
                   )}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex justify-between items-start">
                        <div className={cn("font-bold text-sm truncate", selectedId === cocktail.id ? "text-primary-900" : "text-secondary-900")}>
                            {cocktail.name}
                        </div>
                        {cocktail.main_liquor && cocktail.main_liquor !== 'Otro' && (
                            <span className="text-[10px] bg-secondary-100 text-secondary-600 px-1.5 py-0.5 rounded font-medium">
                                {cocktail.main_liquor}
                            </span>
                        )}
                    </div>
                    <div className="text-xs text-secondary-500 truncate mt-0.5">
                        {cocktail.description || "Sin descripción"}
                    </div>
                </div>
             </div>
           ))
        )}
      </div>
    </div>
  );
}