// src/components/admin/recipes/CocktailList.tsx
import { Search, Plus, GlassWater } from 'lucide-react';
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
}

export function CocktailList({ 
  cocktails, selectedId, onSelect, searchTerm, onSearchChange, isAdmin, onNewClick 
}: CocktailListProps) {
  
  const filtered = cocktails.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="lg:col-span-4 flex flex-col bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
      {/* Header Lista */}
      <div className="p-4 border-b border-secondary-100 bg-secondary-50/50">
        <h2 className="text-lg font-bold text-secondary-900 mb-3 flex items-center justify-between">
          Catálogo
          {isAdmin && (
            <button 
              onClick={onNewClick}
              className="text-xs bg-primary-600 text-white px-2 py-1 rounded hover:bg-primary-700 transition flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Nuevo
            </button>
          )}
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
          <input 
            type="text" 
            placeholder="Buscar..." 
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 outline-none"
          />
        </div>
      </div>
      
      {/* Lista Items */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.map(cocktail => (
          <button
            key={cocktail.id}
            onClick={() => onSelect(cocktail.id)}
            className={cn(
              "w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all",
              selectedId === cocktail.id 
                ? "bg-primary-50 border-primary-200 ring-1 ring-primary-500/30" 
                : "hover:bg-secondary-50 border border-transparent"
            )}
          >
            <div className="w-10 h-10 rounded-full bg-secondary-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {cocktail.image_url ? (
                <img src={cocktail.image_url} alt={cocktail.name} className="w-full h-full object-cover" />
              ) : (
                <GlassWater className="w-5 h-5 text-secondary-400" />
              )}
            </div>
            <div className="min-w-0">
              <div className={cn("font-semibold text-sm truncate", selectedId === cocktail.id ? "text-primary-900" : "text-secondary-900")}>
                {cocktail.name}
              </div>
              <div className="text-xs text-secondary-500 truncate">
                {cocktail.description || "Sin descripción"}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}