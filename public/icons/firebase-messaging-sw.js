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
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const { title, body } = payload.notification;

  self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192.png',
  });
});
