export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase as supabasePublic } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const POST: APIRoute = async ({ request }) => {
  try {
    // 1. Validar autenticación
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return new Response(JSON.stringify({ error: 'Falta token de autenticación' }), { status: 401 });
    }

    const { data: { user }, error: authError } = await supabasePublic.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Sesión no válida o expirada' }), { status: 401 });
    }

    // 2. Extraer datos de la suscripción
    const body = await request.json();
    const { endpoint, p256dh, auth, userAgent } = body;

    if (!endpoint || !p256dh || !auth) {
      return new Response(JSON.stringify({ error: 'Faltan parámetros de la suscripción' }), { status: 400 });
    }

    // 3. Upsert en la base de datos (por si ya existe ese endpoint)
    const { error: dbError } = await supabaseAdmin
      .from('admin_push_subscriptions')
      .upsert({
        user_id: user.id,
        endpoint,
        p256dh,
        auth,
        user_agent: userAgent || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'endpoint' });

    if (dbError) {
      console.error('Error guardando suscripción push:', dbError);
      return new Response(JSON.stringify({ error: 'Error en base de datos al guardar suscripción' }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, message: 'Dispositivo suscrito correctamente' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error en /api/admin/push/subscribe:', error);
    return new Response(JSON.stringify({ error: error.message || 'Error interno del servidor' }), { status: 500 });
  }
};
