/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  // ✅ Actualizamos nombres
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  
  // Solo servidor
  readonly SUPABASE_SERVICE_KEY: string;
  
  // Otros
  readonly PUBLIC_SITE_URL: string;
  readonly RESEND_API_KEY: string;
  readonly WHATSAPP_BUSINESS_ID: string;
  readonly WHATSAPP_ACCESS_TOKEN: string;
  readonly PUBLIC_GOOGLE_MAPS_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// ✅ Agregamos esto para el tipado del Middleware
declare namespace App {
  interface Locals {
    // Definimos que 'user' puede ser un Usuario de Supabase o undefined
    user?: import('@supabase/supabase-js').User;
    // Definimos el rol como string (ej: 'super_admin')
    role?: string;
  }
}