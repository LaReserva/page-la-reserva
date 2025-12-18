import { supabase } from '@/lib/supabase';
import { SITE_INFO, CONTACT_INFO, SOCIAL_LINKS } from '@/utils/constants';

// Definimos la estructura de nuestros ajustes globales
export interface GlobalSettings {
  contact_email: string;
  contact_phone: string;
  address: string;
  social_instagram: string;
  social_facebook: string;
  social_tiktok: string;
  whatsapp_url: string; // Generado dinámicamente
}

/**
 * Obtiene la configuración global desde Supabase.
 * Si falla o faltan datos, usa los de constants.ts como respaldo (fallback).
 */
export async function getGlobalSettings(): Promise<GlobalSettings> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('*');

  if (error) {
    console.error('Error fetching settings:', error);
    // Retornar valores por defecto de constants.ts si falla la DB
    return {
      contact_email: CONTACT_INFO.email,
      contact_phone: CONTACT_INFO.phone,
      address: CONTACT_INFO.address,
      social_instagram: SOCIAL_LINKS.instagram.url,
      social_facebook: SOCIAL_LINKS.facebook.url,
      social_tiktok: SOCIAL_LINKS.tiktok.url,
      whatsapp_url: CONTACT_INFO.whatsappUrl
    };
  }

  // Convertimos el array [{key: 'x', value: 'y'}] a un objeto {x: y}
  const settingsMap: any = {};
  data.forEach(item => {
    settingsMap[item.key] = item.value;
  });

  // Limpiamos el teléfono para WhatsApp (quitamos espacios y símbolos)
  const cleanPhone = (settingsMap.contact_phone || CONTACT_INFO.phone).replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone}`;

  return {
    contact_email: settingsMap.contact_email || CONTACT_INFO.email,
    contact_phone: settingsMap.contact_phone || CONTACT_INFO.phone,
    address: settingsMap.address || CONTACT_INFO.address,
    social_instagram: settingsMap.social_instagram || SOCIAL_LINKS.instagram.url,
    social_facebook: settingsMap.social_facebook || SOCIAL_LINKS.facebook.url,
    social_tiktok: settingsMap.social_tiktok || SOCIAL_LINKS.tiktok.url,
    whatsapp_url: whatsappUrl
  };
}