// src/utils/utils.ts

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina clases de Tailwind sin conflictos
 * Usa clsx para lógica condicional y twMerge para resolver conflictos
 * 
 * @example
 * cn('px-4', 'px-6') → 'px-6'
 * cn('btn', isActive && 'btn-active') → 'btn btn-active'
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Espera un tiempo determinado (útil para debugging o delays)
 * 
 * @param ms - Milisegundos a esperar
 * @example
 * await sleep(1000); // Espera 1 segundo
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Genera un slug URL-friendly desde un string
 * 
 * @param text - Texto a convertir
 * @example
 * slugify('Boda en Lima 2025') → 'boda-en-lima-2025'
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')                   // Normaliza caracteres especiales
    .replace(/[\u0300-\u036f]/g, '')    // Elimina diacríticos
    .replace(/[^a-z0-9\s-]/g, '')       // Solo letras, números, espacios y guiones
    .trim()
    .replace(/\s+/g, '-')               // Reemplaza espacios con guiones
    .replace(/-+/g, '-');               // Elimina guiones múltiples
}

/**
 * Capitaliza la primera letra de cada palabra
 * 
 * @param text - Texto a capitalizar
 * @example
 * capitalize('juan pérez') → 'Juan Pérez'
 */
export function capitalize(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Trunca un texto a cierta longitud agregando ellipsis
 * 
 * @param text - Texto a truncar
 * @param length - Longitud máxima
 * @example
 * truncate('Este es un texto muy largo', 10) → 'Este es un...'
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trim() + '...';
}

/**
 * Valida si un email es válido (básico)
 * Para validación más robusta, usar Zod en validators.ts
 * 
 * @param email - Email a validar
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida si un teléfono peruano es válido
 * Formato: +51 seguido de 9 dígitos (912345678)
 * 
 * @param phone - Teléfono a validar
 */
export function isValidPeruvianPhone(phone: string): boolean {
  // Formato: +51999888777 o 999888777 o 51999888777
  const phoneRegex = /^(\+?51)?9\d{8}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Formatea un número de teléfono peruano
 * 
 * @param phone - Teléfono a formatear
 * @example
 * formatPhone('999888777') → '+51 999 888 777'
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  // Si empieza con 51, eliminarlo
  const withoutCountryCode = cleaned.startsWith('51') 
    ? cleaned.slice(2) 
    : cleaned;
  
  // Formatear: +51 999 888 777
  if (withoutCountryCode.length === 9) {
    return `+51 ${withoutCountryCode.slice(0, 3)} ${withoutCountryCode.slice(3, 6)} ${withoutCountryCode.slice(6)}`;
  }
  
  return phone; // Si no es válido, retornar original
}

/**
 * Genera un ID único (nanoid alternativo simple)
 * Para producción, usar nanoid o UUID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Debounce una función (útil para búsquedas)
 * 
 * @param func - Función a ejecutar
 * @param wait - Milisegundos a esperar
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Obtiene el saludo apropiado según la hora
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

/**
 * Valida si una fecha es futura
 */
export function isFutureDate(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj > new Date();
}

/**
 * Obtiene días entre dos fechas
 */
export function getDaysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000; // milisegundos en un día
  return Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay));
}

/**
 * Scroll suave a un elemento
 */
export function scrollToElement(elementId: string, offset: number = 80) {
  const element = document.getElementById(elementId);
  if (element) {
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  }
}

/**
 * Copia texto al clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Error al copiar:', err);
    return false;
  }
}

/**
 * Obtiene parámetros de URL
 */
export function getUrlParams<T extends Record<string, string>>(): T {
  const params = new URLSearchParams(window.location.search);
  const result: Record<string, string> = {};
  
  params.forEach((value, key) => {
    result[key] = value;
  });
  
  return result as T;
}

/**
 * Detecta si está en mobile
 */
export function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}