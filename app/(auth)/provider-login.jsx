import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import {
  clearError,
  loginWithGoogle,
  fetchUser,
} from '../../src/store/slices/authSlice';
import { signInWithGoogle } from '../../src/services/googleAuthService';
import createApiInstance from '../../src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppSelector } from '../../src/store/hooks';
import { COLORS } from '../../constants/colors';
import { IMG } from '../../assets/images/images';

export default function ProviderLogin() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { error, isLoading, requiresTotp } = useAppSelector(
    (state) => state.auth,
  );

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (error) {
      Alert.alert('Login Error', error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (requiresTotp) {
      router.replace('/(auth)/totp-verification');
      return;
    }
  }, [requiresTotp, router]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithGoogle();

      if (!result || Platform.OS === 'web') {
        return;
      }

      const api = createApiInstance();
      const response = await api.post('/auth/oauth/exchange', {
        idToken: result.idToken,
        serverAuthCode: result.serverAuthCode,
        type: 'native',
        role: 'provider',
      });

      // Support both { accessToken, user } and { data: { accessToken, user } }
      const data = response?.data ?? response ?? {};
      const { accessToken, refreshToken, user: userFromApi = {} } = data;
      const normalizedUser = {
        id: userFromApi.id || result.user?.id,
        email: userFromApi.email || result.user?.email,
        username: userFromApi.username || result.user?.email?.split('@')[0],
        role: userFromApi.role || 'practitioner',
        name: userFromApi.name || result.user?.name,
        picture: userFromApi.picture || result.user?.photo,
      };

      if (!accessToken || !normalizedUser.email) {
        throw new Error(
          data?.message || 'Invalid login response from server'
        );
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
        }),
      ).unwrap();

      // Fetch practitioner profile (don't block login if this fails)
      try {
        await dispatch(fetchUser()).unwrap();
      } catch {
        // User is still logged in; practitionerId may be set later
      }

      router.replace('/(tabs)');
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Google sign in failed';
      Alert.alert('Error', message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Login header with Healthify logo */}
      <View style={styles.loginHeader}>
        <Image
          style={styles.headerLogo}
          source={IMG.Healthify_logo}
          resizeMode="contain"
        />
        <Text style={styles.headerTagline}>Provider Portal</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.headerContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.welcomeText}>Welcome!</Text>
            <Text style={styles.subtitle}>
              Sign in to access your Healthify Provider Portal
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.formCard,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.cardIntro}>
              Use your Google account to sign in as a practitioner.
            </Text>

            <TouchableOpacity
              style={[styles.signInButton, isLoading && styles.buttonDisabled]}
              onPress={handleGoogleSignIn}
              disabled={isLoading}
              activeOpacity={0.8}
              testID="google-sign-in-button"
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={22} color={COLORS.white} />
                  <Text style={styles.signInButtonText}>
                    Sign in with Google
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg_light,
  },
  loginHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bg_dark,
  },
  headerLogo: {
    height: 36,
    width: 140,
  },
  headerTagline: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.txt_secondary,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 10,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.txt_primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.txt_secondary,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 24,
  },
  cardIntro: {
    fontSize: 14,
    color: COLORS.txt_secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  signInButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.logo,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
});
