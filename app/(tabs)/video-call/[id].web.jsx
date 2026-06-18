import { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { info } from '../../../components/PlatformAlert';
import { COLORS } from '../../../constants/colors';
import createApiInstance from '../../../src/services/api';

const EXPO_PUBLIC_SIGNALING_SERVER = process.env.EXPO_PUBLIC_SIGNALING_SERVER;

export default function VideoCall() {
  const identityApi = createApiInstance();
  const { id: appointmentId } = useLocalSearchParams();
  const router = useRouter();

  const myId = `practitioner-${appointmentId}`;
  const remoteId = `patient-${appointmentId}`;

  const [connected, setConnected] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [localVideoPosition, setLocalVideoPosition] = useState({
    top: 20,
    left: 20,
    right: 'auto',
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [remoteVideoPlaying, setRemoteVideoPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [debugInfo, setDebugInfo] = useState({
    hasRelay: false,
    hasSrflx: false,
    hasHost: false,
    lastDisconnect: null,
  });
  const [debugLogs, setDebugLogs] = useState([]);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const reconnectAttempts = useRef(0);

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
      return;
    }
    router.back();
  };

  const addDebugLog = (msg) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs((prev) => [...prev.slice(-15), `[${timestamp}] ${msg}`]);
  };

  const ws = useRef(null);
  const pc = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStream = useRef(null);
  const remoteIdRef = useRef('');
  const pendingIceCandidates = useRef([]);
  const ringtoneAudio = useRef(null);
  const cachedIceServers = useRef(null);

  useEffect(() => {
    if (!connected) return;
    const fetch = async () => {
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
    fetch();
  }, [connected]);

  useEffect(() => {
    try {
      ringtoneAudio.current = new Audio(require('../../../assets/ringtone.mp3'));
      ringtoneAudio.current.loop = true;
      ringtoneAudio.current.volume = 0.5;
    } catch {
      ringtoneAudio.current = null;
    }
  }, []);

  const startRingtone = () => {
    if (ringtoneAudio.current) {
      ringtoneAudio.current.play().catch(() => {});
    }
  };

  const stopRingtone = () => {
    if (ringtoneAudio.current) {
      ringtoneAudio.current.pause();
      ringtoneAudio.current.currentTime = 0;
    }
  };

  useEffect(() => {
    const connectWebSocket = () => {
      ws.current = new WebSocket(EXPO_PUBLIC_SIGNALING_SERVER);

      ws.current.onopen = () => {
        ws.current?.send(JSON.stringify({ type: 'register', id: myId }));
        setConnected(true);
        addDebugLog('✅ Signaling server connected');
      };

      ws.current.onclose = (event) => {
        setConnected(false);
        setIsReady(false);
        const msg =
          event.code != null || event.reason
            ? `Signaling server closed (code: ${event.code}, reason: ${event.reason || 'none'})`
            : 'Signaling server disconnected';
        addDebugLog(`⚠️ ${msg}`);
      };

      ws.current.onerror = (event) => {
        setConnected(false);
        setIsReady(false);
        const errMsg =
          event?.message ??
          event?.error?.message ??
          'Signaling server error (see close reason in next log)';
        addDebugLog(`❌ ${errMsg}`);
      };

      ws.current.onmessage = async (event) => {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'registered':
            break;
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
            if (inCall) {
              endCall();
              info('Call Ended', 'Call ended by remote user');
            } else {
              info('Call Cancelled', 'The caller ended the call');
            }
            break;
        }
      };
    };

    connectWebSocket();

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        (!ws.current || ws.current.readyState !== WebSocket.OPEN)
      ) {
        connectWebSocket();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      localStream.current?.getTracks().forEach((track) => track.stop());
      pc.current?.close();
      ws.current?.close();
      pendingIceCandidates.current = [];
    };
  }, []);

  useEffect(() => {
    if (incomingCall && isReady) {
      startRingtone();
    } else {
      stopRingtone();
    }
  }, [incomingCall, isReady]);

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
      (s) => s.urls && (String(s.urls).includes('turn:') || (Array.isArray(s.urls) && s.urls.some((u) => String(u).includes('turn:')))),
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

      if (state === 'disconnected' && reconnectAttempts.current < 3 && inCall) {
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
        const timestamp = new Date().toLocaleTimeString();
        setDebugInfo((prev) => ({
          ...prev,
          lastDisconnect: `${timestamp} - ${state}`,
        }));
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
        if (type === 'relay') {
          setDebugInfo((prev) => ({ ...prev, hasRelay: true }));
          addDebugLog('📤 ICE: relay (TURN working!)');
        } else if (type === 'srflx') {
          setDebugInfo((prev) => ({ ...prev, hasSrflx: true }));
          addDebugLog('📤 ICE: srflx (STUN working)');
        } else if (type === 'host') {
          setDebugInfo((prev) => ({ ...prev, hasHost: true }));
          addDebugLog('📤 ICE: host (direct)');
        }
        ws.current?.send(
          JSON.stringify({
            type: 'ice-candidate',
            to: remoteIdRef.current,
            candidate: event.candidate,
          }),
        );
      } else if (!event.candidate) {
        addDebugLog('✅ ICE gathering complete');
      }
    };

    pc.current.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
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
    const stream = await navigator.mediaDevices.getUserMedia(VIDEO_CONSTRAINTS);
    localStream.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
    const connection = await createPeerConnection();
    stream.getTracks().forEach((track) => connection.addTrack(track, stream));
    return connection;
  };

  const startCall = async () => {
    if (!connected || !isReady) return;
    if (!remoteId) {
      info('Required', 'Please enter remote user ID');
      return;
    }
    remoteIdRef.current = remoteId;
    setRemoteVideoPlaying(false);
    ws.current?.send(
      JSON.stringify({
        type: 'call-request',
        to: remoteId,
      }),
    );
    setInCall(true);
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

  const acceptCall = async () => {
    if (!incomingCall) return;
    stopRingtone();
    remoteIdRef.current = incomingCall;
    setIncomingCall(null);
    setRemoteVideoPlaying(false);
    ws.current?.send(
      JSON.stringify({
        type: 'call-accepted',
        to: incomingCall,
      }),
    );
    setInCall(true);
  };

  const rejectCall = () => {
    if (!incomingCall) return;
    stopRingtone();
    ws.current?.send(
      JSON.stringify({
        type: 'call-rejected',
        to: incomingCall,
      }),
    );
    setIncomingCall(null);
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
        JSON.stringify({
          type: 'end-call',
          to: remoteIdRef.current,
        }),
      );
    }
    localStream.current?.getTracks().forEach((track) => track.stop());
    pc.current?.close();
    pc.current = null;
    localStream.current = null;
    remoteIdRef.current = '';
    pendingIceCandidates.current = [];
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setInCall(false);
    setRemoteVideoPlaying(false);
    setConnectionStatus('disconnected');
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    const rect = e.target.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const containerRect = e.currentTarget.getBoundingClientRect();
    const newLeft = e.clientX - containerRect.left - dragOffset.x;
    const newTop = e.clientY - containerRect.top - dragOffset.y;
    const maxLeft = containerRect.width - 64;
    const maxTop = containerRect.height - 86;
    setLocalVideoPosition({
      top: Math.max(20, Math.min(newTop, maxTop)),
      left: Math.max(20, Math.min(newLeft, maxLeft)),
      right: 'auto',
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
          onPress={handleBack}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.txt_primary} />
          <Text style={styles.header_1}>Video Call</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statusBar}>
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

      <div
        className="video-container-web"
        style={{
          ...styles.videoContainer,
          ...(isFullScreen && {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            margin: 0,
            borderRadius: 0,
            zIndex: 9999,
          }),
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            backgroundColor: '#000',
          }}
        />

        {inCall && !remoteVideoPlaying && (
          <div style={styles.connectingOverlay}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.connectingText}>Connecting...</Text>
          </div>
        )}

        <div
          onMouseDown={handleMouseDown}
          style={{
            position: 'absolute',
            width: 64,
            height: 86,
            top: localVideoPosition.top,
            left: localVideoPosition.left ?? 20,
            borderRadius: 8,
            overflow: 'hidden',
            border: '2px solid white',
            boxShadow: '0 4px 8px rgba(0,0,0,0.5)',
            zIndex: 10,
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
          }}
        >
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            style={styles.localVideoInner}
          />
        </div>

        {inCall && !isFullScreen && (
          <TouchableOpacity
            style={styles.fullScreenButton}
            onPress={() => setIsFullScreen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="expand" size={24} color="#fff" />
          </TouchableOpacity>
        )}
        {inCall && isFullScreen && (
          <TouchableOpacity
            style={styles.exitFullScreenButton}
            onPress={() => setIsFullScreen(false)}
            activeOpacity={0.8}
          >
            <Ionicons name="contract" size={28} color="#fff" />
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
          <View style={styles.incomingCallInVideo}>
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
                  <Text style={styles.acceptButtonText}>Accept</Text>
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
          </View>
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
            onPress={() => setIsReady(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.readyToCallButtonText}>📞 Ready for calls</Text>
          </TouchableOpacity>
        )}
      </div>

      <View style={styles.debugSection}>
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
            <div style={styles.debugLogsBox}>
              {debugLogs.map((log, i) => (
                <Text key={i} style={styles.debugLogText}>
                  {log}
                </Text>
              ))}
            </div>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  header_1: {
    color: COLORS.txt_primary,
    fontSize: 22,
    fontWeight: '700',
  },
  statusBar: { marginBottom: 10, gap: 8 },
  connectionIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  connectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ccc',
  },
  dotGreen: { backgroundColor: '#4CAF50' },
  dotYellow: { backgroundColor: '#FFC107' },
  dotRed: { backgroundColor: '#F44336' },
  connectionText: { fontSize: 12, fontWeight: '500' },
  videoContainer: {
    flex: 1,
    minHeight: 320,
    position: 'relative',
    backgroundColor: '#000',
    margin: 5,
    marginBottom: 80,
    borderRadius: 16,
    overflow: 'hidden',
  },
  connectingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectingText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 10,
  },
  localVideoWrap: {
    position: 'absolute',
    width: 64,
    height: 86,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'white',
    zIndex: 10,
    cursor: 'grab',
    userSelect: 'none',
  },
  localVideoInner: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
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
  startCallIconButtonDisabled: { opacity: 0.6 },
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
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  incomingRejectButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  debugSection: { marginTop: 8 },
  smallText: { fontSize: 12, color: '#666' },
  tinyText: { fontSize: 10, color: '#666' },
  debugToggle: { marginTop: 8 },
  debugToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    cursor: 'pointer',
  },
  debugPanel: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  debugText: { fontSize: 11, fontFamily: 'monospace', color: '#333' },
  debugLogsBox: {
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
});
