// src/components/sections/PortfolioGrid.tsx
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter } from 'lucide-react';
import type { EventImageWithEvent } from '@/types'; // Usamos el tipo extendido que incluye el evento

interface PortfolioGridProps {
  images: EventImageWithEvent[];
}

export function PortfolioGrid({ images }: PortfolioGridProps) {
  const [activeFilter, setActiveFilter] = useState('Todos');

  // 1. Extraer categorías únicas de las imágenes disponibles
  const categories = useMemo(() => {
    const cats = new Set(images.map(img => img.event?.event_type || 'Otros'));
    return ['Todos', ...Array.from(cats)];
  }, [images]);

  // 2. Filtrar imágenes
  const filteredImages = useMemo(() => {
    if (activeFilter === 'Todos') return images;
    return images.filter(img => img.event?.event_type === activeFilter);
  }, [images, activeFilter]);

  return (
    <div className="space-y-12">
      
      {/* BARRA DE FILTROS */}
      <div className="flex flex-col md:flex-row justify-center items-center gap-4">
        <div className="flex items-center gap-2 text-secondary-500 font-medium md:hidden">
          <Filter className="w-4 h-4" />
          <span>Filtrar por:</span>
        </div>
        
        <div className="flex flex-wrap justify-center gap-3">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`
                px-6 py-2 rounded-full text-sm font-bold uppercase tracking-wider transition-all duration-300
                ${activeFilter === cat 
                  ? 'bg-primary-500 text-secondary-900 shadow-gold scale-105' 
                  : 'bg-white text-secondary-500 hover:bg-secondary-50 border border-secondary-200'
                }
              `}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* GRID DE IMÁGENES */}
      <motion.div 
        layout
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <AnimatePresence mode="popLayout">
          {filteredImages.map((img) => (
            <motion.div
              key={img.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.4 }}
              className="group relative aspect-[3/4] overflow-hidden rounded-xl bg-secondary-100 cursor-pointer"
            >
              {/* Imagen */}
              <img
                src={img.image_url}
                alt={img.caption || 'Evento La Reserva'}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
              />

              {/* Overlay al Hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                <p className="text-primary-400 text-xs font-bold uppercase tracking-widest mb-1">
                  {img.event?.event_type}
                </p>
                <p className="text-white text-lg font-display font-bold">
                  {img.caption || 'Experiencia La Reserva'}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Mensaje si no hay resultados (raro pero posible) */}
      {filteredImages.length === 0 && (
        <div className="text-center py-20">
          <p className="text-secondary-400">No hay imágenes en esta categoría.</p>
        </div>
      )}
    </div>
  );
}