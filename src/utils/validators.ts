// src/utils/validators.ts
import { z } from 'zod';
import { VALIDATION, ERROR_MESSAGES } from './constants';

/**
 * Schema para formulario de cotización
 */
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
    .min(VALIDATION.phone.min, ERROR_MESSAGES.minLength(VALIDATION.phone.min))
    .max(VALIDATION.phone.max, ERROR_MESSAGES.maxLength(VALIDATION.phone.max))
    .regex(/^(\+?51)?9\d{8}$/, ERROR_MESSAGES.invalidPhone),
  
  eventType: z
    .string()
    .min(1, ERROR_MESSAGES.required),
  
  eventDate: z
    .string()
    .min(1, ERROR_MESSAGES.required)
    .refine((date) => {
      const eventDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return eventDate >= today;
    }, ERROR_MESSAGES.pastDate),
  
  guestCount: z
    .number()
    .min(VALIDATION.guests.min, ERROR_MESSAGES.minValue(VALIDATION.guests.min))
    .max(VALIDATION.guests.max, ERROR_MESSAGES.maxValue(VALIDATION.guests.max)),
  
  message: z
    .string()
    .min(VALIDATION.message.min, ERROR_MESSAGES.minLength(VALIDATION.message.min))
    .max(VALIDATION.message.max, ERROR_MESSAGES.maxLength(VALIDATION.message.max))
    .optional(),
});

export type QuoteFormData = z.infer<typeof quoteSchema>;

/**
 * Schema para formulario de contacto
 */
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
    .optional(),
  
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

/**
 * Schema para newsletter
 */
export const newsletterSchema = z.object({
  email: z
    .string()
    .email(ERROR_MESSAGES.invalidEmail),
});

export type NewsletterFormData = z.infer<typeof newsletterSchema>;

/**
 * Schema para login de admin
 */
export const loginSchema = z.object({
  email: z
    .string()
    .email(ERROR_MESSAGES.invalidEmail),
  
  password: z
    .string()
    .min(6, ERROR_MESSAGES.minLength(6)),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Schema para crear/editar evento (admin)
 */
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