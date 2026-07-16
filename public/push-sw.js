/* push-sw.js — Web Push handlers, imported into the generated service worker.
 *
 * The main SW (from vite-plugin-pwa) handles precaching; this file adds the two
 * push-specific listeners it doesn't. Kept as a plain public/ file and pulled in
 * via workbox.importScripts so it can't disturb the precache logic.
 */

// Show the notification the backend sent.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'ApplyDir', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'ApplyDir';
  const options = {
    body: data.body || '',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: data.tag || 'applydir',
    renotify: true,
    data: { url: data.url || '/dashboard' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Tapping the notification focuses an open tab (navigating it) or opens one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) client.navigate(targetUrl).catch(() => {});
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      return undefined;
    }),
  );
});
