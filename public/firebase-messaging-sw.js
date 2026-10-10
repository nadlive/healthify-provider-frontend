/* eslint-disable no-undef */
/**
 * Firebase Cloud Messaging — background handler (web only).
 * Must live at the site root. Keep firebase JS version aligned with package.json "firebase".
 */
importScripts(
  'https://www.gstatic.com/firebasejs/12.9.0/firebase-app-compat.js',
);
importScripts(
  'https://www.gstatic.com/firebasejs/12.9.0/firebase-messaging-compat.js',
);

firebase.initializeApp({
  apiKey: 'AIzaSyCNKclv3c5s87Kvqj-bxmng43_i9M6vURA',
  authDomain: 'healthify-chat.firebaseapp.com',
  projectId: 'healthify-chat',
  storageBucket: 'healthify-chat.firebasestorage.app',
  messagingSenderId: '748884487444',
  appId: '1:748884487444:web:733e106c3fabd0d650e601',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const n = payload.notification;
  console.log('[FCM] Background push received', n?.title, n?.body);
  if (n) {
    self.registration.showNotification(n.title || 'Healthify', {
      body: n.body || '',
      icon: '/logo192.png',
      data: payload.data || {},
    });
  }
});
