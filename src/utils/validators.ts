// src/utils/validators.ts

/**
 * LA RESERVA - VALIDADORES CON ZOD
 * * Schemas de validación para formularios usando Zod.
 * Proporciona validación type-safe en cliente y servidor.
 * @version 1.1
 */

import { z } from 'zod';
import { VALIDATION, ERROR_MESSAGES } from '@/utils/constants'; // ✅ MEJORA: Alias correcto

// Helper para limpiar teléfonos (elimina espacios y guiones)
const cleanPhone = (val: string) => val.replace(/[\s-]/g, '');

// ============================================
// 1. SCHEMA: COTIZACIÓN
// ============================================

export const quoteSchema = z.object({
  name: z
    .string()
    .min(VALIDATION.name.min, ERROR_MESSAGES.minLength(VALIDATION.name.min))
    .max(VALIDATION.name.max, ERROR_MESSAGES.maxLength(VALIDATION.name.max)),
  
  email: z
    .string()
    .email(ERROR_MESSAGES.invalidEmail)
    .max(VALIDATION.email.max),
  
  phone: z
    .string()
    .transform(cleanPhone) // ✅ MEJORA DE UX: Limpia espacios antes de validar
    .pipe(
      z.string()
        .min(VALIDATION.phone.min, ERROR_MESSAGES.minLength(VALIDATION.phone.min))
        .max(VALIDATION.phone.max, ERROR_MESSAGES.maxLength(VALIDATION.phone.max))
        .regex(/^(\+?51)?9\d{8}$/, ERROR_MESSAGES.invalidPhone)
    ),
  
  eventType: z
    .string()
    .min(1, ERROR_MESSAGES.required),
  
  eventDate: z
    .string()
    .min(1, ERROR_MESSAGES.required)
    .refine((date) => {
      // Ajustamos la fecha para evitar problemas de zona horaria al comparar solo días
      const eventDate = new Date(date + 'T00:00:00'); 
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return eventDate >= today;
    }, ERROR_MESSAGES.pastDate),
  
  guestCount: z
    .number({ invalid_type_error: ERROR_MESSAGES.required })
    .min(VALIDATION.guests.min, ERROR_MESSAGES.minValue(VALIDATION.guests.min))
    .max(VALIDATION.guests.max, ERROR_MESSAGES.maxValue(VALIDATION.guests.max)),
  
  // ✅ NUEVO CAMPO: Paquete de interés (Opcional)
  interestedPackage: z.string().optional(),
  
  message: z
    .string()
    .max(VALIDATION.message.max, ERROR_MESSAGES.maxLength(VALIDATION.message.max))
    .optional()
    .or(z.literal('')), // Permite string vacío
});

export type QuoteFormData = z.infer<typeof quoteSchema>;

// ============================================
// 2. SCHEMA: CONTACTO
// ============================================

export const contactSchema = z.object({
  name: z
    .string()
    .min(VALIDATION.name.min, ERROR_MESSAGES.minLength(VALIDATION.name.min))
    .max(VALIDATION.name.max, ERROR_MESSAGES.maxLength(VALIDATION.name.max)),
  
  email: z
    .string()
    .email(ERROR_MESSAGES.invalidEmail),
  
  phone: z
    .string()
    .optional()
    .transform((val) => (val ? cleanPhone(val) : val)), // Limpieza opcional
  
  subject: z
    .string()
    .min(3, ERROR_MESSAGES.minLength(3))
    .max(200, ERROR_MESSAGES.maxLength(200)),
  
  message: z
    .string()
    .min(VALIDATION.message.min, ERROR_MESSAGES.minLength(VALIDATION.message.min))
    .max(VALIDATION.message.max, ERROR_MESSAGES.maxLength(VALIDATION.message.max)),
});

export type ContactFormData = z.infer<typeof contactSchema>;

// ============================================
// 3. SCHEMA: NEWSLETTER
// ============================================

export const newsletterSchema = z.object({
  email: z
    .string()
    .email(ERROR_MESSAGES.invalidEmail),
});

export type NewsletterFormData = z.infer<typeof newsletterSchema>;

// ============================================
// 4. SCHEMA: LOGIN ADMIN
// ============================================

export const loginSchema = z.object({
  email: z
    .string()
    .email(ERROR_MESSAGES.invalidEmail),
  
  password: z
    .string()
    .min(6, ERROR_MESSAGES.minLength(6)),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// ============================================
// 5. SCHEMA: EVENTO (Admin)
// ============================================

export const eventSchema = z.object({
  clientName: z
    .string()
    .min(VALIDATION.name.min),
  
  clientEmail: z
    .string()
    .email(),
  
  clientPhone: z
    .string()
    .min(VALIDATION.phone.min),
  
  eventType: z
    .string()
    .min(1),
  
  eventDate: z
    .string()
    .min(1),
  
  eventTime: z
    .string()
    .optional(),
  
  guestCount: z
    .number()
    .min(VALIDATION.guests.min)
    .max(VALIDATION.guests.max),
  
  venue: z
    .string()
    .optional(),
  
  packageId: z
    .string()
    .optional(),
  
  totalPrice: z
    .number()
    .min(0)
    .optional(),
  
  deposit: z
    .number()
    .min(0)
    .optional(),
  
  status: z
    .enum(['pending', 'confirmed', 'completed', 'cancelled']),
  
  notes: z
    .string()
    .optional(),
});

export type EventFormData = z.infer<typeof eventSchema>;