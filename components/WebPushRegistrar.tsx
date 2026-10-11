import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useSelector } from 'react-redux';
import { registerFirebaseWebPush } from '@/src/lib/registerFirebaseWebPush';
import createApiInstance from '@/src/services/api';

const api = createApiInstance();

/**
 * After login, register this browser for web push and save the FCM token.
 * Safe no-op on native.
 */
export default function WebPushRegistrar() {
  const isAuthenticated = useSelector(
    (state: { auth?: { isAuthenticated?: boolean } }) =>
      Boolean(state.auth?.isAuthenticated),
  );
  const savedToken = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !isAuthenticated) return;

    let cancelled = false;

    void (async () => {
      const token = await registerFirebaseWebPush();
      if (!token || cancelled || savedToken.current === token) return;

      try {
        await api.post('/user/fcm', { token });
        savedToken.current = token;
        console.log(
          `[FCM] This: event=saveToken app=provider token=${token.slice(0, 12)}…`,
        );
        console.log(
          '[FCM] Send to: POST /user/fcm (overwrites previous device token for this user)',
        );
      } catch (error) {
        console.warn('[FCM] Saving token failed', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  return null;
}
