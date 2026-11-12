export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase as supabasePublic } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const POST: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return new Response(JSON.stringify({ error: 'Falta token de autenticación' }), { status: 401 });
    }

    const { data: { user }, error: authError } = await supabasePublic.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Sesión no válida o expirada' }), { status: 401 });
    }

    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return new Response(JSON.stringify({ error: 'Falta endpoint' }), { status: 400 });
    }

    const { error: dbError } = await supabaseAdmin
      .from('admin_push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .eq('user_id', user.id);

    if (dbError) {
      console.error('Error eliminando suscripción push:', dbError);
      return new Response(JSON.stringify({ error: 'Error en base de datos al eliminar suscripción' }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, message: 'Dispositivo desuscrito correctamente' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error en /api/admin/push/unsubscribe:', error);
    return new Response(JSON.stringify({ error: error.message || 'Error interno del servidor' }), { status: 500 });
  }
};
