export const prerender = false;

import type { APIRoute } from 'astro';
import { sendPushNotificationToAdmins } from '@/lib/push-sender';

/**
 * Webhook para recibir eventos INSERT de Supabase (Database Webhooks)
 * o llamadas internas cuando ocurre un nuevo evento en el sistema.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const payload = await request.json();
    const { table, record, type } = payload;

    if (type && type !== 'INSERT') {
      return new Response(JSON.stringify({ message: 'Ignorado (no es INSERT)' }), { status: 200 });
    }

    let title = 'Nueva Notificación';
    let body = 'Tienes una nueva actividad en el panel.';
    let url = '/admin';
    let targetUserId: string | undefined = undefined;

    switch (table) {
      case 'quotes':
        title = '📋 Nueva Cotización';
        body = `${record?.client_name || 'Cliente'} solicitó cotización para ${record?.event_type || 'un evento'}`;
        url = '/admin/cotizaciones';
        break;

      case 'contact_messages':
        title = '✉️ Nuevo Mensaje de Contacto';
        body = `${record?.name || 'Usuario'}: ${record?.subject || 'Sin asunto'}`;
        url = '/admin/mensajes';
        break;

      case 'team_tasks':
        title = '📌 Nueva Tarea Asignada';
        body = record?.content || 'Tienes una nueva tarea asignada';
        url = '/admin';
        targetUserId = record?.assigned_to || undefined;
        break;

      case 'testimonials':
        title = `⭐ Nuevo Testimonio (${record?.rating || 5} estrellas)`;
        body = `De: ${record?.client_name || 'Cliente'}`;
        url = '/admin/testimonios';
        break;

      case 'events':
        title = '🎉 Evento Confirmado';
        body = `Tipo: ${record?.event_type || 'Evento'}`;
        url = '/admin/eventos';
        break;

      default:
        // Si no viene en formato webhook de Supabase sino con payload directo
        if (payload.title && payload.body) {
          title = payload.title;
          body = payload.body;
          url = payload.url || '/admin';
          targetUserId = payload.targetUserId;
        } else {
          return new Response(JSON.stringify({ message: 'Tabla o formato no configurado para push' }), { status: 200 });
        }
    }

    const result = await sendPushNotificationToAdmins({
      payload: {
        title,
        body,
        url,
        tag: `${table || 'general'}-${record?.id || Date.now()}`,
      },
      targetUserId,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error en /api/webhooks/supabase-push:', error);
    return new Response(JSON.stringify({ error: error.message || 'Error procesando push' }), { status: 500 });
  }
};
