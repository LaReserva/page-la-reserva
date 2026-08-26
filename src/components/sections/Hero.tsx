// src/components/sections/Hero.tsx
import { motion, type Variants } from 'framer-motion';
import { ChevronDown } from 'lucide-react';


interface HeroProps {
  title: string;
  subtitle: string;
  ctaPrimary?: { text: string; href: string };
  ctaSecondary?: { text: string; href: string };
  videoDesktop?: string;
  videoMobile?: string;
  poster?: string;
  backgroundImage?: string;
  whatsappUrl?: string; // ✅ NUEVO: Agregamos esta propiedad opcional
}

export function Hero({
  title,
  subtitle,
  ctaPrimary = { text: 'Cotizar Evento', href: '/cotizacion' },
  ctaSecondary = { text: 'Ver Portafolio', href: '/portafolio' },
  videoDesktop = '/videos/hero-desktop.mp4',
  videoMobile = '/videos/hero-mobile.mp4',
  poster = '/images/hero-bg.jpg',
  backgroundImage,
  whatsappUrl, // ✅ NUEVO: La recibimos aquí
}: HeroProps) {
  
  const bgImage = poster || backgroundImage || '/images/hero-bg.jpg';



  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.3 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" }
    },
  };

  return (
    <section className="relative h-[calc(100dvh-5rem)] w-full flex items-center justify-center overflow-hidden bg-secondary-900">
      
      {/* 1. CAPA DE VIDEO (Fondo) */}
      <div className="absolute inset-0 z-0 w-full h-full">
        {videoDesktop && (
          <video
            className="hidden md:block w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            poster={bgImage}
          >
            <source src={videoDesktop} type="video/mp4" />
          </video>
        )}
        {videoMobile && (
          <video
            className="block md:hidden w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            poster={bgImage}
          >
            <source src={videoMobile} type="video/mp4" />
          </video>
        )}
        <div 
          className={`w-full h-full bg-cover bg-center ${videoDesktop || videoMobile ? 'hidden' : 'block'}`}
          style={{ backgroundImage: `url(${bgImage})` }} 
        />
      </div>

      {/* 2. CAPA DE OVERLAY */}
      <div className="absolute inset-0 z-10 bg-black/50" />

      {/* 3. CAPA DE CONTENIDO */}
      <div className="relative z-20 container mx-auto px-4 h-full flex flex-col justify-center text-center text-white">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto"
        >
          {/* Título */}
          <motion.h1 
            variants={itemVariants}
            className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-white mb-4 md:mb-6 leading-tight tracking-wide drop-shadow-lg"
          >
            {title}
          </motion.h1>
          
          {/* Subtítulo */}
          <motion.p
            variants={itemVariants}
            className="text-lg md:text-2xl text-white/90 mb-8 md:mb-10 max-w-2xl mx-auto font-light drop-shadow-md"
          >
            {subtitle}
          </motion.p>

          {/* Botones */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <a 
              href={ctaPrimary.href} 
              className="w-full sm:w-auto min-w-[200px] px-8 py-4 bg-gradient-to-r from-primary-500 to-accent-500 text-secondary-900 font-bold rounded-full uppercase tracking-wider hover:shadow-lg hover:scale-105 transition-all duration-300 border-none shadow-gold"
            >
              {ctaPrimary.text}
            </a>
            <a 
              href={ctaSecondary.href} 
              className="w-full sm:w-auto min-w-[200px] px-8 py-4 bg-transparent border-2 border-white text-white font-bold rounded-full uppercase tracking-wider hover:bg-white hover:text-secondary-900 transition-all duration-300"
            >
              {ctaSecondary.text}
            </a>
          </motion.div>

          {/* Categorías de eventos */}
          <motion.p
            variants={itemVariants}
            className="text-sm md:text-base text-white/70 mt-8 tracking-widest uppercase font-semibold"
          >
            Bodas · Cumpleaños · Eventos privados
          </motion.p>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="absolute bottom-8 md:bottom-10 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="text-white/80"
        >
          <ChevronDown className="w-8 h-8 md:w-10 md:h-10" />
        </motion.div>
      </motion.div>
    </section>
  );
}