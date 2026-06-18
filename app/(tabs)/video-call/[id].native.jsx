import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  PanResponder,
  Vibration,
  Alert,
  Modal,
  useWindowDimensions,
  Animated,
  Platform,
} from 'react-native';
import { Audio } from 'expo-av';
import { COLORS } from '../../../constants/colors';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import createApiInstance from '../../../src/services/api';
import {
  RTCView,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  registerGlobals,
  permissions,
} from '@livekit/react-native-webrtc';

registerGlobals();

const EXPO_PUBLIC_SIGNALING_SERVER = process.env.EXPO_PUBLIC_SIGNALING_SERVER;

const info = (title, message) => Alert.alert(title, message);

export default function VideoCall() {
  const identityApi = createApiInstance();

  const { id: appointmentId } = useLocalSearchParams();
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [localVideoPosition, setLocalVideoPosition] = useState({
    top: 20,
    left: 20,
  });
  const [remoteVideoPlaying, setRemoteVideoPlaying] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [debugInfo, setDebugInfo] = useState({
    hasRelay: false,
    hasSrflx: false,
    hasHost: false,
  });
  const [debugLogs, setDebugLogs] = useState([]);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [localStreamURL, setLocalStreamURL] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const reconnectAttempts = useRef(0);
  const incomingCallPulse = useRef(new Animated.Value(1)).current;
  const { height: screenHeight } = useWindowDimensions();
  const videoContainerHeight = Math.round(screenHeight * 0.6);

  const addDebugLog = (msg) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs((prev) => [...prev.slice(-15), `[${timestamp}] ${msg}`]);
  };

  const ws = useRef(null);
  const pc = useRef(null);
  const localStream = useRef(null);
  const remoteIdRef = useRef('');
  const pendingIceCandidates = useRef([]);
  const cachedIceServers = useRef(null);
  const inCallRef = useRef(false);
  const containerLayout = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const ringtoneSound = useRef(null);

  // Provider: we are the practitioner, remote is the patient
  const myId = `practitioner-${appointmentId}`;
  const remoteId = `patient-${appointmentId}`;

  const startRingtone = async () => {
    const RING_PATTERN = [0, 400, 400, 800];
    Vibration.vibrate(RING_PATTERN, true);
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        interruptModeIOS: 1,
        interruptModeAndroid: 1,
      });
      if (!ringtoneSound.current) {
        const { sound } = await Audio.Sound.createAsync(
          require('../../../assets/ringtone.mp3'),
          { shouldPlay: true, isLooping: true, volume: 0.7 },
        );
        ringtoneSound.current = sound;
      } else {
        await ringtoneSound.current.setPositionAsync(0);
        await ringtoneSound.current.setIsLoopingAsync(true);
        await ringtoneSound.current.playAsync();
      }
    } catch (e) {
      addDebugLog(`⚠️ Ringtone play failed: ${e?.message || e}`);
    }
  };

  const stopRingtone = () => {
    Vibration.cancel();
    if (ringtoneSound.current) {
      ringtoneSound.current.stopAsync().catch(() => {});
    }
  };

  const requestMediaPermissions = async () => {
    try {
      const [mic, cam] = await Promise.all([
        permissions.request({ name: 'microphone' }),
        permissions.request({ name: 'camera' }),
      ]);
      if (!mic) addDebugLog('⚠️ Microphone permission denied');
      if (!cam) addDebugLog('⚠️ Camera permission denied');
      if (mic && cam) addDebugLog('✅ Camera & microphone granted');
      return mic && cam;
    } catch (e) {
      addDebugLog(`⚠️ Permission request failed: ${e?.message || e}`);
      return false;
    }
  };

  const fetchTurnCredentials = async () => {
    if (cachedIceServers.current?.iceServers?.length) {
      addDebugLog('📡 TURN credentials (cached)');
      return cachedIceServers.current;
    }
    try {
      const response = await identityApi.get('/auth/ice-handlers');
      const data = response?.data ?? response;
      if (data?.iceServers?.length) {
        cachedIceServers.current = data;
        addDebugLog('📡 TURN credentials fetched from API');
        return data;
      }
    } catch (err) {
      addDebugLog(
        `⚠️ TURN API failed: ${err?.message || err}. Using STUN-only (TURN relay disabled)`,
      );
    }
    return {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    };
  };

  const createPeerConnection = async () => {
    const turnCredentials = await fetchTurnCredentials();
    const hasTurn = turnCredentials.iceServers?.some(
      (s) =>
        s.urls &&
        (String(s.urls).includes('turn:') ||
          (Array.isArray(s.urls) &&
            s.urls.some((u) => String(u).includes('turn:')))),
    );
    const config = {
      ...turnCredentials,
      ...(hasTurn && { iceTransportPolicy: 'relay' }),
    };
    pc.current = new RTCPeerConnection(config);

    pc.current.oniceconnectionstatechange = async () => {
      const state = pc.current?.iceConnectionState;
      addDebugLog(`🧊 ICE: ${state}`);
      setConnectionStatus(state || 'disconnected');

      if (
        state === 'disconnected' &&
        reconnectAttempts.current < 3 &&
        inCallRef.current
      ) {
        reconnectAttempts.current++;
        addDebugLog(
          `🔄 Auto-reconnecting (attempt ${reconnectAttempts.current}/3)...`,
        );
        setIsReconnecting(true);
        try {
          const offer = await pc.current.createOffer({ iceRestart: true });
          await pc.current.setLocalDescription(offer);
          ws.current?.send(
            JSON.stringify({
              type: 'offer',
              to: remoteIdRef.current,
              offer,
            }),
          );
          addDebugLog('✅ Sent ICE restart offer');
        } catch {
          addDebugLog('❌ ICE restart failed');
        } finally {
          setIsReconnecting(false);
        }
      } else if (state === 'failed') {
        addDebugLog(
          `❌ Connection FAILED after ${reconnectAttempts.current} attempts`,
        );
        reconnectAttempts.current = 0;
      } else if (state === 'connected') {
        reconnectAttempts.current = 0;
        addDebugLog('✅ Connection stable');
      }
    };

    pc.current.onconnectionstatechange = () => {
      const state = pc.current?.connectionState;
      addDebugLog(`🔗 P2P: ${state}`);
      if (state === 'failed' || state === 'disconnected') {
        setConnectionStatus(state);
      }
    };

    pc.current.onicecandidate = (event) => {
      if (event.candidate && remoteIdRef.current) {
        const type = event.candidate.type;
        if (type === 'relay') setDebugInfo((p) => ({ ...p, hasRelay: true }));
        else if (type === 'srflx')
          setDebugInfo((p) => ({ ...p, hasSrflx: true }));
        else if (type === 'host')
          setDebugInfo((p) => ({ ...p, hasHost: true }));

        ws.current?.send(
          JSON.stringify({
            type: 'ice-candidate',
            to: remoteIdRef.current,
            candidate: event.candidate,
          }),
        );
      }
    };

    pc.current.ontrack = (event) => {
      if (event.streams?.[0]) {
        setRemoteStream(event.streams[0]);
        setRemoteVideoPlaying(true);
        addDebugLog('📺 Remote video track received!');
      }
    };

    return pc.current;
  };

  const VIDEO_CONSTRAINTS = {
    video: {
      width: { ideal: 640, max: 640 },
      height: { ideal: 480, max: 480 },
      frameRate: { ideal: 15, max: 24 },
    },
    audio: { echoCancellation: true, noiseSuppression: true },
  };

  const setupLocalStreamAndPeerConnection = async () => {
    try {
      const stream = await mediaDevices.getUserMedia(VIDEO_CONSTRAINTS);
      localStream.current = stream;
      stream.getTracks().forEach((track) => {
        track.enabled = true;
      });
      const audioTracks = stream.getAudioTracks();
      const videoTracks = stream.getVideoTracks();
      if (audioTracks.length === 0) {
        addDebugLog('⚠️ No microphone track – check app permissions');
        info(
          'Microphone',
          'No microphone access. Please allow microphone for Provider in your device Settings.',
        );
      } else {
        addDebugLog(`🎤 Microphone track ready (${audioTracks.length})`);
      }
      if (videoTracks.length === 0) {
        addDebugLog('⚠️ No camera track – check app permissions');
      }
      setLocalStreamURL(stream.toURL());
      const connection = await createPeerConnection();
      stream.getTracks().forEach((track) => connection.addTrack(track, stream));
      return connection;
    } catch (err) {
      const msg = err?.message || String(err);
      addDebugLog(`❌ getUserMedia failed: ${msg}`);
      const iosHint =
        Platform.OS === 'ios'
          ? ' On iPhone: Settings → Provider → enable Microphone and Camera.'
          : '';
      info(
        'Camera & microphone',
        `Could not access camera or microphone. Please allow Provider, then try again.${iosHint}`,
      );
      throw err;
    }
  };

  const startCallAfterAccept = async () => {
    try {
      await setupLocalStreamAndPeerConnection();
      const offer = await pc.current.createOffer();
      await pc.current.setLocalDescription(offer);
      ws.current?.send(
        JSON.stringify({
          type: 'offer',
          to: remoteIdRef.current,
          offer,
        }),
      );
    } catch (error) {
      info('Error', 'Error starting call: ' + error);
      setInCall(false);
    }
  };

  const handleOffer = async (data) => {
    try {
      remoteIdRef.current = data.from;
      await setupLocalStreamAndPeerConnection();
      await pc.current.setRemoteDescription(
        new RTCSessionDescription(data.offer),
      );
      while (pendingIceCandidates.current.length > 0) {
        const candidate = pendingIceCandidates.current.shift();
        await pc.current.addIceCandidate(candidate);
      }
      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);
      ws.current?.send(
        JSON.stringify({
          type: 'answer',
          to: data.from,
          answer,
        }),
      );
      setInCall(true);
    } catch (error) {
      info('Error', 'Error accepting call: ' + error);
      setInCall(false);
    }
  };

  const handleAnswer = async (data) => {
    try {
      await pc.current?.setRemoteDescription(
        new RTCSessionDescription(data.answer),
      );
      while (pendingIceCandidates.current.length > 0) {
        const candidate = pendingIceCandidates.current.shift();
        await pc.current.addIceCandidate(candidate);
      }
    } catch {}
  };

  const handleIceCandidate = async (data) => {
    try {
      if (!data.candidate) return;
      const candidate = new RTCIceCandidate(data.candidate);
      if (pc.current && pc.current.remoteDescription) {
        await pc.current.addIceCandidate(candidate);
      } else {
        pendingIceCandidates.current.push(candidate);
      }
    } catch {}
  };

  const endCall = () => {
    if (remoteIdRef.current) {
      ws.current?.send(
        JSON.stringify({ type: 'end-call', to: remoteIdRef.current }),
      );
    }
    localStream.current?.getTracks().forEach((track) => track.stop());
    pc.current?.close();
    pc.current = null;
    localStream.current = null;
    remoteIdRef.current = '';
    pendingIceCandidates.current = [];
    setLocalStreamURL(null);
    setRemoteStream(null);
    setInCall(false);
    setRemoteVideoPlaying(false);
    setConnectionStatus('disconnected');
  };

  const startCall = async () => {
    if (!connected || !isReady || !remoteId) return;
    remoteIdRef.current = remoteId;
    setRemoteVideoPlaying(false);
    ws.current?.send(JSON.stringify({ type: 'call-request', to: remoteId }));
    setInCall(true);
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    stopRingtone();
    remoteIdRef.current = incomingCall;
    setIncomingCall(null);
    setRemoteVideoPlaying(false);
    ws.current?.send(
      JSON.stringify({ type: 'call-accepted', to: incomingCall }),
    );
    setInCall(true);
  };

  const rejectCall = () => {
    if (!incomingCall) return;
    stopRingtone();
    ws.current?.send(
      JSON.stringify({ type: 'call-rejected', to: incomingCall }),
    );
    setIncomingCall(null);
  };

  const localVideoPositionRef = useRef({ top: 20, left: 20 });
  const dragStartPositionRef = useRef({ top: 20, left: 20 });
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        const pos = localVideoPositionRef.current;
        dragStartPositionRef.current = {
          top: typeof pos.top === 'number' ? pos.top : 20,
          left: typeof pos.left === 'number' ? pos.left : 20,
        };
      },
      onPanResponderMove: (evt, gestureState) => {
        const { dx, dy } = gestureState;
        const { top: startTop, left: startLeft } = dragStartPositionRef.current;
        const maxTop = (containerLayout.current.height || 400) - 106;
        const maxLeft = (containerLayout.current.width || 300) - 84;
        const next = {
          top: Math.max(20, Math.min(startTop + dy, maxTop)),
          left: Math.max(20, Math.min(startLeft + dx, maxLeft)),
          right: 'auto',
        };
        localVideoPositionRef.current = next;
        setLocalVideoPosition(next);
      },
    }),
  ).current;

  useEffect(() => {
    localVideoPositionRef.current = localVideoPosition;
  }, [localVideoPosition]);

  useEffect(() => {
    const signalingUrl = EXPO_PUBLIC_SIGNALING_SERVER;
    addDebugLog(`Connecting to: ${signalingUrl}`);

    const connectWebSocket = () => {
      ws.current = new WebSocket(signalingUrl);
      ws.current.onopen = () => {
        ws.current?.send(JSON.stringify({ type: 'register', id: myId }));
        setConnected(true);
        addDebugLog('✅ Signaling server connected');
      };
      ws.current.onclose = (event) => {
        setConnected(false);
        setIsReady(false);
        addDebugLog(
          `⚠️ Signaling closed (code: ${event.code}, reason: ${event.reason || 'none'})`,
        );
      };
      ws.current.onerror = () => {
        setConnected(false);
        setIsReady(false);
        addDebugLog(
          '❌ Signaling server error (see close code above for cause)',
        );
      };
      ws.current.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case 'call-request':
            setIncomingCall(data.from);
            break;
          case 'call-accepted':
            await startCallAfterAccept();
            break;
          case 'call-rejected':
            info('Call Rejected', 'Call was rejected');
            setInCall(false);
            break;
          case 'offer':
            await handleOffer(data);
            break;
          case 'answer':
            await handleAnswer(data);
            break;
          case 'ice-candidate':
            await handleIceCandidate(data);
            break;
          case 'end-call':
            stopRingtone();
            setIncomingCall(null);
            if (inCallRef.current) {
              endCall();
              info('Call Ended', 'Call ended by remote user');
            } else {
              info('Call Cancelled', 'The caller ended the call');
            }
            break;
          default:
            break;
        }
      };
    };

    connectWebSocket();

    return () => {
      stopRingtone();
      ringtoneSound.current?.unloadAsync().catch(() => {});
      ringtoneSound.current = null;
      localStream.current?.getTracks().forEach((track) => track.stop());
      pc.current?.close();
      ws.current?.close();
      pendingIceCandidates.current = [];
    };
  }, [appointmentId]);

  useEffect(() => {
    inCallRef.current = inCall;
  }, [inCall]);

  useEffect(() => {
    if (incomingCall && isReady) {
      stopRingtone();
      startRingtone();
    } else {
      stopRingtone();
    }
  }, [incomingCall, isReady]);

  useEffect(() => {
    if (!incomingCall) {
      incomingCallPulse.setValue(1);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(incomingCallPulse, {
          toValue: 1.04,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(incomingCallPulse, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [incomingCall, incomingCallPulse]);

  useEffect(() => {
    if (!connected) return;
    const fetchCreds = async () => {
      try {
        const response = await identityApi.get('/auth/ice-handlers');
        const data = response?.data ?? response;
        if (data?.iceServers?.length) {
          cachedIceServers.current = data;
          addDebugLog('📡 TURN credentials pre-fetched');
        }
      } catch {
        cachedIceServers.current = null;
      }
    };
    fetchCreds();
  }, [connected]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.txt_primary} />
            <Text style={styles.header_1}>Video Call</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statusBar}>
          <View style={styles.statusRow} />
          {inCall && (
            <View style={styles.connectionIndicator}>
              <View
                style={[
                  styles.connectionDot,
                  connectionStatus === 'connected' && styles.dotGreen,
                  (connectionStatus === 'checking' || isReconnecting) &&
                    styles.dotYellow,
                  (connectionStatus === 'disconnected' ||
                    connectionStatus === 'failed') &&
                    styles.dotRed,
                ]}
              />
              <Text style={styles.connectionText}>
                {connectionStatus} {isReconnecting && '🔄'}
              </Text>
            </View>
          )}
        </View>

        <View
          style={[styles.videoContainer, { minHeight: videoContainerHeight }]}
          onLayout={(e) => {
            const { x, y, width, height } = e.nativeEvent.layout;
            containerLayout.current = { x, y, width, height };
          }}
        >
          {remoteStream ? (
            <RTCView
              streamURL={remoteStream.toURL()}
              style={styles.remoteVideo}
              objectFit="cover"
            />
          ) : (
            <View style={styles.remoteVideoPlaceholder} />
          )}

          {inCall && !remoteVideoPlaying && (
            <View style={styles.connectingOverlay}>
              <ActivityIndicator size="large" color="#ffffff" />
              <Text style={styles.connectingText}>Connecting...</Text>
            </View>
          )}

          {localStreamURL && (
            <View
              {...panResponder.panHandlers}
              style={[
                styles.localVideo,
                {
                  top: localVideoPosition.top,
                  left: localVideoPosition.left ?? 20,
                },
              ]}
            >
              <RTCView
                streamURL={localStreamURL}
                style={styles.localVideoInner}
                objectFit="cover"
                mirror
                zOrder={1}
              />
            </View>
          )}

          {inCall && (
            <TouchableOpacity
              style={styles.fullScreenButton}
              onPress={() => setIsFullScreen(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="expand" size={24} color="#fff" />
            </TouchableOpacity>
          )}

          {inCall && (
            <TouchableOpacity
              style={styles.endCallIconButton}
              onPress={endCall}
              activeOpacity={0.8}
            >
              <Ionicons name="call" size={32} color="#fff" />
            </TouchableOpacity>
          )}

          {incomingCall && (
            <Animated.View
              style={[
                styles.incomingCallInVideo,
                {
                  transform: [{ scale: incomingCallPulse }],
                },
              ]}
            >
              <View style={styles.incomingCallCard}>
                <View style={styles.incomingCallLabelRow}>
                  <Ionicons name="call" size={22} color="#fff" />
                  <Text style={styles.incomingCallLabel}>Incoming call...</Text>
                </View>
                <View style={styles.incomingCallButtons}>
                  <TouchableOpacity
                    style={styles.incomingAcceptButton}
                    onPress={acceptCall}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="call" size={18} color="#fff" />
                    <Text style={styles.signInButtonText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.incomingRejectButton}
                    onPress={rejectCall}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close" size={18} color="#fff" />
                    <Text style={styles.incomingRejectButtonText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          )}

          {!inCall && !incomingCall && isReady && (
            <TouchableOpacity
              style={[
                styles.startCallIconButton,
                !connected && styles.startCallIconButtonDisabled,
              ]}
              onPress={startCall}
              disabled={!connected}
              activeOpacity={0.8}
            >
              <Ionicons name="videocam" size={32} color="#fff" />
            </TouchableOpacity>
          )}

          {connected && !isReady && !inCall && !incomingCall && (
            <TouchableOpacity
              style={styles.readyToCallButton}
              onPress={async () => {
                const granted = await requestMediaPermissions();
                setIsReady(true);
                if (!granted) {
                  info(
                    'Microphone & camera',
                    'Allow access so your video and voice work during the call. You can enable in Settings → Provider.',
                  );
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.readyToCallButtonText}>📞 Ready for calls</Text>
            </TouchableOpacity>
          )}
        </View>

        <Modal
          visible={isFullScreen}
          animationType="fade"
          transparent={false}
          onRequestClose={() => setIsFullScreen(false)}
        >
          <View style={styles.fullScreenContainer}>
            {remoteStream ? (
              <RTCView
                streamURL={remoteStream.toURL()}
                style={StyleSheet.absoluteFill}
                objectFit="cover"
              />
            ) : (
              <View
                style={[StyleSheet.absoluteFill, styles.remoteVideoPlaceholder]}
              />
            )}
            {localStreamURL && (
              <View style={styles.fullScreenLocalVideo}>
                <RTCView
                  streamURL={localStreamURL}
                  style={styles.localVideoInner}
                  objectFit="cover"
                  mirror
                />
              </View>
            )}
            <TouchableOpacity
              style={styles.exitFullScreenButton}
              onPress={() => setIsFullScreen(false)}
              activeOpacity={0.8}
            >
              <Ionicons name="contract" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        </Modal>

        <View>
          <Text style={styles.smallText}>
            {connected ? '✅' : '❌'} Status
            {isReady && ' ✅ Ready to accept calls'}
          </Text>
          <TouchableOpacity
            onPress={() => setShowDebug(!showDebug)}
            style={styles.debugToggle}
          >
            <Text style={styles.debugToggleText}>
              {showDebug ? '▼' : '▶'} Debug Info
            </Text>
          </TouchableOpacity>
          {showDebug && (
            <View style={styles.debugPanel}>
              <Text style={styles.debugText}>
                TURN: {debugInfo.hasRelay ? '✅' : '❌'} | STUN:{' '}
                {debugInfo.hasSrflx ? '✅' : '❌'} | Direct:{' '}
                {debugInfo.hasHost ? '✅' : '❌'}
              </Text>
              <Text style={styles.tinyText}>
                Your ID: {myId} • Remote ID: {remoteId}
              </Text>
              <View style={styles.debugLogs}>
                {debugLogs.map((log, i) => (
                  <Text key={i} style={styles.debugLogText}>
                    {log}
                  </Text>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  statusBar: {
    marginBottom: 10,
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallText: {
    fontSize: 12,
    color: '#666',
  },
  tinyText: {
    fontSize: 10,
    color: '#666',
  },
  connectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  connectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ccc',
  },
  dotGreen: { backgroundColor: '#4CAF50' },
  dotYellow: { backgroundColor: '#FFC107' },
  dotRed: { backgroundColor: '#F44336' },
  connectionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  signInButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  debugToggle: {
    marginTop: 8,
  },
  debugToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  debugPanel: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  debugText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#333',
  },
  debugLogs: {
    maxHeight: 100,
    marginTop: 8,
    backgroundColor: '#000',
    padding: 5,
    borderRadius: 4,
  },
  debugLogText: {
    fontSize: 9,
    color: '#0f0',
    fontFamily: 'monospace',
  },
  incomingCallInVideo: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  incomingCallCard: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    minWidth: 220,
    maxWidth: '90%',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  incomingCallLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  incomingCallLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  incomingCallButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  incomingAcceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.access,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 24,
    minWidth: 100,
  },
  incomingRejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#E53935',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 24,
    minWidth: 100,
  },
  incomingRejectButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  videoContainer: {
    position: 'relative',
    backgroundColor: '#000',
    margin: 5,
    marginBottom: 80,
    borderRadius: 16,
    overflow: 'hidden',
  },
  remoteVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  remoteVideoPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  connectingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectingText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 10,
  },
  localVideo: {
    position: 'absolute',
    width: 64,
    height: 86,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'white',
    zIndex: 10,
  },
  localVideoInner: {
    flex: 1,
    backgroundColor: '#000',
  },
  endCallIconButton: {
    position: 'absolute',
    bottom: 24,
    left: '50%',
    marginLeft: -32,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  startCallIconButton: {
    position: 'absolute',
    bottom: 24,
    left: '50%',
    marginLeft: -32,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.access,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  startCallIconButtonDisabled: {
    opacity: 0.6,
  },
  readyToCallButton: {
    position: 'absolute',
    bottom: 24,
    left: '50%',
    marginLeft: -100,
    minWidth: 200,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 32,
    backgroundColor: COLORS.logo,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  readyToCallButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fullScreenButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullScreenLocalVideo: {
    position: 'absolute',
    top: 50,
    right: 16,
    width: 80,
    height: 106,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'white',
    zIndex: 10,
  },
  exitFullScreenButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  header_1: {
    color: COLORS.txt_primary,
    fontSize: 22,
    fontWeight: '700',
  },
});
