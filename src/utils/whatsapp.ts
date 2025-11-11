// src/utils/whatsapp.ts
import { CONTACT_INFO } from './constants';

/**
 * Genera URL de WhatsApp con mensaje predefinido
 * 
 * @param message - Mensaje a enviar
 * @param phone - Número de teléfono (opcional, usa el de contacto por defecto)
 */
export function getWhatsAppUrl(message: string, phone?: string): string {
  const phoneNumber = phone || CONTACT_INFO.whatsapp.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
}

/**
 * Genera mensaje de WhatsApp para cotización
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
 */
export function getContactWhatsAppMessage(name?: string): string {
  const greeting = name ? `Hola! Soy ${name}. ` : 'Hola! ';
  return `${greeting}Me gustaría obtener más información sobre sus servicios de bartending.`;
}

/**
 * Genera mensaje de WhatsApp para consulta de disponibilidad
 */
export function getAvailabilityWhatsAppMessage(date: string): string {
  return `Hola! Me gustaría consultar disponibilidad para el ${date}.`;
}

/**
 * Abre WhatsApp en nueva ventana/tab
 */
export function openWhatsApp(message: string, phone?: string): void {
  const url = getWhatsAppUrl(message, phone);
  window.open(url, '_blank', 'noopener,noreferrer');
}