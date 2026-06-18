import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector, useAppDispatch } from '../../../src/store/hooks';
import {
  acceptChatAppointment,
  rejectChatAppointment,
  completeChatAppointment,
  fetchAppointments,
} from '../../../src/store/slices/appointmentSlice';
import { MainStyles } from '../../../assets/styles/main.styles';
import { COLORS } from '../../../constants/colors';
import { useToast } from '../../../src/context/ToastContext';

const AppointmentDetail = () => {
  const { showToast } = useToast();
  const { id: idParam } = useLocalSearchParams();
  const id =
    typeof idParam === 'string'
      ? idParam
      : ((Array.isArray(idParam) ? idParam?.[0] : '') ?? '');
  const router = useRouter();
  const dispatch = useAppDispatch();
  // @ts-ignore
  const { appointments } = useAppSelector((state) => state.appointment);

  const [processingAction, setProcessingAction] = useState(null);

  const appointment = appointments.find(
    // @ts-ignore
    (a) => (a.appointmentId || a.id) === id,
  );

  const chat = appointment?.chat;

  const resolvedAppointmentId = appointment?.appointmentId || appointment?.id;
  const chatId = chat?.id;
  // @ts-ignore
  const statusNorm = (s) =>
    String(s || '')
      .toLowerCase()
      .replace(/\s/g, '_');
  const isCompleted = statusNorm(appointment?.status) === 'completed';
  const disabledStyle = isCompleted ? { opacity: 0.5 } : null;

  // @ts-ignore
  const getStatusColor = (status) => {
    const s = statusNorm(status);
    switch (s) {
      case 'booked':
        return COLORS.warning;
      case 'confirmed':
        return COLORS.access;
      case 'in_progress':
        return COLORS.logo;
      case 'payment_pending':
        return COLORS.primary_dark;
      case 'completed':
        return COLORS.blue;
      case 'cancelled':
        return COLORS.error;
      default:
        return COLORS.primary_dark;
    }
  };

  // @ts-ignore
  const getStatusIcon = (status) => {
    const s = statusNorm(status);
    switch (s) {
      case 'booked':
        return 'time';
      case 'confirmed':
        return 'checkmark-circle';
      case 'in_progress':
        return 'pulse';
      case 'payment_pending':
        return 'hourglass';
      case 'completed':
        return 'checkmark-done-circle';
      case 'cancelled':
        return 'close-circle';
      default:
        return 'ellipse';
    }
  };

  if (!appointment) {
    return (
      <View
        style={[
          MainStyles.Primary_screen_container,
          { justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <Ionicons
          name="information-circle-outline"
          size={40}
          color={COLORS.txt_secondary}
        />
        <Text
          style={[
            MainStyles.header_2,
            { color: COLORS.txt_secondary, marginTop: 12, textAlign: 'center' },
          ]}
        >
          Appointment not found
        </Text>
        <Text
          style={[
            MainStyles.paragraph_text,
            { color: COLORS.txt_secondary, marginTop: 6, textAlign: 'center' },
          ]}
        >
          Open details from the appointments list after loading.
        </Text>
      </View>
    );
  }

  const start = new Date(appointment.scheduledTime || appointment.date);
  const dateStr = start.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const timeStr = `${appointment.startTime || ''}${appointment.endTime ? ` - ${appointment.endTime}` : ''}`;

  const status = statusNorm(appointment?.status);
  const isBooked = status === 'booked';
  const isConfirmed = status === 'confirmed';
  const isCompletedStatus = status === 'completed';
  const isCancelled = status === 'cancelled';
  const showAcceptReject = isBooked;
  const showCompletedOnly = isConfirmed;
  const showNoActions = isCompletedStatus || isCancelled;

  const handleAccept = async () => {
    try {
      // @ts-ignore
      setProcessingAction('accept');
      // @ts-ignore
      await dispatch(acceptChatAppointment(resolvedAppointmentId)).unwrap();
      // @ts-ignore
      await dispatch(fetchAppointments()).unwrap();
      // @ts-ignore
      showToast({
        type: 'success',
        text1: 'Success',
        text2: 'Appointment accepted',
      });
    } catch (e) {
      showToast({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to accept appointment, already accepted or rejected',
      });
    } finally {
      setProcessingAction(null);
    }
  };

  const handleReject = async () => {
    try {
      // @ts-ignore
      setProcessingAction('reject');
      // @ts-ignore
      await dispatch(rejectChatAppointment(resolvedAppointmentId)).unwrap();
      // @ts-ignore
      await dispatch(fetchAppointments()).unwrap();
      showToast({
        type: 'success',
        text1: 'Success',
        text2: 'Appointment declined',
      });
    } catch (e) {
      showToast({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to reject appointment, already accepted or rejected',
      });
    } finally {
      setProcessingAction(null);
    }
  };

  const handleComplete = async () => {
    try {
      // @ts-ignore
      setProcessingAction('complete');
      // @ts-ignore
      await dispatch(completeChatAppointment(resolvedAppointmentId)).unwrap();
      // @ts-ignore
      await dispatch(fetchAppointments()).unwrap();
      showToast({
        type: 'success',
        text1: 'Success',
        text2: 'Appointment completed',
      });
    } catch (e) {
      showToast({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to complete appointment',
      });
    } finally {
      setProcessingAction(null);
    }
  };

  return (
    <View style={MainStyles.Primary_screen_container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/appointments')}>
          <Ionicons name="arrow-back" size={24} color={COLORS.txt_primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, disabledStyle]}>
          Chat Appointment
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.statusRow}>
        <Ionicons
          name={getStatusIcon(appointment.status)}
          size={18}
          color={getStatusColor(appointment.status)}
        />
        <Text style={styles.statusLabel}>Status:</Text>
        <Text
          style={[
            styles.statusValue,
            { color: getStatusColor(appointment.status) },
          ]}
        >
          {(appointment.status || '-').charAt(0).toUpperCase() +
            (appointment.status || '')
              .slice(1)
              .toLowerCase()
              .replace(/_/g, ' ')}
        </Text>
      </View>

      <ScrollView
        style={MainStyles.Secondary_screen_container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        <View style={styles.section}>
          <View style={styles.patientRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {(appointment.patient?.firstName || 'P').charAt(0)}
              </Text>
            </View>
            <View style={styles.patientInfo}>
              <Text style={styles.patientName}>
                {appointment.patient?.firstName || appointment.patient?.lastName
                  ? `${appointment.patient?.firstName ?? ''} ${appointment.patient?.lastName ?? ''}`.trim()
                  : 'Patient'}
              </Text>
              {(appointment.patient?.timezone ||
                appointment.patient?.gender ||
                appointment.patient?.dateOfBirth) && (
                <View style={styles.patientMeta}>
                  {appointment.patient?.timezone && (
                    <View style={styles.metaRow}>
                      <Ionicons
                        name="globe-outline"
                        size={14}
                        color={COLORS.txt_secondary}
                      />
                      <Text style={styles.metaText}>
                        {appointment.patient.timezone}
                      </Text>
                    </View>
                  )}
                  {appointment.patient?.gender && (
                    <View style={styles.metaRow}>
                      <Ionicons
                        name="male-female-outline"
                        size={14}
                        color={COLORS.txt_secondary}
                      />
                      <Text style={styles.metaText}>
                        {String(appointment.patient.gender)
                          .charAt(0)
                          .toUpperCase() +
                          String(appointment.patient.gender)
                            .slice(1)
                            .toLowerCase()}
                      </Text>
                    </View>
                  )}
                  {appointment.patient?.dateOfBirth && (
                    <View style={styles.metaRow}>
                      <Ionicons
                        name="calendar-outline"
                        size={14}
                        color={COLORS.txt_secondary}
                      />
                      <Text style={styles.metaText}>
                        DOB:{' '}
                        {new Date(
                          appointment.patient.dateOfBirth,
                        ).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.sectionCompact}>
          <Text style={styles.sectionTitleSmall}>Appointment</Text>
          <Text style={styles.summaryLine}>
            {dateStr} · {timeStr}
          </Text>
          <Text style={styles.summaryLineSecondary}>
            {appointment.appointmentType || '-'}
            {appointment.appointmentMode
              ? ` · ${appointment.appointmentMode}`
              : ''}
          </Text>
        </View>

        {!!appointment.additionalDetails && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>
              {appointment.additionalDetails}
            </Text>
          </View>
        )}

        <View style={styles.actionsContainer}>
          {showAcceptReject && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[MainStyles.button, styles.actionBtn]}
                disabled={processingAction === 'accept'}
                onPress={handleAccept}
              >
                <Text style={MainStyles.button_text}>
                  {processingAction === 'accept' ? 'Accepting...' : 'Accept'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[MainStyles.button_secondary, styles.actionBtn]}
                disabled={processingAction === 'reject'}
                onPress={handleReject}
              >
                <Text style={MainStyles.button_secondary_text}>
                  {processingAction === 'reject' ? 'Rejecting...' : 'Reject'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[MainStyles.button, styles.actionBtn]}
                onPress={() => router.push(`/chat/${chatId}`)}
              >
                <Text style={MainStyles.button_text}>Open Chat</Text>
              </TouchableOpacity>
            </View>
          )}
          {showCompletedOnly && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[MainStyles.button, styles.actionBtn]}
                disabled={processingAction === 'complete'}
                onPress={handleComplete}
              >
                <Text style={MainStyles.button_text}>
                  {processingAction === 'complete'
                    ? 'Completing...'
                    : 'Completed'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[MainStyles.button, styles.actionBtn]}
                onPress={() => router.push(`/chat/${chatId}`)}
              >
                <Text style={MainStyles.button_text}>Open Chat</Text>
              </TouchableOpacity>
            </View>
          )}
          {showNoActions && (
            <>
              <Text style={styles.noActionsText}>
                {isCancelled
                  ? 'This appointment was declined.'
                  : 'This appointment is completed.'}
              </Text>
              {isCompletedStatus && chatId && (
                <TouchableOpacity
                  style={[MainStyles.button, { marginTop: 12 }]}
                  onPress={() => router.push(`/chat/${chatId}`)}
                >
                  <Text style={MainStyles.button_text}>Open Chat</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bg_light,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.txt_primary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 12,
  },
  statusLabel: { fontSize: 14, color: COLORS.txt_secondary },
  statusValue: { fontSize: 14, fontWeight: '700' },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.txt_primary,
    marginBottom: 16,
  },
  patientRow: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.logo,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: { color: COLORS.white, fontSize: 24, fontWeight: '600' },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 18, fontWeight: '700', color: COLORS.txt_primary },
  patientMeta: { marginTop: 8, gap: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: COLORS.txt_secondary },
  sectionCompact: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitleSmall: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.txt_secondary,
    marginBottom: 6,
  },
  summaryLine: { fontSize: 14, color: COLORS.txt_primary, fontWeight: '500' },
  summaryLineSecondary: {
    fontSize: 13,
    color: COLORS.txt_secondary,
    marginTop: 2,
  },
  notesText: { fontSize: 14, color: COLORS.txt_primary, lineHeight: 22 },
  actionsContainer: { marginTop: 16, marginBottom: 30, gap: 10 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1 },
  noActionsText: {
    fontSize: 14,
    color: COLORS.txt_secondary,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default AppointmentDetail;
