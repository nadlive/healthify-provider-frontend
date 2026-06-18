import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import createApiInstance from '../../src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginWithGoogle, fetchUser } from '../../src/store/slices/authSlice';
import { useAppDispatch } from '../../src/store/hooks';
import { COLORS } from '../../constants/colors';

export default function OAuthCallback() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [status, setStatus] = useState('Signing you in...');

  useEffect(() => {
    const handleCallback = async () => {
      if (typeof window === 'undefined') return;

      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');

      if (!code) {
        router.replace('/(auth)/provider-login');
        return;
      }

      setStatus('Signing you in...');
      try {
        const redirectUri = `${window.location.origin}/oauth-callback`;
        const api = createApiInstance();
        const response = await api.post('/auth/oauth/exchange', {
          code,
          role: 'practitioner',
          redirect_uri: redirectUri,
        });

        const { accessToken, refreshToken, user = {} } = response || {};
        const normalizedUser = {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role || 'practitioner',
          name: user.name || user.username || '',
          picture: user.picture || null,
        };

        if (normalizedUser.role !== 'practitioner') {
          await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'user']);
          router.replace('/(auth)/provider-login');
          return;
        }

        if (!accessToken || !normalizedUser.email) {
          throw new Error('Invalid login response from server');
        }

        await AsyncStorage.multiSet([
          ['authToken', accessToken],
          ['user', JSON.stringify(normalizedUser)],
        ]);
        if (refreshToken) {
          await AsyncStorage.setItem('refreshToken', refreshToken);
        }

        await dispatch(
          loginWithGoogle({
            user: normalizedUser,
            token: accessToken,
            refreshToken,
          })
        ).unwrap();

        setStatus('Almost there...');
        await dispatch(fetchUser()).unwrap();
        router.replace('/(tabs)');
      } catch (error) {
        console.error('OAuth error', error);
        router.replace('/(auth)/provider-login');
      }
    };

    handleCallback();
  }, [dispatch, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.logo} />
      <Text style={styles.text}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg_light,
    gap: 16,
  },
  text: {
    fontSize: 16,
    color: COLORS.txt_secondary,
  },
});
