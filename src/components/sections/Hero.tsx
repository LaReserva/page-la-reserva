// src/components/sections/Hero.tsx
import { motion, type Variants } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { getWhatsAppUrl } from '@/utils/whatsapp';

interface HeroProps {
  title: string;
  subtitle: string;
  ctaPrimary?: { text: string; href: string };
  ctaSecondary?: { text: string; href: string };
  videoDesktop?: string;
  videoMobile?: string;
  poster?: string;
  backgroundImage?: string;
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
}: HeroProps) {
  
  const bgImage = poster || backgroundImage || '/images/hero-bg.jpg';

  const handleWhatsApp = () => {
    const message = '¡Hola! Me gustaría obtener más información sobre sus servicios de bartending.';
    window.open(getWhatsAppUrl(message), '_blank', 'noopener,noreferrer');
  };

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
    // ✅ CORRECCIÓN AQUÍ: Restamos 5rem (80px) que corresponden a la altura del Header
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
          {/* Badge */}
          {/* <motion.div variants={itemVariants} className="mb-4 md:mb-6 flex justify-center">
            <span className="px-4 py-1.5 rounded-full border border-white/30 text-white text-xs md:text-sm font-medium tracking-widest uppercase bg-white/10 backdrop-blur-sm">
              Mixología Exclusiva
            </span>
          </motion.div> */}

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

      {/* WhatsApp Float Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1, type: "spring", stiffness: 260, damping: 20 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleWhatsApp}
        className="fixed bottom-6 right-6 z-40 bg-[#25D366] text-white p-3 md:p-4 rounded-full shadow-2xl flex items-center justify-center hover:shadow-[#25D366]/40 transition-shadow"
        aria-label="Contactar por WhatsApp"
      >
        <svg className="w-6 h-6 md:w-8 md:h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>
      </motion.button>
    </section>
  );
}