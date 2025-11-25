// src/utils/formatters.ts

/**
 * LA RESERVA - FUNCIONES DE FORMATEO
 * 
 * Funciones para formatear datos (fechas, moneda, números, etc.)
 */

import { format, formatDistanceToNow, isToday, isYesterday, isTomorrow } from 'date-fns';
import { es } from 'date-fns/locale';

// ============================================
// 1. FORMATEO DE FECHAS
// ============================================

/**
 * Formatea una fecha a formato legible en español
 * 
 * @param date - Fecha a formatear
 * @param formatStr - Formato deseado (default: 'PPP')
 * @returns Fecha formateada
 * 
 * @example
 * formatDate(new Date()) → '22 de octubre de 2025'
 */
export function formatDate(date: Date | string, formatStr: string = 'PPP'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, formatStr, { locale: es });
}

/**
 * Formatea una fecha de manera relativa
 * 
 * @param date - Fecha a formatear
 * @returns Fecha relativa
 * 
 * @example
 * formatRelativeDate(yesterday) → 'hace 1 día'
 */
export function formatRelativeDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isToday(dateObj)) return 'Hoy';
  if (isYesterday(dateObj)) return 'Ayer';
  if (isTomorrow(dateObj)) return 'Mañana';
  
  return formatDistanceToNow(dateObj, { addSuffix: true, locale: es });
}

/**
 * Formatea hora a formato 12h
 * 
 * @param time - Hora en formato 24h ('14:30')
 * @returns Hora en formato 12h
 * 
 * @example
 * formatTime('14:30') → '2:30 PM'
 */
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');
  
  return `${displayHours}:${displayMinutes} ${period}`;
}

// ============================================
// 2. FORMATEO DE MONEDA
// ============================================

/**
 * Formatea moneda en soles peruanos
 * 
 * @param amount - Cantidad a formatear
 * @returns Moneda formateada
 * 
 * @example
 * formatCurrency(1500) → 'S/ 1,500'
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formatea moneda con decimales
 * 
 * @param amount - Cantidad a formatear
 * @returns Moneda formateada con decimales
 * 
 * @example
 * formatCurrencyWithDecimals(1500.50) → 'S/ 1,500.50'
 */
export function formatCurrencyWithDecimals(amount: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ============================================
// 3. FORMATEO DE NÚMEROS
// ============================================

/**
 * Formatea número con separadores de miles
 * 
 * @param num - Número a formatear
 * @returns Número formateado
 * 
 * @example
 * formatNumber(1500) → '1,500'
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('es-PE').format(num);
}

/**
 * Formatea porcentaje
 * 
 * @param value - Valor decimal (0.15 = 15%)
 * @returns Porcentaje formateado
 * 
 * @example
 * formatPercentage(0.15) → '15%'
 */
export function formatPercentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

// ============================================
// 4. FORMATEO DE TEXTO
// ============================================

/**
 * Formatea un nombre completo
 * 
 * @param name - Nombre a formatear
 * @returns Nombre capitalizado
 * 
 * @example
 * formatName('juan pérez') → 'Juan Pérez'
 */
export function formatName(name: string): string {
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Formatea duración en horas
 * 
 * @param hours - Número de horas
 * @returns Duración formateada
 * 
 * @example
 * formatDuration(5) → '5 horas'
 */
export function formatDuration(hours: number): string {
  if (hours === 1) return '1 hora';
  return `${hours} horas`;
}

/**
 * Formatea rango de invitados
 * 
 * @param range - Rango en formato '100-200'
 * @returns Rango formateado
 * 
 * @example
 * formatGuestRange('100-200') → '100 - 200 invitados'
 */
export function formatGuestRange(range: string): string {
  if (range.includes('+')) {
    return `Más de ${range.replace('+', '')} invitados`;
  }
  return `${range.replace('-', ' - ')} invitados`;
}

// ============================================
// 5. FORMATEO DE TELÉFONO
// ============================================

/**
 * Formatea número de teléfono peruano
 * 
 * @param phone - Teléfono a formatear
 * @returns Teléfono formateado
 * 
 * @example
 * formatPhoneNumber('999888777') → '+51 999 888 777'
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  const withoutCountryCode = cleaned.startsWith('51')
    ? cleaned.slice(2)
    : cleaned;

  if (withoutCountryCode.length === 9) {
    return `+51 ${withoutCountryCode.slice(0, 3)} ${withoutCountryCode.slice(3, 6)} ${withoutCountryCode.slice(6)}`;
  }
  
  return phone;
}

// ============================================
// 6. FORMATEO DE ARCHIVOS
// ============================================

/**
 * Formatea tamaño de archivo
 * 
 * @param bytes - Tamaño en bytes
 * @returns Tamaño formateado
 * 
 * @example
 * formatFileSize(1024) → '1 KB'
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${Math.round(bytes / Math.pow(k, i))} ${sizes[i]}`;
}
