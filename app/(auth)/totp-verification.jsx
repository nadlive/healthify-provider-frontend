import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { verifyTotp, clearError } from '../../src/store/slices/authSlice';
import { fetchUser } from '../../src/store/slices/authSlice';
import { COLORS } from '../../constants/colors';
import { MainStyles } from '../../assets/styles/main.styles';

export default function TotpVerification() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { email: paramEmail } = useLocalSearchParams();
  const { isLoading, error, isAuthenticated, tempEmail } = useSelector(
    (state) => state.auth
  );

  const [totpCode, setTotpCode] = useState('');
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const targetEmail = tempEmail || paramEmail;

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchUser()).unwrap().then(() => {
        router.replace('/(tabs)');
      }).catch(() => {
        router.replace('/(tabs)');
      });
    }
  }, [isAuthenticated, dispatch, router]);

  useEffect(() => {
    if (error) {
      Alert.alert('Verification Error', error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleVerify = () => {
    if (!totpCode.trim()) {
      Alert.alert('Input Error', 'Please enter the TOTP code.');
      return;
    }
    if (targetEmail) {
      dispatch(verifyTotp({ email: targetEmail, totpCode: totpCode.trim() }));
    } else {
      Alert.alert('Error', 'Email not found for TOTP verification.');
    }
  };

  const handleResend = () => {
    setTimer(60);
    setCanResend(false);
    Alert.alert('Resend Code', 'A new TOTP code has been sent to your email.');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={MainStyles.Primary_screen_container}>
        <View style={MainStyles.Secondary_screen_container}>
          <Text style={MainStyles.header_1}>Verify Your Login</Text>
          <Text style={MainStyles.paragraph_text}>
            Please enter the 6-digit code sent to {targetEmail || 'your email'}.
          </Text>

          <View style={MainStyles.form_container}>
            <Text style={MainStyles.input_label}>TOTP Code</Text>
            <TextInput
              style={MainStyles.text_input}
              placeholder="Enter 6-digit code"
              placeholderTextColor={COLORS.txt_secondary}
              keyboardType="number-pad"
              maxLength={6}
              value={totpCode}
              onChangeText={setTotpCode}
            />

            <TouchableOpacity
              style={MainStyles.primary_button}
              onPress={handleVerify}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={MainStyles.primary_button_text}>Verify</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={MainStyles.secondary_button}
              onPress={handleResend}
              disabled={!canResend || isLoading}
            >
              <Text
                style={[
                  MainStyles.secondary_button_text,
                  !canResend && { color: COLORS.txt_secondary },
                ]}
              >
                Resend Code {timer > 0 && `(${timer}s)`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
