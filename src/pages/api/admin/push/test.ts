export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase as supabasePublic } from '@/lib/supabase';
import { sendPushNotificationToAdmins } from '@/lib/push-sender';

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

    const result = await sendPushNotificationToAdmins({
      payload: {
        title: '🔔 ¡Notificación de Prueba!',
        body: 'El sistema de Web Push Notifications está configurado y funcionando perfectamente.',
        url: '/admin',
        tag: 'test-notification',
      },
      targetUserId: user.id,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error enviando notificación push de prueba:', error);
    return new Response(JSON.stringify({ error: error.message || 'Error interno' }), { status: 500 });
  }
};
