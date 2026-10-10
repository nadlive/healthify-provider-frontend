/**
 * Registers Firebase Cloud Messaging for the web/PWA build.
 *
 * Set EXPO_PUBLIC_FIREBASE_VAPID_KEY to the "Web Push certificates" key pair
 * from Firebase Console → Project settings → Cloud Messaging.
 */

function fcmLog(message: string) {
  console.log(message);
}

export async function registerFirebaseWebPush(options?: {
  askPermission?: boolean;
}): Promise<string | null> {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    fcmLog('[FCM] Notifications are not available in this browser');
    return null;
  }

  // Call this before any other await. Safari only shows the Allow dialog
  // when requestPermission() runs in the same turn as the button tap.
  let permission = Notification.permission;
  if (permission !== 'granted') {
    if (!options?.askPermission) return null;
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') {
    fcmLog(
      permission === 'denied'
        ? '[FCM] Notifications are blocked. Allow them in the browser or iPhone settings, then tap Turn on notifications again.'
        : `[FCM] Notification permission was not granted: ${permission}`,
    );
    return null;
  }

  if (
    typeof navigator !== 'undefined' &&
    navigator.serviceWorker &&
    !(window as Window & { __fcmDebugListener?: boolean }).__fcmDebugListener
  ) {
    (window as Window & { __fcmDebugListener?: boolean }).__fcmDebugListener =
      true;
    navigator.serviceWorker.addEventListener('message', (event) => {
      const text = event.data?.type === 'fcm-debug' ? event.data.text : '';
      if (text) fcmLog(text);
    });
  }

  const vapidKey = process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    fcmLog(
      '[FCM] Missing EXPO_PUBLIC_FIREBASE_VAPID_KEY (Firebase Console → Cloud Messaging → Web Push certificates).',
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
      fcmLog('[FCM] Web push is not supported in this browser');
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
      fcmLog(`[FCM] Push received: ${title} — ${body}`);
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
          fcmLog(
            `[FCM] Foreground notification display failed: ${
              e instanceof Error ? e.message : String(e)
            }`,
          );
        }
      }
    });

    fcmLog(
      `[FCM] Web token acquired: ${token ? `${token.slice(0, 12)}…` : 'empty'}`,
    );
    return token;
  } catch (e) {
    fcmLog(
      `[FCM] Web push registration failed: ${
        e instanceof Error ? e.message : String(e)
      }`,
    );
    return null;
  }
}
