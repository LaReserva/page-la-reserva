// src/lib/push-sender.ts
import * as _webpush from 'web-push';
import { supabaseAdmin } from './supabase-admin';

// Compatibilidad CommonJS / ESM para Vite y Astro
const webpush: typeof import('web-push') = (_webpush as any).default || _webpush;

// Configurar VAPID en web-push
const publicVapidKey = import.meta.env.PUBLIC_VAPID_KEY;
const privateVapidKey = import.meta.env.PRIVATE_VAPID_KEY;
const vapidSubject = import.meta.env.VAPID_SUBJECT || 'mailto:bartendinglareserva@gmail.com';

if (publicVapidKey && privateVapidKey) {
  webpush.setVapidDetails(vapidSubject, publicVapidKey, privateVapidKey);
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
}

interface SendPushOptions {
  payload: PushNotificationPayload;
  targetUserId?: string; // Si se omite, se envía a todos los administradores suscritos
}

/**
 * Envía una notificación Web Push a los administradores suscritos.
 * Si alguna suscripción ya expiró (código 410 o 404), la elimina automáticamente de la base de datos.
 */
export async function sendPushNotificationToAdmins({ payload, targetUserId }: SendPushOptions) {
  if (!publicVapidKey || !privateVapidKey) {
    console.warn('⚠️ Web Push no configurado: faltan PUBLIC_VAPID_KEY o PRIVATE_VAPID_KEY');
    return { success: false, sentCount: 0, reason: 'VAPID keys not configured' };
  }

  try {
    let query = supabaseAdmin
      .from('admin_push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth');

    if (targetUserId) {
      query = query.eq('user_id', targetUserId);
    }

    const { data: subscriptions, error } = await query;

    if (error) {
      console.error('Error al consultar suscripciones Push:', error);
      return { success: false, sentCount: 0, error };
    }

    if (!subscriptions || subscriptions.length === 0) {
      return { success: true, sentCount: 0, message: 'No hay administradores suscritos a Push' };
    }

    const notificationData = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || '/admin',
      icon: payload.icon || '/notification-icon.png',
      badge: payload.badge || '/notification-icon.png',
      tag: payload.tag || `admin-notif-${Date.now()}`,
    });

    const expiredIds: string[] = [];
    let sentCount = 0;

    await Promise.all(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, notificationData, {
            urgency: 'high',
            TTL: 86400,
          });
          sentCount++;
        } catch (err: any) {
          // 404 Not Found o 410 Gone indican que el usuario canceló el permiso o el navegador revocó la clave
          if (err.statusCode === 404 || err.statusCode === 410) {
            expiredIds.push(sub.id);
          } else {
            console.error(`Error enviando push a suscripción ${sub.id}:`, err.message || err);
          }
        }
      })
    );

    // Limpiar suscripciones inválidas o revocadas
    if (expiredIds.length > 0) {
      await supabaseAdmin
        .from('admin_push_subscriptions')
        .delete()
        .in('id', expiredIds);
    }

    return { success: true, sentCount, cleanedCount: expiredIds.length };
  } catch (err: any) {
    console.error('Error general enviando Web Push:', err);
    return { success: false, sentCount: 0, error: err.message || err };
  }
}
