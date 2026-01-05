// src/components/admin/recipes/CocktailList.tsx
import { Search, Plus, GlassWater, Trash2 } from 'lucide-react';
import type { Cocktail } from '@/types';
import { cn } from '@/utils/utils';

interface CocktailListProps {
  cocktails: Cocktail[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  isAdmin: boolean;
  onNewClick: () => void;
  onDelete: (id: string) => void;
}

export function CocktailList({ 
  cocktails, selectedId, onSelect, searchTerm, onSearchChange, isAdmin, onNewClick, onDelete
}: CocktailListProps) {
  
  const filtered = cocktails.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    // ✅ CAMBIOS DE DISEÑO MÓVIL:
    // - 'w-full': Ocupa todo el ancho.
    // - 'min-h-[400px]': Altura mínima en móvil.
    // - 'lg:h-auto': Altura automática en desktop (se ajusta al padre).
    // - 'lg:col-span-4': Vuelve a 4 columnas en desktop.
    <div className="w-full min-h-[400px] lg:h-auto lg:col-span-4 flex flex-col bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
      
      {/* Header Lista */}
      <div className="p-4 border-b border-secondary-100 bg-secondary-50/50">
        <h2 className="text-lg font-bold text-secondary-900 mb-3 flex items-center justify-between">
          Catálogo
          {isAdmin && (
            <button 
              onClick={onNewClick}
              className="text-xs bg-primary-600 text-white px-3 py-1.5 rounded-lg hover:bg-primary-700 transition flex items-center gap-1.5 font-medium"
            >
              <Plus className="w-3.5 h-3.5" /> Nuevo
            </button>
          )}
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
          <input 
            type="text" 
            placeholder="Buscar coctel..." 
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-secondary-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
          />
        </div>
      </div>
      
      {/* Lista Items */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {filtered.length === 0 ? (
            <div className="text-center py-8 text-secondary-400 text-sm">
                No se encontraron cocteles.
            </div>
        ) : (
            filtered.map(cocktail => (
            <div
                key={cocktail.id}
                onClick={() => onSelect(cocktail.id)}
                className={cn(
                "w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 transition-all group cursor-pointer relative",
                selectedId === cocktail.id 
                    ? "bg-primary-50 border border-primary-200 ring-1 ring-primary-500/30 shadow-sm" 
                    : "hover:bg-secondary-50 border border-transparent"
                )}
            >
                <div className="w-12 h-12 rounded-lg bg-secondary-100 flex items-center justify-center flex-shrink-0 overflow-hidden border border-secondary-200 group-hover:border-secondary-300 transition-colors">
                    {cocktail.image_url ? (
                        <img src={cocktail.image_url} alt={cocktail.name} className="w-full h-full object-cover" />
                    ) : (
                        <GlassWater className="w-6 h-6 text-secondary-300" />
                    )}
                </div>
                
                <div className="min-w-0 flex-1">
                    <div className={cn("font-bold text-sm truncate transition-colors pr-6", selectedId === cocktail.id ? "text-primary-900" : "text-secondary-900 group-hover:text-primary-700")}>
                        {cocktail.name}
                    </div>
                    <div className="text-xs text-secondary-500 truncate mt-0.5">
                        {cocktail.description || "Sin descripción"}
                    </div>
                </div>

                {/* Botón de Eliminar (Solo Admin) */}
                {isAdmin && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(cocktail.id);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-secondary-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Eliminar coctel"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>
            ))
        )}
      </div>
    </div>
  );
}