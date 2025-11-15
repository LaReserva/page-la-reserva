// src/components/sections/TestimonialsSlider.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Testimonial {
  id: string;
  client_name: string;
  event_type: string;
  rating: number;
  comment: string;
  image_url?: string;
}

interface TestimonialsSliderProps {
  testimonials: Testimonial[];
}

export function TestimonialsSlider({ testimonials }: TestimonialsSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      handleNext();
    }, 5000);

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

  const current = testimonials[currentIndex];

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  return (
    <div className="relative max-w-4xl mx-auto">
      <AnimatePresence initial={false} custom={direction}>
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
          className="bg-white p-8 md:p-12 rounded-lg shadow-xl"
        >
          {/* Stars */}
          <div className="flex justify-center mb-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg
                key={i}
                className={`w-6 h-6 ${
                  i < current.rating ? 'text-primary-500' : 'text-secondary-200'
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>

          {/* Quote */}
          <blockquote className="text-xl md:text-2xl text-center text-secondary-600 mb-8 font-display italic">
            "{current.comment}"
          </blockquote>

          {/* Author */}
          <div className="flex flex-col items-center">
            {current.image_url && (
              <img
                src={current.image_url}
                alt={current.client_name}
                className="w-16 h-16 rounded-full mb-4 object-cover"
              />
            )}
            <p className="font-semibold text-lg text-secondary-600">
              {current.client_name}
            </p>
            <p className="text-secondary-400 text-sm">
              {current.event_type}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      <button
        onClick={handlePrev}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 p-3 bg-white rounded-full shadow-lg hover:bg-secondary-50 transition-colors"
        aria-label="Testimonio anterior"
      >
        <svg className="w-6 h-6 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        onClick={handleNext}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 p-3 bg-white rounded-full shadow-lg hover:bg-secondary-50 transition-colors"
        aria-label="Siguiente testimonio"
      >
        <svg className="w-6 h-6 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Dots Indicator */}
      <div className="flex justify-center gap-2 mt-8">
        {testimonials.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setDirection(index > currentIndex ? 1 : -1);
              setCurrentIndex(index);
            }}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentIndex
                ? 'bg-primary-500 w-8'
                : 'bg-secondary-300 hover:bg-secondary-400'
            }`}
            aria-label={`Ir a testimonio ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}