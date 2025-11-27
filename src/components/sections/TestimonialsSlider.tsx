// src/components/sections/TestimonialsSlider.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react'; // Iconos Lucide
import type { Testimonial } from '@/types'; // Importamos el tipo global

interface TestimonialsSliderProps {
  testimonials: Testimonial[];
}

export function TestimonialsSlider({ testimonials }: TestimonialsSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  // Auto-play logic
  useEffect(() => {
    const timer = setInterval(() => {
      handleNext();
    }, 6000); // Aumenté a 6s para dar tiempo a leer

    return () => clearInterval(timer);
  }, [currentIndex]);

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  // Evitar crash si el array llega vacío
  if (!testimonials || testimonials.length === 0) return null;

  const current = testimonials[currentIndex];

  const variants: Variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100, // Reduje la distancia para una animación más sutil
      opacity: 0,
      scale: 0.95,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 100 : -100,
      opacity: 0,
      scale: 0.95,
    }),
  };

  return (
    <div className="relative max-w-4xl mx-auto px-4 md:px-12">
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={currentIndex}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: 'spring', stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 },
          }}
          className="bg-white p-8 md:p-12 rounded-2xl shadow-xl border border-secondary-100 text-center relative"
        >
          {/* Quote Icon Decorativo */}
          <div className="absolute top-6 left-8 text-primary-200 opacity-50">
            <Quote size={48} />
          </div>

          {/* Stars */}
          <div className="flex justify-center gap-1 mb-6 relative z-10">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-5 h-5 ${
                  i < current.rating 
                    ? 'text-primary-500 fill-primary-500' 
                    : 'text-secondary-200'
                }`}
              />
            ))}
          </div>

          {/* Quote Text */}
          <blockquote className="text-xl md:text-2xl text-secondary-700 mb-8 font-display italic leading-relaxed relative z-10">
            "{current.comment}"
          </blockquote>

          {/* Author Info */}
          <div className="flex flex-col items-center relative z-10">
            {current.image_url ? (
              <img
                src={current.image_url}
                alt={current.client_name}
                className="w-16 h-16 rounded-full mb-4 object-cover border-2 border-primary-200 shadow-sm"
              />
            ) : (
              // Fallback avatar si no hay imagen
              <div className="w-16 h-16 rounded-full mb-4 bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-xl border-2 border-primary-200">
                {current.client_name.charAt(0)}
              </div>
            )}
            
            <div className="text-center">
              <p className="font-bold text-lg text-secondary-900">
                {current.client_name}
              </p>
              <p className="text-primary-600 text-sm font-medium tracking-wide uppercase mt-1">
                {current.event_type}
              </p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons - Posicionados absolutamente fuera del card en desktop */}
      <div className="hidden md:block">
        <button
          onClick={handlePrev}
          className="absolute left-0 top-1/2 -translate-y-1/2 p-3 bg-white text-secondary-600 rounded-full shadow-lg hover:bg-primary-50 hover:text-primary-600 transition-all hover:scale-110 z-20 border border-secondary-100"
          aria-label="Testimonio anterior"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <button
          onClick={handleNext}
          className="absolute right-0 top-1/2 -translate-y-1/2 p-3 bg-white text-secondary-600 rounded-full shadow-lg hover:bg-primary-50 hover:text-primary-600 transition-all hover:scale-110 z-20 border border-secondary-100"
          aria-label="Siguiente testimonio"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Dots Indicator - Debajo del card */}
      <div className="flex justify-center gap-3 mt-8">
        {testimonials.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setDirection(index > currentIndex ? 1 : -1);
              setCurrentIndex(index);
            }}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentIndex
                ? 'bg-primary-500 w-8'
                : 'bg-secondary-300 w-2 hover:bg-primary-300'
            }`}
            aria-label={`Ir a testimonio ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}