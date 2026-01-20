const CACHE_NAME = 'mv-operator-v3';
const API_URL = 'https://api-voltrideandmotorrent-production.up.railway.app';

const urlsToCache = [
  '/',
  '/index.html',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json'
];

// Installation
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Cache ouvert');
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch (cache strategy)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          if (event.request.method === 'GET') {
            cache.put(event.request, responseClone);
          }
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ========================================
// APP BADGE - Nombre sur l'icône
// ========================================
async function updateBadge() {
  try {
    const response = await fetch(API_URL + '/api/notifications/unread-count');
    const data = await response.json();
    const count = data.count || 0;
    
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        await navigator.setAppBadge(count);
      } else {
        await navigator.clearAppBadge();
      }
    }
  } catch (e) {
    console.log('Badge update error:', e);
  }
}

// ========================================
// NOTIFICATIONS PUSH
// ========================================
self.addEventListener('push', (event) => {
  console.log('Push reçu:', event);
  
  let data = {
    title: 'Voltride Operator',
    body: 'Nouvelle notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'default'
  };
  
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    tag: data.tag || Date.now().toString(),
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: data.actions || [],
    requireInteraction: true
  };
  
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title, options),
      updateBadge()
    ])
  );
});

// Clic sur une notification
self.addEventListener('notificationclick', (event) => {
  console.log('Notification cliquée:', event);
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.postMessage({ type: 'NOTIFICATION_CLICKED', data: event.notification.data });
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Fermeture d'une notification
self.addEventListener('notificationclose', (event) => {
  console.log('Notification fermée');
  updateBadge();
});

// Message depuis l'app principale
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'UPDATE_BADGE') {
    updateBadge();
  }
});

console.log('Service Worker Voltride chargé avec support badge');
