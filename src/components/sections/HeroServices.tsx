// src/components/sections/HeroServices.tsx
import { motion } from 'framer-motion';

interface HeroServicesProps {
  title: string;
  subtitle: string;
  imageDesktop: string;
  imageTablet: string;
  imageMobile: string;
}

export function HeroServices({
  title,
  subtitle,
  imageDesktop,
  imageTablet,
  imageMobile,
}: HeroServicesProps) {
  
  return (
    <section className="relative w-full h-[60vh] min-h-[500px] flex items-center overflow-hidden bg-secondary-900">
      
      {/* 1. IMAGEN DE FONDO */}
      <div className="absolute inset-0 z-0">
        <picture>
          <source media="(min-width: 1024px)" srcSet={imageDesktop} />
          <source media="(min-width: 768px)" srcSet={imageTablet} />
          <img 
            src={imageMobile} 
            alt="Fondo de servicios" 
            className="w-full h-full object-cover"
          />
        </picture>
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-secondary-900/95 via-secondary-900/80 to-transparent" />
      </div>

      {/* 2. CONTENIDO */}
      {/* CORRECCIÓN 1: Usamos 'container-custom' para alinear con el grid de abajo */}
      <div className="relative z-10 container-custom h-full flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          // CORRECCIÓN 2: Agregamos 'md:ml-12 lg:ml-20' para empujar el texto a la derecha
          className="max-w-2xl md:ml-12 lg:ml-20"
        >
          {/* Badge */}
          <span className="inline-block py-1 px-3 mb-6 rounded-full border border-primary-500/50 bg-black/30 backdrop-blur-sm text-primary-400 text-sm font-semibold tracking-widest uppercase">
            Nuestra Propuesta
          </span>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-6 leading-tight drop-shadow-lg">
            {title}
          </h1>
          
          <p className="text-lg md:text-xl text-secondary-100 font-light leading-relaxed border-l-4 border-primary-500 pl-6">
            {subtitle}
          </p>
        </motion.div>
      </div>
    </section>
  );
}