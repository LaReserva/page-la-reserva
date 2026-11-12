// src/utils/pushNotifications.ts
// Utilidades cliente para registrar el Service Worker y gestionar suscripciones Web Push

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Comprueba si el navegador actual soporta Web Push Notifications
 */
export function isPushNotificationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Obtiene el estado actual de los permisos de notificación
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Registra el Service Worker de la aplicación (/sw.js)
 */
export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushNotificationSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    await registration.update();
    return registration;
  } catch (error) {
    console.error('Error registrando el Service Worker:', error);
    return null;
  }
}

/**
 * Obtiene la suscripción push actual si existe
 */
export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushNotificationSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.error('Error obteniendo la suscripción Push actual:', error);
    return null;
  }
}

/**
 * Suscribe este dispositivo/navegador a las notificaciones Push
 */
export async function subscribeDeviceToPush(accessToken: string): Promise<{ success: boolean; error?: string }> {
  if (!isPushNotificationSupported()) {
    return { success: false, error: 'Este navegador o dispositivo no soporta notificaciones Web Push.' };
  }

  const publicVapidKey = import.meta.env.PUBLIC_VAPID_KEY;
  if (!publicVapidKey) {
    return { success: false, error: 'Falta la clave pública VAPID (PUBLIC_VAPID_KEY).' };
  }

  try {
    // 1. Pedir permiso al usuario
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Permiso de notificaciones denegado en el navegador.' };
    }

    // 2. Registrar el SW y esperar que esté listo
    await registerPushServiceWorker();
    const registration = await navigator.serviceWorker.ready;

    // 3. Crear o reutilizar la suscripción en el navegador
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(publicVapidKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey as unknown as BufferSource,
      });
    }

    // 4. Enviar la suscripción a nuestro backend para guardarla en Supabase
    const subJson = subscription.toJSON();
    const response = await fetch('/api/admin/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        p256dh: subJson.keys?.p256dh,
        auth: subJson.keys?.auth,
        userAgent: navigator.userAgent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al guardar la suscripción en el servidor');
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error al suscribir el dispositivo a Push:', err);
    let errorMessage = err.message || 'Error desconocido';

    if (errorMessage.includes('push service error')) {
      errorMessage = 'Error del servicio Push del navegador: ' +
        '1) Si usas Brave: activa "Usar servicios de Google para mensajería push" en brave://settings/privacy y reinicia el navegador. ' +
        '2) No uses modo incógnito. ' +
        '3) Si tienes un bloqueador de anuncios o VPN, comprueba que no bloquee conexiones a Google FCM.';
    }

    return { success: false, error: errorMessage };
  }
}

/**
 * Cancela la suscripción push de este dispositivo
 */
export async function unsubscribeDeviceFromPush(accessToken: string): Promise<{ success: boolean; error?: string }> {
  if (!isPushNotificationSupported()) {
    return { success: true };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      
      // Cancelar en el navegador
      await subscription.unsubscribe();

      // Eliminar de la base de datos
      await fetch('/api/admin/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ endpoint }),
      });
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error al cancelar la suscripción Push:', err);
    return { success: false, error: err.message || 'Error desconocido' };
  }
}
