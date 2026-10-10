import { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import {
  fetchNotifications,
  markNotificationRead,
} from '../../src/services/inAppNotificationService';

function formatWhen(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function actionLine(item) {
  if (item.title === 'Chat request') return 'would like to chat with you';
  if (item.title === 'Ready to chat') return 'is ready to chat with you';
  return item.body || 'sent you a message';
}

function initial(item) {
  const name = (item.personName || 'H').trim();
  return name.charAt(0).toUpperCase();
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchNotifications(50);
      setItems(Array.isArray(rows) ? rows : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const openChat = async (item) => {
    if (!item.isRead) {
      try {
        await markNotificationRead(item.id);
      } catch {
        // Opening the chat still works if marking read fails.
      }
    }
    if (item.chatId) router.push(`/chat/${item.chatId}`);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color={COLORS.txt_primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
      </View>
      {loading ? (
        <ActivityIndicator color={COLORS.logo} style={styles.loader} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {items.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons
                name="notifications-off-outline"
                size={28}
                color={COLORS.primary_light}
              />
              <Text style={styles.empty}>You're all caught up</Text>
            </View>
          ) : (
            items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.row, !item.isRead && styles.unread]}
                onPress={() => openChat(item)}
              >
                <View
                  style={[styles.avatar, !item.isRead && styles.avatarUnread]}
                >
                  <Text
                    style={[
                      styles.avatarText,
                      !item.isRead && styles.avatarTextUnread,
                    ]}
                  >
                    {initial(item)}
                  </Text>
                </View>
                <View style={styles.copy}>
                  <View style={styles.topLine}>
                    <Text style={styles.person} numberOfLines={1}>
                      {item.personName || 'Healthify'}
                    </Text>
                    <Text style={styles.when}>
                      {formatWhen(item.created_at)}
                    </Text>
                  </View>
                  <Text style={styles.body}>{actionLine(item)}</Text>
                  {item.chatId ? (
                    <View style={styles.linkRow}>
                      <Text style={styles.link}>Open chat</Text>
                      <Ionicons
                        name="chevron-forward"
                        size={14}
                        color={COLORS.logo}
                      />
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg_light, paddingHorizontal: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  back: { padding: 4 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.txt_primary },
  loader: { marginTop: 24 },
  list: { paddingBottom: 24 },
  emptyWrap: { alignItems: 'center', marginTop: 32, gap: 8 },
  empty: { fontSize: 14, color: COLORS.txt_secondary },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
  },
  unread: { backgroundColor: 'rgba(157, 90, 143, 0.1)' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg_dark,
  },
  avatarUnread: { backgroundColor: COLORS.logo },
  avatarText: { fontSize: 18, fontWeight: '700', color: COLORS.logo },
  avatarTextUnread: { color: COLORS.white },
  copy: { flex: 1 },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  person: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.txt_primary,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.txt_secondary,
    marginTop: 2,
  },
  when: { fontSize: 12, color: COLORS.txt_secondary },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 2,
  },
  link: { fontSize: 13, fontWeight: '700', color: COLORS.logo },
});
