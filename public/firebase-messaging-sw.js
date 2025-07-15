// Auto-activate new service worker updates
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyB3iCL2C6654eo6mrLboG45f0H_aifVWsw",
  authDomain: "level-up-app-c9f47.firebaseapp.com",
  projectId: "level-up-app-c9f47",
  storageBucket: "level-up-app-c9f47.appspot.com",
  messagingSenderId: "256858356257",
  appId: "Y1:256858356257:web:e849c127252e552b58c160"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  try {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    const { title, body } = payload.notification || {
      title: "Unknown Title",
      body: "No body content provided"
    };

    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      data: {
        url: 'https://level-up-app-c9f47.web.app'
      }
    });

    console.log('[firebase-messaging-sw.js] showNotification triggered.');
  } catch (error) {
    console.error('[firebase-messaging-sw.js] Error handling background message:', error);
    self.registration.showNotification("Push Failed", {
      body: "Error occurred in background message handler.",
      icon: '/icons/icon-192.png',
    });
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});
