import { GOOGLE_AUTH_CONFIG } from '../config/googleAuth';
import { Platform } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Configure Google Sign-In for native platforms (same as frontend)
// iosClientId is required on iOS when GoogleService-Info.plist is not used
if (Platform.OS !== 'web') {
  const webClientId = GOOGLE_AUTH_CONFIG.webClientId;
  const iosClientId = GOOGLE_AUTH_CONFIG.iosClientId || webClientId;
  GoogleSignin.configure({
    webClientId,
    iosClientId, // Required on iOS; fallback to webClientId if not set in .env
    offlineAccess: true,
    scopes: ['profile', 'email'],
  });
}

export const signInWithGoogle = async () => {
  try {
    if (Platform.OS === 'web') {
      const redirectUri = `${window.location.origin}/oauth-callback`;
      const state = Math.random().toString(36).substring(2, 15);

      const authUrl =
        'https://accounts.google.com/o/oauth2/v2/auth?' +
        `client_id=${GOOGLE_AUTH_CONFIG.webClientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        'response_type=code&' +
        'scope=openid%20profile%20email&' +
        `state=${state}&` +
        'prompt=consent';

      window.location.href = authUrl;
      return;
    }

    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    const userInfo = await GoogleSignin.signIn();

    return {
      user: userInfo.user || userInfo.data?.user,
      idToken: userInfo.idToken || userInfo.data?.idToken,
      serverAuthCode: userInfo.serverAuthCode || userInfo.data?.serverAuthCode,
    };
  } catch (error) {
    if (error.code === 'SIGN_IN_CANCELLED') {
      throw new Error('User cancelled the sign-in flow');
    } else if (error.code === 'IN_PROGRESS') {
      throw new Error('Sign-in is already in progress');
    } else if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
      throw new Error('Play services not available or outdated');
    }
    throw error;
  }
};

// Sign out from Google (for native platforms)
export const signOutFromGoogle = async () => {
  if (Platform.OS !== 'web') {
    try {
      await GoogleSignin.signOut();
    } catch (error) {
      // Silent error handling
    }
  }
};

// Get current user (check if already signed in)
export const getCurrentUser = async () => {
  if (Platform.OS !== 'web') {
    try {
      const isSignedIn = await GoogleSignin.isSignedIn();
      if (isSignedIn) {
        return await GoogleSignin.getCurrentUser();
      }
    } catch (error) {
      // Silent error handling
    }
  }
  return null;
};
