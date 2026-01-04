// src/types/index.ts
import type { 
  QUOTE_STATUSES, 
  EVENT_STATUSES, 
  EVENT_TYPES, 
  SERVICES, 
  PACKAGES 
} from '@/utils/constants';


/**
 * LA RESERVA - TIPOS TYPESCRIPT
 * Version: 1.4 (Incluye Módulo de Finanzas)
 */

// ============================================
// 1. TIPOS DE BASE DE DATOS (Tablas)
// ============================================

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  second_phone?: string;
  document_id?: string;
  address?: string;
  instagram?: string;
  company?: string;
  notes?: string;
  total_events: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface Quote {
  id: string;
  client_id?: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  event_type: string;
  event_date: string;
  guest_count: number;
  message?: string;
  status: QuoteStatus;
  estimated_price?: number;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  updated_by?: string;
  contacted_at?: string;
  converted_at?: string;
  interested_package?: string;
}

export interface Event {
  id: string;
  client_id?: string;
  quote_id?: string;
  event_type: string;
  event_date: string;
  event_time?: string;
  guest_count: number;
  venue?: string;
  venue_address?: string;
  venue_district?: string;
  package_id?: PackageId;
  service_ids?: ServiceId[];
  total_price: number;
  deposit_paid: number;
  balance_due?: number;
  status: EventStatus;
  notes?: string;
  special_requests?: string;
  cocktails_selected?: string[];
  created_at: string;
  updated_at: string;
  confirmed_at?: string;
  completed_at?: string;
  closed_by?: string;
  bartender_count?: number;
  bartender_names?: string;
  bar_menu?: string;
  requirements_url?: string;
  quote_doc_url?: string;
  other_docs_urls?: string[];
}
export interface Payment {
  id: string;
  event_id: string;
  quote_id?: string;
  amount: number;
  payment_date: string;
  payment_method?: string;
  is_deposit: boolean;
  proof_url?: string;
  notes?: string;
  recorded_by?: string;
  created_at: string;
}

export interface PaymentWithEvent extends Payment {
  event?: Event;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: 'insumos' | 'personal' | 'marketing' | 'otros';
  date: string;
  event_id?: string | null; // Relación opcional con un evento
  created_at: string;
}

export interface EventImage {
  id: string;
  event_id?: string;
  image_url: string;
  thumbnail_url?: string;
  caption?: string;
  order_index: number;
  is_public: boolean;
  created_at: string;
}

export interface Service {
  id: string;
  name: string;
  slug: string;
  description: string;
  long_description?: string;
  price_from: number;
  features: string[];
  icon?: string;
  image_url?: string;
  active: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
  duration?: number; 
  guest_range?: string;
}

export interface Package {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  guest_range: string;
  duration: number;
  features: string[];
  popular: boolean;
  active: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface Testimonial {
  id: string;
  client_name: string;
  client_company?: string;
  event_type?: string;
  rating: number;
  comment: string;
  image_url?: string;
  approved: boolean;
  featured: boolean;
  created_at: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image_url?: string;
  author_id?: string;
  published: boolean;
  published_at?: string;
  views: number;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'super_admin' | 'sales' | 'operations';
export interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  avatar_url?: string;
  phone?: string;
  dni?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface SiteSetting {
  key: string;
  value: any;
  description?: string;
  updated_at: string;
}

export interface TeamTask {
  id: string;
  content: string;
  status: string;
  priority: string;
  created_at: string | null;
  updated_at: string | null;
// ✅ NUEVOS CAMPOS
  created_by?: string; 
  assigned_to?: string;

  // ✅ RELACIONES (Para los JOINS)
  creator?: AdminUser;   // El usuario que la creó
  assignee?: AdminUser;  // El usuario responsable
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'replied';
  created_at: string;
}

// ============================================
// TIPOS AUXILIARES
// ============================================

export interface QuoteFormData {
  name: string;
  email: string;
  phone: string;
  eventType: string;
  eventDate: string;
  guestCount: number;
  message?: string;
  interestedPackage?: string;
}

export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export type QuoteStatus = keyof typeof QUOTE_STATUSES;
export type EventStatus = keyof typeof EVENT_STATUSES;
export type EventType = typeof EVENT_TYPES[number]['value'];
export type ServiceId = typeof SERVICES[number]['id'];
export type PackageId = typeof PACKAGES[number]['id'];

export interface EventImageWithEvent extends EventImage {
  event?: Event;
}

export interface BlogPostWithAuthor extends BlogPost {
  author?: AdminUser;
}

// ✅ NUEVOS TIPOS AUXILIARES PARA FINANZAS

// Unifica eventos (ingresos) y gastos en una sola lista para la tabla
export type FinanceItem =
  | { type: 'income'; data: Event }
  | { type: 'expense'; data: Expense };

// Para tipar los cálculos de las tarjetas KPI
export interface FinanceSummary {
  totalIncome: number;    // Proyectado (Precio total eventos)
  totalCollected: number; // Real (Depósitos pagados)
  totalPending: number;   // Por cobrar
  totalExpenses: number;  // Gastos
  netProfit: number;      // Utilidad (Cobrado - Gastos)
}

// ============================================
// DEFINICIÓN DE BASE DE DATOS SUPABASE
// ============================================
export type { Database } from './database';

// ============================================
// 2. MÓDULO DE GESTIÓN DE BAR (Recetas)
// ============================================

export type IngredientCategory = 'licor' | 'mixer' | 'fruta' | 'garnish' | 'otro';

export interface Ingredient {
  id: string;
  name: string;
  category: string;
  estimated_price: number;
  // Nuevos campos de compra
  purchase_unit: string;    // 'botella', 'kg', 'bolsa'
  package_volume: number;   // 750, 1000
  measurement_unit: string; // 'ml', 'gr', 'und' (Unidad base científica)
  yield_pieces?: number;    // Para garnish: cuantas piezas salen de 1 unidad de compra
}

export interface Cocktail {
  id: string;
  name: string;
  slug: string;
  image_url?: string;
  description?: string;
  active: boolean;
  created_at: string;
}

export interface RecipeItem {
  id: string;
  cocktail_id: string;
  ingredient_id: string;
  quantity: number;
  is_garnish: boolean;
  unit: string; // 'oz', 'ml', 'cl', 'pieza'
  ingredient?: Ingredient;
}

// Tipo auxiliar para la UI
export interface CocktailWithRecipe extends Cocktail {
  recipe: RecipeItem[];
}