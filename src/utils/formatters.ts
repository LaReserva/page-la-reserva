// src/utils/formatters.ts
import { format, formatDistanceToNow, isToday, isYesterday, isTomorrow } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Formatea una fecha a formato legible en español
 * 
 * @example
 * formatDate(new Date()) → '22 de octubre de 2025'
 */
export function formatDate(date: Date | string, formatStr: string = 'PPP'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, formatStr, { locale: es });
}

/**
 * Formatea una fecha de manera relativa (hace X tiempo)
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
 * Formatea moneda en soles peruanos
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
 * Formatea número con separadores de miles
 * 
 * @example
 * formatNumber(1500) → '1,500'
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('es-PE').format(num);
}

/**
 * Formatea un nombre completo (capitaliza)
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
 * Formatea hora a formato 12h
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

/**
 * Formatea duración en horas
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
 * @example
 * formatGuestRange('100-200') → '100 - 200 invitados'
 */
export function formatGuestRange(range: string): string {
  if (range.includes('+')) {
    return `Más de ${range.replace('+', '')} invitados`;
  }
  return `${range.replace('-', ' - ')} invitados`;
}

/**
 * Extrae iniciales de un nombre
 * 
 * @example
 * getInitials('Juan Pérez') → 'JP'
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}