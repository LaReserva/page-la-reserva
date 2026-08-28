// src/components/sections/TestimonialsSlider.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Testimonial } from '@/types';

interface TestimonialsSliderProps {
  testimonials: Testimonial[];
}

export function TestimonialsSlider({ testimonials }: TestimonialsSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const length = testimonials.length;

  useEffect(() => {
    const timer = setInterval(() => {
      handleNext();
    }, 8000); // 8 segundos para una lectura cómoda de múltiples tarjetas

    return () => clearInterval(timer);
  }, [currentIndex, length]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + length) % length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  if (!testimonials || length === 0) return null;

  const formatEventType = (event: string) => {
    if (!event) return '';
    const containsLima = /lima/i.test(event);
    return containsLima ? event : `${event} · Lima`;
  };

  const renderStars = (rating: number) => {
    return (
      <div 
        className="flex gap-1 text-sm tracking-widest text-primary-500 font-sans mt-2" 
        aria-label={`Calificación de ${rating} de 5 estrellas`}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className={i < rating ? 'text-primary-500' : 'text-secondary-300'}>
            ★
          </span>
        ))}
      </div>
    );
  };

  const visibleCount = Math.min(length, 3);

  return (
    <div 
      className="relative max-w-6xl mx-auto px-6 md:px-12 select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10"
        >
          {Array.from({ length: visibleCount }).map((_, i) => {
            const item = testimonials[(currentIndex + i) % length];
            return (
              <div 
                key={item.id || i}
                className={`flex flex-col items-center justify-between text-center p-8 border border-secondary-200/50 rounded-lg bg-secondary-50/20 hover:border-primary-500/30 transition-all duration-300 min-h-[320px] ${
                  i === 1 ? 'hidden md:flex' : i === 2 ? 'hidden lg:flex' : 'flex'
                }`}
              >
                {/* Comilla Decorativa */}
                <span className="text-6xl font-display text-primary-500/30 leading-none select-none block h-8 -mt-2">
                  “
                </span>
                
                {/* Comentario principal */}
                <blockquote className="text-secondary-750 italic text-base md:text-lg leading-relaxed font-body flex-1 flex items-center justify-center px-2">
                  "{item.comment}"
                </blockquote>
                
                {/* Información del Cliente */}
                <div className="mt-6 flex flex-col items-center">
                  <p className="font-display font-bold text-lg text-secondary-900 leading-tight">
                    {item.client_name}
                  </p>
                  <p className="text-secondary-400 text-xs font-semibold uppercase tracking-widest mt-1.5">
                    {formatEventType(item.event_type)}
                  </p>
                  {renderStars(item.rating)}
                </div>
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* Botones de Navegación */}
      <button
        onClick={handlePrev}
        className="absolute -left-2 md:-left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full border border-secondary-200 bg-white text-secondary-650 hover:text-primary-600 hover:border-primary-500 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary-500/50"
        aria-label="Testimonio anterior"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <button
        onClick={handleNext}
        className="absolute -right-2 md:-right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full border border-secondary-200 bg-white text-secondary-650 hover:text-primary-600 hover:border-primary-500 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary-500/50"
        aria-label="Siguiente testimonio"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Indicadores Minimalistas */}
      <div className="flex justify-center gap-2.5 mt-10">
        {testimonials.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              index === currentIndex
                ? 'bg-primary-500 w-6'
                : 'bg-secondary-300 w-1.5 hover:bg-primary-300'
            }`}
            aria-label={`Ir al testimonio ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}