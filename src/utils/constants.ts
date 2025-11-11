// src/utils/constants.ts

/**
 * URLs y endpoints
 */
export const SITE_URL = import.meta.env.PUBLIC_SITE_URL || 'https://lareserva.pe';
export const API_URL = `${SITE_URL}/api`;

/**
 * Información de contacto
 */
export const CONTACT_INFO = {
  phone: '+51999888777',
  phoneFormatted: '+51 999 888 777',
  email: 'contacto@lareserva.pe',
  whatsapp: '+51999888777',
  whatsappUrl: 'https://wa.me/51999888777',
  address: 'Lima, Perú',
  addressFull: 'Lima Metropolitana, Perú',
} as const;

/**
 * Horarios de atención
 */
export const BUSINESS_HOURS = {
  weekdays: 'Lunes - Viernes: 9:00 AM - 5:00 PM',
  saturday: 'Sábado: 9:00 AM - 1:00 PM',
  sunday: 'Domingo: Cerrado',
  responseTime: 'Respuestas dentro de 1 hora',
} as const;

/**
 * Redes sociales
 */
export const SOCIAL_LINKS = {
  instagram: 'https://instagram.com/lareservabar',
  facebook: 'https://facebook.com/lareservabar',
  tiktok: 'https://tiktok.com/@lareserva',
} as const;

/**
 * Tipos de eventos disponibles
 */
export const EVENT_TYPES = [
  { value: 'boda', label: 'Boda' },
  { value: 'corporativo', label: 'Evento Corporativo' },
  { value: 'cumpleanos', label: 'Cumpleaños' },
  { value: 'aniversario', label: 'Aniversario' },
  { value: 'graduacion', label: 'Graduación' },
  { value: 'baby-shower', label: 'Baby Shower' },
  { value: 'otro', label: 'Otro' },
] as const;

/**
 * Rangos de invitados
 */
export const GUEST_RANGES = [
  { value: '25-50', label: '25 - 50 invitados' },
  { value: '51-100', label: '51 - 100 invitados' },
  { value: '101-200', label: '101 - 200 invitados' },
  { value: '201-300', label: '201 - 300 invitados' },
  { value: '301-500', label: '301 - 500 invitados' },
  { value: '500+', label: 'Más de 500 invitados' },
] as const;

/**
 * Límites de invitados
 */
export const GUEST_LIMITS = {
  min: 25,
  max: 500,
  recommended: 100,
} as const;

/**
 * Estados de cotizaciones
 */
export const QUOTE_STATUSES = {
  new: { label: 'Nueva', color: 'blue' },
  contacted: { label: 'Contactada', color: 'yellow' },
  quoted: { label: 'Cotizada', color: 'purple' },
  converted: { label: 'Convertida', color: 'green' },
  declined: { label: 'Declinada', color: 'red' },
} as const;

/**
 * Estados de eventos
 */
export const EVENT_STATUSES = {
  pending: { label: 'Pendiente', color: 'yellow' },
  confirmed: { label: 'Confirmado', color: 'green' },
  completed: { label: 'Completado', color: 'blue' },
  cancelled: { label: 'Cancelado', color: 'red' },
} as const;

/**
 * Servicios principales
 */
export const SERVICES = [
  {
    id: 'bartending-eventos',
    name: 'Bartending para Eventos',
    slug: 'bartending-eventos',
    description: 'Servicio completo de barra y bartenders profesionales para tu evento especial.',
    priceFrom: 1800,
    icon: 'cocktail',
    features: [
      'Bartenders profesionales certificados',
      'Barra completa equipada',
      'Cristalería premium',
      'Ingredientes frescos y garnish',
      'Setup y decoración de barra',
      'Servicio durante todo el evento',
    ],
  },
  {
    id: 'mixologia-corporativa',
    name: 'Mixología Corporativa',
    slug: 'mixologia-corporativa',
    description: 'Experiencia de coctelería personalizada para eventos empresariales y team building.',
    priceFrom: 2500,
    icon: 'briefcase',
    features: [
      'Cócteles signature con branding',
      'Presentación profesional',
      'Team building de mixología',
      'Barra corporativa premium',
      'Material promocional incluido',
    ],
  },
  {
    id: 'cocteles-autor',
    name: 'Cócteles de Autor',
    slug: 'cocteles-autor',
    description: 'Creación de cócteles exclusivos diseñados especialmente para tu evento íntimo.',
    priceFrom: 2200,
    icon: 'sparkles',
    features: [
      'Consulta previa personalizada',
      'Receta exclusiva creada para ti',
      'Ingredientes premium seleccionados',
      'Técnicas artesanales',
      'Presentación impecable',
    ],
  },
  {
    id: 'barra-movil',
    name: 'Barra Móvil Premium',
    slug: 'barra-movil',
    description: 'Barra móvil completamente equipada con todo lo necesario para tu evento.',
    priceFrom: 800,
    icon: 'truck',
    features: [
      'Barra portátil elegante',
      'Equipo completo de bartending',
      'Decoración incluida',
      'Setup y desmontaje',
      'Variedad de diseños disponibles',
    ],
  },
] as const;

/**
 * Paquetes predefinidos
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
    features: [
      '1 bartender profesional',
      'Barra básica equipada',
      '3 cócteles a elegir',
      'Cristalería y hielo',
      'Setup y limpieza',
    ],
    popular: false,
  },
  {
    id: 'completo',
    name: 'Paquete Completo',
    slug: 'completo',
    description: 'Perfecto para bodas y eventos medianos',
    price: 3500,
    guestRange: '100-200',
    duration: 5,
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
  },
  {
    id: 'premium',
    name: 'Paquete Premium',
    slug: 'premium',
    description: 'Experiencia exclusiva para eventos grandes',
    price: 6500,
    guestRange: '200-500',
    duration: 6,
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
  },
] as const;

/**
 * Cócteles destacados (para portafolio)
 */
export const FEATURED_COCKTAILS = [
  {
    name: 'Pisco Sour Reserva',
    description: 'Nuestro clásico peruano con un toque especial',
    category: 'Clásicos',
  },
  {
    name: 'Old Fashioned Ahumado',
    description: 'Bourbon premium con ahumado artesanal',
    category: 'Clásicos',
  },
  {
    name: 'Margarita de Maracuyá',
    description: 'Fusión tropical con maracuyá fresco',
    category: 'Tropicales',
  },
] as const;

/**
 * Metadata por defecto para SEO
 */
export const DEFAULT_SEO = {
  title: 'La Reserva - Mixología Exclusiva',
  description: 'Bartending premium para eventos exclusivos en Lima, Perú. Cócteles de autor, servicio excepcional y experiencias memorables.',
  keywords: [
    'bartending lima',
    'mixología perú',
    'eventos premium',
    'cócteles de autor',
    'bartender para bodas',
    'servicio de bar',
    'coctelería lima',
  ],
  ogImage: '/images/og-image.jpg',
} as const;

/**
 * Configuración de validación
 */
export const VALIDATION = {
  name: {
    min: 2,
    max: 100,
  },
  email: {
    max: 255,
  },
  phone: {
    min: 9,
    max: 15,
  },
  message: {
    min: 10,
    max: 1000,
  },
  guests: {
    min: GUEST_LIMITS.min,
    max: GUEST_LIMITS.max,
  },
} as const;

/**
 * Mensajes de error comunes
 */
export const ERROR_MESSAGES = {
  required: 'Este campo es obligatorio',
  invalidEmail: 'Email inválido',
  invalidPhone: 'Teléfono inválido',
  minLength: (min: number) => `Mínimo ${min} caracteres`,
  maxLength: (max: number) => `Máximo ${max} caracteres`,
  minValue: (min: number) => `Valor mínimo: ${min}`,
  maxValue: (max: number) => `Valor máximo: ${max}`,
  invalidDate: 'Fecha inválida',
  pastDate: 'La fecha debe ser futura',
  generic: 'Ocurrió un error. Por favor intenta de nuevo.',
} as const;

/**
 * Mensajes de éxito
 */
export const SUCCESS_MESSAGES = {
  quoteSubmitted: '¡Gracias! Tu cotización ha sido enviada. Te contactaremos pronto.',
  contactSubmitted: '¡Mensaje enviado! Te responderemos a la brevedad.',
  subscribed: '¡Suscripción exitosa! Recibirás nuestras novedades.',
  copied: 'Copiado al portapapeles',
} as const;