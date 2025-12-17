// Auto-activate new service worker updates
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

importScripts('https://www.gstatic.com/firebasejs/11.7.3/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.7.3/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyB3iCL2C6654eo6mrLboG45f0H_aifVWsw",
  authDomain: "level-up-app-c9f47.firebaseapp.com",
  projectId: "level-up-app-c9f47",
  storageBucket: "level-up-app-c9f47.firebasestorage.app",
  messagingSenderId: "256858356257",
  appId: "1:256858356257:web:e849c127252e552b58c160"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  // IMPORTANT: Do NOT manually show notification here when payload contains
  // a 'notification' field. Firebase automatically displays notifications
  // for messages with the 'notification' payload. Calling showNotification()
  // here would cause DUPLICATE notifications.
  //
  // Only show manually if using data-only messages (no notification field):
  if (!payload.notification && payload.data) {
    // Data-only message - manually show notification
    const title = payload.data.title || "Level Up";
    const body = payload.data.body || "You have a new notification";

    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      data: {
        url: payload.data.url || 'https://app.levelupcincinnati.org'
      }
    });
    console.log('[firebase-messaging-sw.js] Manual notification shown for data-only message.');
  } else {
    console.log('[firebase-messaging-sw.js] Notification payload present - Firebase will auto-display.');
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});
