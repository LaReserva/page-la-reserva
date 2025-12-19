// src/lib/data.ts
import { supabase } from '@/lib/supabase';
import { SITE_INFO, CONTACT_INFO, SOCIAL_LINKS, BUSINESS_HOURS } from '@/utils/constants';

// 1. Agregamos los campos de horarios a la interfaz
export interface GlobalSettings {
  contact_email: string;
  contact_phone: string;
  address: string;
  social_instagram: string;
  social_facebook: string;
  social_tiktok: string;
  whatsapp_url: string;
  // Nuevos campos de horarios
  hours_weekdays: string;
  hours_saturday: string;
  hours_sunday: string;
  response_time: string;
}

export async function getGlobalSettings(): Promise<GlobalSettings> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('*');

  if (error) {
    console.error('Error fetching settings:', error);
    // Fallback completo
    return {
      contact_email: CONTACT_INFO.email,
      contact_phone: CONTACT_INFO.phone,
      address: CONTACT_INFO.address,
      social_instagram: SOCIAL_LINKS.instagram.url,
      social_facebook: SOCIAL_LINKS.facebook.url,
      social_tiktok: SOCIAL_LINKS.tiktok.url,
      whatsapp_url: CONTACT_INFO.whatsappUrl,
      hours_weekdays: BUSINESS_HOURS.weekdays,
      hours_saturday: BUSINESS_HOURS.saturday,
      hours_sunday: BUSINESS_HOURS.sunday,
      response_time: BUSINESS_HOURS.responseTime
    };
  }

  const settingsMap: any = {};
  data.forEach(item => {
    settingsMap[item.key] = item.value;
  });

  const cleanPhone = (settingsMap.contact_phone || CONTACT_INFO.phone).replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone}`;

  return {
    contact_email: settingsMap.contact_email || CONTACT_INFO.email,
    contact_phone: settingsMap.contact_phone || CONTACT_INFO.phone,
    address: settingsMap.address || CONTACT_INFO.address,
    social_instagram: settingsMap.social_instagram || SOCIAL_LINKS.instagram.url,
    social_facebook: settingsMap.social_facebook || SOCIAL_LINKS.facebook.url,
    social_tiktok: settingsMap.social_tiktok || SOCIAL_LINKS.tiktok.url,
    whatsapp_url: whatsappUrl,
    // Mapeamos los nuevos campos con sus fallbacks
    hours_weekdays: settingsMap.hours_weekdays || BUSINESS_HOURS.weekdays,
    hours_saturday: settingsMap.hours_saturday || BUSINESS_HOURS.saturday,
    hours_sunday: settingsMap.hours_sunday || BUSINESS_HOURS.sunday,
    response_time: settingsMap.response_time || BUSINESS_HOURS.responseTime
  };
}