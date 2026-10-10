import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/colors';
import { registerFirebaseWebPush } from '../../src/lib/registerFirebaseWebPush';
import createApiInstance from '../../src/services/api';

const api = createApiInstance();

export default function SettingsScreen() {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);

  const handleTurnOnNotifications = async () => {
    if (Platform.OS !== 'web') {
      alert('Open Healthify in the phone browser, then tap Turn on notifications.');
      return;
    }
    const token = await registerFirebaseWebPush({ askPermission: true });
    if (!token) return;
    try {
      await api.post('/user/fcm', { token });
      setEnabled(true);
    } catch (error) {
      console.warn('[FCM] Saving token failed', error);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color={COLORS.txt_primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.note}>
          Turn this on if you use chat. It lets you know when a patient wants
          to chat, and lets them know when you are ready.
        </Text>
        <TouchableOpacity
          onPress={() => {
            void handleTurnOnNotifications();
          }}
          style={styles.button}
        >
          <Ionicons
            name="notifications-outline"
            size={20}
            color={COLORS.white}
          />
          <Text style={styles.buttonText}>Turn on notifications</Text>
        </TouchableOpacity>
        {enabled ? (
          <View style={styles.success}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.access} />
            <Text style={styles.successText}>Notification enabled</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg_light,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  back: { padding: 4 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.txt_primary },
  card: {
    marginTop: 8,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
  },
  note: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.txt_primary,
    marginBottom: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.logo,
    borderRadius: 12,
    paddingVertical: 14,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  success: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
  },
  successText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.access,
  },
});
