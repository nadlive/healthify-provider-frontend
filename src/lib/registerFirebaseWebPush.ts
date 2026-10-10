/**
 * Registers Firebase Cloud Messaging for the web/PWA build.
 *
 * Set EXPO_PUBLIC_FIREBASE_VAPID_KEY to the "Web Push certificates" key pair
 * from Firebase Console → Project settings → Cloud Messaging.
 */

export async function registerFirebaseWebPush(): Promise<string | null> {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    console.log('[FCM] Notifications are not available in this browser');
    return null;
  }

  const vapidKey = process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.warn(
      '[FCM] Web push: add EXPO_PUBLIC_FIREBASE_VAPID_KEY (Firebase Console → Cloud Messaging → Web Push certificates).',
    );
    return null;
  }

  try {
    const [{ getMessaging, getToken, isSupported, onMessage }, { app }] =
      await Promise.all([
        import('firebase/messaging'),
        import('../../firebase'),
      ]);

    if (!(await isSupported())) {
      console.log('[FCM] Web push is not supported in this browser');
      return null;
    }

    // Safari returns "denied" from requestPermission() on page load, even when
    // Settings already allows this site. Use the stored permission in that case.
    let permission = Notification.permission;
    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
    }
    if (permission !== 'granted') {
      console.log('[FCM] Notification permission was not granted:', permission);
      return null;
    }

    const registration = await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js',
    );

    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    onMessage(messaging, async (payload) => {
      const title = payload.notification?.title || 'Healthify';
      const body = payload.notification?.body || '';
      console.log('[FCM] Push received', title, body);
      const options = {
        body,
        icon: '/logo192.png',
        badge: '/logo192.png',
        data: payload.data || {},
        tag: `fcm-foreground-${payload.messageId || Date.now()}`,
        renotify: true,
        requireInteraction: true,
      };

      if (Notification.permission === 'granted') {
        try {
          const swRegistration = await navigator.serviceWorker.getRegistration();
          if (swRegistration) {
            await swRegistration.showNotification(title, options);
            return;
          }
          new Notification(title, options);
        } catch (e) {
          console.warn('[FCM] Foreground notification display failed', e);
        }
      }
    });

    console.log('[FCM] Web token acquired');
    return token;
  } catch (e) {
    console.warn('[Healthify] Web push registration failed', e);
    return null;
  }
}
