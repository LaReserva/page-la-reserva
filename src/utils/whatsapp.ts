// src/utils/whatsapp.ts

/**
 * LA RESERVA - HELPERS DE WHATSAPP
 * 
 * Funciones para generar URLs y mensajes de WhatsApp
 */

import { CONTACT_INFO } from './constants';

// ============================================
// 1. GENERACIÓN DE URLs
// ============================================

/**
 * Genera URL de WhatsApp con mensaje predefinido
 * 
 * @param message - Mensaje a enviar
 * @param phone - Número (opcional, usa el de contacto por defecto)
 * @returns URL de WhatsApp
 */
export function getWhatsAppUrl(message: string, phone?: string): string {
  const phoneNumber = phone || CONTACT_INFO.whatsapp.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
}

/**
 * Abre WhatsApp en nueva ventana/tab
 * 
 * @param message - Mensaje a enviar
 * @param phone - Número opcional
 */
export function openWhatsApp(message: string, phone?: string): void {
  const url = getWhatsAppUrl(message, phone);
  window.open(url, '_blank', 'noopener,noreferrer');
}

// ============================================
// 2. MENSAJES PREDEFINIDOS
// ============================================

/**
 * Genera mensaje de WhatsApp para cotización
 * 
 * @param data - Datos del formulario de cotización
 * @returns Mensaje formateado
 */
export function getQuoteWhatsAppMessage(data: {
  name: string;
  eventType: string;
  eventDate: string;
  guestCount: number;
}): string {
  return `Hola! Me gustaría solicitar una cotización:

👤 Nombre: ${data.name}
🎉 Tipo de evento: ${data.eventType}
📅 Fecha: ${data.eventDate}
👥 Cantidad de invitados: ${data.guestCount}

¿Podrían enviarme más información?`;
}

/**
 * Genera mensaje de WhatsApp para contacto general
 * 
 * @param name - Nombre opcional del cliente
 * @returns Mensaje formateado
 */
export function getContactWhatsAppMessage(name?: string): string {
  const greeting = name ? `Hola! Soy ${name}. ` : 'Hola! ';
  return `${greeting}Me gustaría obtener más información sobre sus servicios de bartending.`;
}

/**
 * Genera mensaje de WhatsApp para consulta de disponibilidad
 * 
 * @param date - Fecha del evento
 * @returns Mensaje formateado
 */
export function getAvailabilityWhatsAppMessage(date: string): string {
  return `Hola! Me gustaría consultar disponibilidad para el ${date}.`;
}

/**
 * Genera mensaje de WhatsApp para consulta de servicio específico
 * 
 * @param serviceName - Nombre del servicio
 * @returns Mensaje formateado
 */
export function getServiceWhatsAppMessage(serviceName: string): string {
  return `Hola! Me interesa el servicio de "${serviceName}". ¿Podrían darme más información?`;
}

/**
 * Genera mensaje de WhatsApp para consulta de paquete específico
 * 
 * @param packageName - Nombre del paquete
 * @param guestCount - Cantidad de invitados
 * @returns Mensaje formateado
 */
export function getPackageWhatsAppMessage(packageName: string, guestCount?: number): string {
  const guestsText = guestCount ? ` para ${guestCount} invitados` : '';
  return `Hola! Me interesa el "${packageName}"${guestsText}. ¿Podrían enviarme más detalles?`;
}