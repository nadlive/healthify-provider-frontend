import { useEffect } from 'react';
import { Platform } from 'react-native';
import { registerFirebaseWebPush } from '@/src/lib/registerFirebaseWebPush';

/**
 * One-time FCM web token registration on web. Safe no-op on native.
 */
export default function WebPushRegistrar() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    void registerFirebaseWebPush();
  }, []);

  return null;
}
