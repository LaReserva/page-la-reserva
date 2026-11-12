// Service Worker para Web Push Notifications de La Reserva
// public/sw.js

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Escucha de mensajes Push enviados desde el servidor
self.addEventListener('push', (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload = {
        title: 'Notificación de La Reserva',
        body: event.data.text(),
      };
    }
  }

  const title = payload.title || '🔔 Nueva Notificación - La Reserva';
  const options = {
    body: payload.body || 'Tienes una nueva actividad en el panel.',
    icon: payload.icon || '/logo.png',
    badge: payload.badge || '/logo.png',
    vibrate: [200, 100, 200],
    data: {
      url: payload.url || '/admin',
      dateOfArrival: Date.now(),
    },
    tag: payload.tag || `notif-${Date.now()}`,
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Manejo del click en la notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) 
    ? event.notification.data.url 
    : '/admin';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client && targetUrl) {
            return client.navigate(targetUrl);
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
