/**
 * Registers Firebase Cloud Messaging for the web/PWA build.
 *
 * Set EXPO_PUBLIC_FIREBASE_VAPID_KEY to the "Web Push certificates" key pair
 * from Firebase Console → Project settings → Cloud Messaging.
 */

// Temporary: phone browsers hide console logs. Remove these alerts after FCM testing.
function fcmAlert(message: string) {
  console.log(message);
  if (typeof alert === 'function') alert(message);
}

export async function registerFirebaseWebPush(options?: {
  askPermission?: boolean;
}): Promise<string | null> {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    fcmAlert('[FCM] Notifications are not available in this browser');
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
    fcmAlert(
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
      if (text) fcmAlert(text);
    });
  }

  const vapidKey = process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    fcmAlert(
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
      fcmAlert('[FCM] Web push is not supported in this browser');
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
      fcmAlert(`[FCM] Push received: ${title} — ${body}`);
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
          fcmAlert(
            `[FCM] Foreground notification display failed: ${
              e instanceof Error ? e.message : String(e)
            }`,
          );
        }
      }
    });

    fcmAlert(
      `[FCM] Web token acquired: ${token ? `${token.slice(0, 12)}…` : 'empty'}`,
    );
    return token;
  } catch (e) {
    fcmAlert(
      `[FCM] Web push registration failed: ${
        e instanceof Error ? e.message : String(e)
      }`,
    );
    return null;
  }
}
