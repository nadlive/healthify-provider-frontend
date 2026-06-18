import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

const DRAWER_LINKS = [
  { route: '/(tabs)/', label: 'Home', icon: 'home-outline' },
  {
    route: '/(tabs)/appointments',
    label: 'Appointments',
    icon: 'calendar-outline',
  },
  { route: '/(tabs)/profile', label: 'Profile', icon: 'person-outline' },
];

function DrawerContent({ onClose, onNavigate }) {
  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.drawer}>
        <View style={styles.drawerHeader}>
          <Text style={styles.drawerTitle}>Menu</Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={12}
          >
            <Ionicons name="close" size={24} color={COLORS.txt_primary} />
          </TouchableOpacity>
        </View>
        {DRAWER_LINKS.map((item) => (
          <TouchableOpacity
            key={item.route}
            style={styles.link}
            onPress={() => onNavigate(item.route)}
            activeOpacity={0.7}
          >
            <Ionicons name={item.icon} size={22} color={COLORS.logo} />
            <Text style={styles.linkText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function NavigationDrawer({ open, onClose }) {
  const router = useRouter();

  const handleNavigate = (route) => {
    onClose();
    router.push(route);
  };

  if (!open) return null;

  // On web, render inside the app container so the drawer stays within the
  // 375px phone frame instead of the viewport (Modal portals to body).
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webOverlay} pointerEvents="box-none">
        <DrawerContent onClose={onClose} onNavigate={handleNavigate} />
      </View>
    );
  }

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <DrawerContent onClose={onClose} onNavigate={handleNavigate} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  webOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  drawer: {
    width: 280,
    backgroundColor: COLORS.white,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.bg_dark,
    paddingTop: 16,
    paddingHorizontal: 12,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.txt_primary,
  },
  closeBtn: {
    padding: 4,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 4,
    borderRadius: 8,
  },
  linkText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.txt_primary,
    marginLeft: 12,
  },
});
