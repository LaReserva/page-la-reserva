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
 * Version: 1.3 (Incluye contact_messages)
 */

// ============================================
// 1. TIPOS DE BASE DE DATOS (Tablas)
// ============================================

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
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
  updated_by?: string; // ✅ Nuevo campo para rastrear quién actualizó la cotización
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
}

export interface EventImage {
  id: string;
  event_id?: string;
  image_url: string;
  thumbnail_url?: string;
  caption?: string;
  order_index: number;
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
  // ✅ NUEVOS CAMPOS AGREGADOS
  phone?: string;
  dni?: string;
  address?: string;
  // -------------------------
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
  status: string; // 'pending' | 'done'
  priority: string; // 'low' | 'normal' | 'high'
  created_at: string | null;
  updated_at: string | null;
}

// ✅ NUEVA INTERFAZ PARA MENSAJES DE CONTACTO
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

// ============================================
// DEFINICIÓN DE BASE DE DATOS SUPABASE
// ============================================
// ✅ Importamos Database desde database.ts (generado automáticamente por Supabase)
export type { Database } from './database';