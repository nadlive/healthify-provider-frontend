/**
 * Registers Firebase Cloud Messaging for the web/PWA build.
 *
 * Set EXPO_PUBLIC_FIREBASE_VAPID_KEY to the "Web Push certificates" key pair
 * from Firebase Console → Project settings → Cloud Messaging.
 */

export async function registerFirebaseWebPush(): Promise<string | null> {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return null;
  }

  const vapidKey = process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    if (__DEV__) {
      console.warn(
        '[Healthify] Web push: add EXPO_PUBLIC_FIREBASE_VAPID_KEY (Firebase Console → Cloud Messaging → Web Push certificates).',
      );
    }
    return null;
  }

  try {
    const [{ getMessaging, getToken, isSupported, onMessage }, { app }] =
      await Promise.all([
        import('firebase/messaging'),
        import('../../firebase'),
      ]);

    if (!(await isSupported())) {
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
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
        } catch {
          // Notification display can fail if the browser blocks it.
        }
      }
    });

    return token;
  } catch (e) {
    console.warn('[Healthify] Web push registration failed', e);
    return null;
  }
}
