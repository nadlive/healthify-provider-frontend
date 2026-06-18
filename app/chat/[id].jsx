import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { GiftedChat } from 'react-native-gifted-chat';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import { fetchChatById } from '../../src/store/slices/chatSlice';
import { COLORS } from '../../constants/colors';

function getChatId(paramId) {
  if (paramId && paramId !== 'test') return paramId;
  return 'provider-test';
}

export default function ChatScreen() {
  const router = useRouter();
  const { id: paramId } = useLocalSearchParams();
  const chatId = getChatId(paramId);
  const dispatch = useAppDispatch();
  const { currentChat } = useAppSelector((state) => state.chat);

  const chatStatus = currentChat?.status ?? '';
  const statusLabel = chatStatus?.toUpperCase();

  const isChatCompleted = String(chatStatus).toLowerCase() === 'completed';
  const chatReadOnly = isChatCompleted || !currentChat;

  useEffect(() => {
    if (chatId) {
      dispatch(fetchChatById(chatId));
    }
  }, [chatId, dispatch]);

  const [firebaseUser, setFirebaseUser] = useState(auth.currentUser);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [sendStatus, setSendStatus] = useState('idle');
  const [sendError, setSendError] = useState(null);

  const displayName = 'Provider';

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setFirebaseUser);
    if (!auth.currentUser) {
      signInAnonymously(auth).catch((e) =>
        console.warn('[Chat] Anonymous sign-in:', e?.message),
      );
    }
    return unsub;
  }, []);

  useEffect(() => {
    if (!chatId || !firebaseUser) {
      setMessagesLoading(false);
      return;
    }
    setMessagesLoading(true);
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setMessagesLoading(false);
        setMessages(
          snap.docs.map((doc) => {
            const d = doc.data();
            return {
              _id: doc.id,
              text: d.text || '',
              createdAt: d.createdAt?.toDate() || new Date(),
              user: { _id: d.userId, name: d.userName || 'User' },
            };
          }),
        );
      },
      (err) => {
        setMessagesLoading(false);
        setSendError(err?.message || 'Listen failed');
      },
    );
    return unsub;
  }, [chatId, firebaseUser]);

  const onSend = useCallback(
    async (newMessages = []) => {
      const msg = newMessages[0];
      if (!msg || !chatId) return;

      let user = auth.currentUser;
      if (!user) {
        try {
          const r = await signInAnonymously(auth);
          user = r.user;
          setFirebaseUser(user);
        } catch (e) {
          setSendStatus('error');
          setSendError(e?.message || 'Sign-in failed');
          return;
        }
      }

      setSendStatus('sending');
      setSendError(null);
      try {
        await addDoc(collection(db, 'chats', chatId, 'messages'), {
          text: msg.text || '',
          userId: user.uid,
          userName: displayName,
          createdAt: serverTimestamp(),
        });
        setSendStatus('sent');
        setTimeout(() => setSendStatus('idle'), 2000);
      } catch (e) {
        setSendStatus('error');
        setSendError(e?.message || 'Send failed');
      }
    },
    [chatId],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Chat</Text>
      </View>

      {statusLabel ? (
        <View
          style={[
            styles.chatStatusBar,
            isChatCompleted && styles.chatStatusBarCompleted,
          ]}
        >
          <Text
            style={[
              styles.chatStatusText,
              isChatCompleted && styles.chatStatusTextCompleted,
            ]}
          >
            {statusLabel}
          </Text>
        </View>
      ) : null}

      {sendError ? (
        <View style={styles.statusBarError}>
          <Text style={styles.statusText}>{sendError}</Text>
        </View>
      ) : null}
      {sendStatus === 'sending' && (
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>Sending...</Text>
        </View>
      )}
      {sendStatus === 'sent' && (
        <View style={[styles.statusBar, styles.statusBarSent]}>
          <Text style={styles.statusText}>Sent ✓</Text>
        </View>
      )}

      <View
        style={[styles.chatWrap, isChatCompleted && styles.chatWrapCompleted]}
      >
        {!firebaseUser ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.logo} />
            <Text style={styles.loadingText}>Connecting...</Text>
          </View>
        ) : (
          <GiftedChat
            messages={messages}
            onSend={chatReadOnly ? () => {} : onSend}
            user={{ _id: firebaseUser.uid, name: displayName }}
            placeholder={chatReadOnly ? '' : 'Type a message...'}
            renderActions={chatReadOnly ? () => null : undefined}
            renderInputToolbar={chatReadOnly ? () => null : undefined}
            renderChatEmpty={
              messagesLoading
                ? () => (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={COLORS.logo} />
                      <Text style={styles.loadingText}>
                        Loading messages...
                      </Text>
                    </View>
                  )
                : undefined
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg_light },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bg_dark,
  },
  backBtn: { marginRight: 12 },
  backText: { fontSize: 16, color: COLORS.logo },
  title: { fontSize: 18, fontWeight: '600', color: COLORS.txt_primary },
  chatStatusBar: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.bg_dark,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bg_light,
  },
  chatStatusBarCompleted: {
    backgroundColor: COLORS.txt_secondary + '20',
  },
  chatStatusText: {
    fontSize: 13,
    color: COLORS.txt_primary,
    fontWeight: '500',
  },
  chatStatusTextCompleted: {
    color: COLORS.txt_secondary,
  },
  chatId: {
    marginLeft: 8,
    fontSize: 12,
    color: COLORS.txt_secondary,
    flex: 1,
  },
  statusBar: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: COLORS.bg_dark,
  },
  statusBarSent: {
    backgroundColor: `${COLORS.logo}20`,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.logo,
  },
  statusBarError: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fee',
  },
  statusText: { fontSize: 13, color: COLORS.txt_primary },
  loadingText: { fontSize: 14, color: COLORS.txt_secondary, marginTop: 8 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  chatWrap: { flex: 1 },
  chatWrapCompleted: {
    opacity: 0.85,
    backgroundColor: COLORS.txt_secondary + '12',
  },
});
