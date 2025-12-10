// src/utils/constants.ts

/**
 * LA RESERVA - CONSTANTES DEL PROYECTO
 * 
 * Centraliza todas las constantes utilizadas en el proyecto.
 * 
 * @version 1.0
 * @date Octubre 2025
 */

// ============================================
// 1. INFORMACIÓN BÁSICA
// ============================================
import { 
  Martini, 
  Briefcase, 
  Sparkles, 
  Truck, 
  Gem, 
  Building2, 
  Cake, 
  CalendarHeart, 
  GraduationCap, 
  Baby, 
  PartyPopper 
} from 'lucide-react';

export const SITE_URL = import.meta.env.PUBLIC_SITE_URL || 'https://lareserva.pe';
export const API_URL = `${SITE_URL}/api`;

export const SITE_INFO = {
  name: 'La Reserva',
  tagline: 'Mixología Exclusiva',
  fullName: 'La Reserva - Mixología Exclusiva',
  description: 'Bartender para eventos exclusivos en Lima, Perú.', //Revisar después
  location: 'Lima, Perú',
  founded: 2015,
  yearsOfExperience: 10,
} as const;

export const CONTACT_INFO = {
  phone: '+51989245091',
  phoneFormatted: '+51 989 245 091',
  email: 'lareservabartending@gmail.com',
  whatsapp: '+51989245091',
  whatsappUrl: 'https://wa.me/51989245091',
  address: 'Lima, Perú',
} as const;

export const BUSINESS_HOURS = {
  weekdays: 'Lunes - Viernes: 9:00 AM - 5:00 PM',
  saturday: 'Sábado: 9:00 AM - 1:00 PM',
  sunday: 'Domingo: Cerrado',
  responseTime: 'Respuestas dentro de 1 hora',
} as const;

export const SOCIAL_LINKS = {
  instagram: {
    url: 'https://www.instagram.com/la_reserva_bartending/',
    handle: '@lareservabar',
  },
  facebook: {
    url: 'https://www.facebook.com/profile.php?id=61582015389837',
    handle: 'La Reserva',
  },
  tiktok: {
    url: 'https://www.tiktok.com/@la_reserva_bartending?is_from_webapp=1&sender_device=pc',
    handle: '@lareserva',
  },
} as const;

// ============================================
// 2. LÍMITES Y VALIDACIONES
// ============================================

export const GUEST_LIMITS = {
  min: 25,
  max: 500,
  recommended: 100,
} as const;

export const GUEST_RANGES = [
  { value: '25-50', label: '25 - 50 invitados' },
  { value: '51-100', label: '51 - 100 invitados' },
  { value: '101-200', label: '101 - 200 invitados' },
  { value: '201-300', label: '201 - 300 invitados' },
  { value: '301-500', label: '301 - 500 invitados' },
  { value: '500+', label: 'Más de 500 invitados' },
] as const;

export const VALIDATION = {
  name: { min: 2, max: 100 },
  email: { max: 255 },
  phone: { min: 9, max: 15 },
  message: { min: 10, max: 1000 },
  guests: { min: 25, max: 500 },
} as const;

// ============================================
// 3. TIPOS DE EVENTOS Y ESTADOS
// ============================================

export const EVENT_TYPES = [
  // Usamos 'Gem' para bodas (anillo) y 'Building2' para corporativo (edificio moderno)
  { value: 'boda', label: 'Boda', icon: 'Gem' },
  { value: 'corporativo', label: 'Evento Corporativo', icon: 'Building2' },
  { value: 'cumpleanos', label: 'Cumpleaños', icon: 'Cake' },
  { value: 'aniversario', label: 'Aniversario', icon: 'CalendarHeart' },
  { value: 'graduacion', label: 'Graduación', icon: 'GraduationCap' },
  { value: 'baby-shower', label: 'Baby Shower', icon: 'Baby' },
  { value: 'otro', label: 'Otro', icon: 'PartyPopper' },
] as const;

export const QUOTE_STATUSES = {
  new: { label: 'Nueva', color: 'blue' },
  contacted: { label: 'Contactada', color: 'yellow' },
  quoted: { label: 'Cotizada', color: 'purple' },
  converted: { label: 'Convertida', color: 'green' },
  declined: { label: 'Declinada', color: 'red' },
} as const;

export const EVENT_STATUSES = {
  pending: { label: 'Pendiente', color: 'yellow' },
  confirmed: { label: 'Confirmado', color: 'green' },
  completed: { label: 'Completado', color: 'blue' },
  cancelled: { label: 'Cancelado', color: 'red' },
} as const;

// ============================================
// 4. MENSAJES
// ============================================

export const ERROR_MESSAGES = {
  required: 'Este campo es obligatorio',
  invalidEmail: 'Email inválido',
  invalidPhone: 'Teléfono inválido',
  minLength: (min: number) => `Mínimo ${min} caracteres`,
  maxLength: (max: number) => `Máximo ${max} caracteres`,
  minValue: (min: number) => `Valor mínimo: ${min}`,
  maxValue: (max: number) => `Valor máximo: ${max}`,
  pastDate: 'La fecha debe ser futura',
  generic: 'Ocurrió un error. Intenta de nuevo.',
} as const;

export const SUCCESS_MESSAGES = {
  quoteSubmitted: '¡Gracias! Tu cotización ha sido enviada.',
  contactSubmitted: '¡Mensaje enviado!',
  subscribed: '¡Suscripción exitosa!',
  copied: 'Copiado al portapapeles',
} as const;
// ============================================
// 5. SERVICIOS PRINCIPALES
// ============================================

/**
 * Servicios ofrecidos por La Reserva
 */
export const SERVICES = [
  {
    id: 'bartending-eventos',
    name: 'Bartending para Eventos',
    slug: 'bartending-eventos',
    description: 'Servicio completo de barra y bartenders profesionales para tu evento especial.',
    priceFrom: 1800,
    icon: 'Martini',
    features: [
      'Bartenders profesionales certificados',
      'Barra completa equipada',
      'Cristalería premium',
      'Ingredientes frescos y garnish',
      'Setup y decoración de barra',
      'Servicio durante todo el evento',
    ],
    guestRange: '25-500',
    duration: 4,
    popular: true,
  },
  {
    id: 'mixologia-corporativa',
    name: 'Mixología Corporativa',
    slug: 'mixologia-corporativa',
    description: 'Experiencia de coctelería personalizada para eventos empresariales y team building.',
    priceFrom: 2500,
    icon: 'Briefcase',
    features: [
      'Cócteles signature con branding',
      'Presentación profesional',
      'Team building de mixología',
      'Barra corporativa premium',
      'Material promocional incluido',
    ],
    guestRange: '30-500',
    duration: 4,
    popular: false,
  },
  {
    id: 'cocteles-autor',
    name: 'Cócteles de Autor',
    slug: 'cocteles-autor',
    description: 'Creación de cócteles exclusivos diseñados especialmente para tu evento íntimo.',
    priceFrom: 2200,
    icon: 'Sparkles',
    features: [
      'Consulta previa personalizada',
      'Receta exclusiva creada para ti',
      'Ingredientes premium seleccionados',
      'Técnicas artesanales',
      'Presentación impecable',
    ],
    guestRange: '25-100',
    duration: 4,
    popular: false,
  },
  {
    id: 'barra-movil',
    name: 'Barra Móvil Premium',
    slug: 'barra-movil',
    description: 'Barra móvil completamente equipada con todo lo necesario para tu evento.',
    priceFrom: 800,
    icon: 'Truck',
    features: [
      'Barra portátil elegante',
      'Equipo completo de bartending',
      'Decoración incluida',
      'Setup y desmontaje',
      'Variedad de diseños disponibles',
    ],
    guestRange: '20-200',
    duration: 8,
    popular: false,
  },
] as const;

// ============================================
// 6. PAQUETES PREDEFINIDOS
// ============================================

/**
 * Paquetes predefinidos de servicios
 */
export const PACKAGES = [
  {
    id: 'basico',
    name: 'Paquete Básico',
    slug: 'basico',
    description: 'Ideal para eventos íntimos',
    price: 1800,
    guestRange: '25-50',
    duration: 4,
    bartenders: 1,
    cocktails: 3,
    features: [
      '1 bartender profesional',
      'Barra básica equipada',
      '3 cócteles a elegir',
      'Cristalería y hielo',
      'Setup y limpieza',
    ],
    popular: false,
    serviceType: 'bartending-eventos',
  },
  {
    id: 'completo',
    name: 'Paquete Completo',
    slug: 'completo',
    description: 'Perfecto para bodas y eventos medianos',
    price: 3500,
    guestRange: '100-200',
    duration: 5,
    bartenders: 2,
    cocktails: 5,
    features: [
      '2 bartenders profesionales',
      'Barra premium equipada',
      '5 cócteles de autor',
      'Cristalería premium',
      'Decoración de barra',
      'Garnish artístico',
      'Setup y limpieza completa',
    ],
    popular: true,
    serviceType: 'bartending-eventos',
  },
  {
    id: 'premium',
    name: 'Paquete Premium',
    slug: 'premium',
    description: 'Experiencia exclusiva para eventos grandes',
    price: 6500,
    guestRange: '200-500',
    duration: 6,
    bartenders: 3,
    cocktails: 8,
    features: [
      '3+ bartenders profesionales',
      'Doble barra premium',
      'Cócteles de autor ilimitados',
      'Cristalería de lujo',
      'Decoración personalizada',
      'Garnish gourmet',
      'Sommelier de cócteles',
      'Servicio de fotografía de bebidas',
      'Setup, limpieza y coordinación completa',
    ],
    popular: false,
    serviceType: 'bartending-eventos',
  },
] as const;

// ============================================
// 7. CÓCTELES DESTACADOS
// ============================================

/**
 * Cócteles para mostrar en portafolio/menú
 */
export const FEATURED_COCKTAILS = [
  {
    id: 'pisco-sour-reserva',
    name: 'Pisco Sour Reserva',
    description: 'Nuestro clásico peruano con un toque especial',
    category: 'Clásicos',
    ingredients: ['Pisco acholado', 'Limón', 'Jarabe', 'Amargo de angostura'],
    difficulty: 'medium',
    imageUrl: '/images/cocktails/pisco-sour-reserva.jpg',
  },
  {
    id: 'old-fashioned-ahumado',
    name: 'Old Fashioned Ahumado',
    description: 'Bourbon premium con ahumado artesanal',
    category: 'Clásicos',
    ingredients: ['Bourbon', 'Angostura', 'Azúcar demerara', 'Twist de naranja'],
    difficulty: 'hard',
    imageUrl: '/images/cocktails/old-fashioned-ahumado.jpg',
  },
  {
    id: 'margarita-maracuya',
    name: 'Margarita de Maracuyá',
    description: 'Fusión tropical con maracuyá fresco',
    category: 'Tropicales',
    ingredients: ['Tequila', 'Triple sec', 'Maracuyá', 'Limón'],
    difficulty: 'medium',
    imageUrl: '/images/cocktails/margarita-maracuya.jpg',
  },
  {
    id: 'mojito-clasico',
    name: 'Mojito Clásico',
    description: 'Refrescante cóctel cubano',
    category: 'Clásicos',
    ingredients: ['Ron blanco', 'Menta', 'Limón', 'Azúcar', 'Soda'],
    difficulty: 'easy',
    imageUrl: '/images/cocktails/mojito-clasico.jpg',
  },
  {
    id: 'negroni',
    name: 'Negroni',
    description: 'Clásico italiano amargo y sofisticado',
    category: 'Clásicos',
    ingredients: ['Gin', 'Campari', 'Vermut rojo'],
    difficulty: 'easy',
    imageUrl: '/images/cocktails/negroni.jpg',
  },
] as const;

// ============================================
// 8. ADD-ONS Y PERSONALIZACIONES
// ============================================

/**
 * Servicios adicionales disponibles
 */
export const ADD_ONS = [
  {
    id: 'decoracion-tematica',
    name: 'Decoración Temática',
    description: 'Decoración personalizada de barra según tema del evento',
    price: 400,
    unit: 'evento',
  },
  {
    id: 'bartender-extra',
    name: 'Bartender Adicional',
    description: 'Bartender profesional extra por 4 horas',
    price: 300,
    unit: 'bartender',
  },
  {
    id: 'hora-extra',
    name: 'Hora Adicional',
    description: 'Extensión de servicio por hora adicional',
    price: 80,
    unit: 'hora/bartender',
  },
  {
    id: 'coctel-signature',
    name: 'Cóctel Signature',
    description: 'Creación de cóctel exclusivo para tu evento',
    price: 350,
    unit: 'cóctel',
  },
  {
    id: 'tasting-session',
    name: 'Tasting Session',
    description: 'Degustación previa de cócteles (hasta 6 personas)',
    price: 250,
    unit: 'sesión',
  },
  {
    id: 'workshop',
    name: 'Workshop de Mixología',
    description: 'Taller de preparación de cócteles (1 hora)',
    price: 500,
    unit: 'hora',
  },
  {
    id: 'estacion-mocktails',
    name: 'Estación de Mocktails',
    description: 'Barra separada de cócteles sin alcohol',
    price: 400,
    unit: 'estación',
  },
  {
    id: 'branding-corporativo',
    name: 'Branding Corporativo',
    description: 'Servilletas, coasters y menú con logo de empresa',
    price: 600,
    unit: 'evento',
  },
] as const;

// ============================================
// 9. PRECIOS Y DESCUENTOS
// ============================================

/**
 * Estructura de descuentos
 */
export const DISCOUNTS = {
  recurrentClient: {
    second: 0.10, // 10%
    third: 0.15,  // 15%
    frequent: 0.20, // 20%
  },
  largeEvents: {
    '200-299': 0.05, // 5%
    '300-499': 0.08, // 8%
    '500+': 0.10,    // 10%
  },
  lowSeason: {
    months: [1, 2, 3], // Enero, Febrero, Marzo
    discount: 0.15,     // 15%
  },
  earlyPayment: {
    daysInAdvance: 30,
    discount: 0.05, // 5%
  },
  referral: {
    referrer: 100,  // S/ 100 off
    referred: 50,   // S/ 50 off
  },
} as const;

/**
 * Políticas de pago
 */
export const PAYMENT_POLICIES = {
  deposit: {
    percentage: 50,
    description: '50% de adelanto para confirmar',
  },
  balance: {
    dueDate: 'Antes del evento',
    description: '50% restante antes o el día del evento',
  },
  methods: [
    { id: 'transfer', name: 'Transferencia bancaria', fee: 0 },
    { id: 'deposit', name: 'Depósito bancario', fee: 0 },
    { id: 'yape', name: 'Yape / Plin', fee: 0 },
    { id: 'cash', name: 'Efectivo', fee: 0 },
  ],
} as const;

// ============================================
// 10. SEO Y METADATA
// ============================================

/**
 * Metadata por defecto para SEO
 */
export const DEFAULT_SEO = {
  title: 'La Reserva - Mixología Exclusiva',
  description: 'Bartending premium para eventos exclusivos en Lima, Perú. Cócteles de autor y servicio excepcional.',
  keywords: [
    'bartending lima',
    'mixología perú',
    'eventos premium',
    'cócteles de autor',
    'bartender para bodas',
    'servicio de bar',
    'coctelería lima',
    'bartending corporativo',
    'eventos exclusivos',
    'barra móvil',
  ],
  ogImage: '/images/og-image.jpg',
  twitterCard: 'summary_large_image',
} as const;

/**
 * Metadata por página
 */
export const PAGE_METADATA = {
  home: {
    title: 'Inicio',
    description: 'Bartending premium para eventos exclusivos en Lima, Perú. Cócteles de autor y servicio excepcional.',
  },
  services: {
    title: 'Servicios de Bartending',
    description: 'Descubre nuestros servicios de bartending y mixología exclusiva para eventos en Lima.',
  },
  packages: {
    title: 'Paquetes de Eventos',
    description: 'Paquetes completos de bartending para bodas, eventos corporativos y celebraciones en Lima.',
  },
  portfolio: {
    title: 'Portafolio de Eventos',
    description: 'Galería de eventos realizados. Cócteles de autor y experiencias memorables en Lima.',
  },
  about: {
    title: 'Sobre Nosotros',
    description: 'Conoce al equipo de La Reserva. Expertos en mixología con más de 10 años de experiencia.',
  },
  contact: {
    title: 'Contacto',
    description: 'Contáctanos para tu próximo evento. WhatsApp, email y ubicación en Lima.',
  },
  blog: {
    title: 'Blog',
    description: 'Artículos sobre mixología, tendencias y consejos para eventos.',
  },
} as const;

/**
 * Mapa para renderizar los iconos dinámicamente en el frontend.
 * Uso: const Icon = ICON_MAP[service.icon]; return <Icon />;
 */
export const ICON_MAP = {
  Martini,
  Briefcase,
  Sparkles,
  Truck,
  Gem,
  Building2,
  Cake,
  CalendarHeart,
  GraduationCap,
  Baby,
  PartyPopper,
} as const;

// Exportamos también el tipo para usarlo en TypeScript
export type IconName = keyof typeof ICON_MAP;

// ============================================ Forma de uso ============================================
// import { SERVICES, ICON_MAP } from '@/utils/constants';

// // En tu componente:
// {SERVICES.map(service => {
//   // Recuperamos el componente real usando el string
//   const IconComponent = ICON_MAP[service.icon as keyof typeof ICON_MAP];
  
//   return (
//     <div className="card">
//       {/* Renderizamos el icono */}
//       <IconComponent className="w-8 h-8 text-primary-500" />
//       <h3>{service.name}</h3>
//     </div>
//   )
// })}