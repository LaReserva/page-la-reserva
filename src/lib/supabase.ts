import { createBrowserClient } from '@supabase/ssr';

// Obtenemos las variables de entorno
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno de Supabase');
}

// Creamos el cliente para el navegador (Client-Side)
// createBrowserClient maneja automáticamente las cookies por ti.
export const supabase = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey
);