import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '../../src/store/hooks';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as appointmentActions from '../../src/store/slices/appointmentSlice';
import { COLORS } from '../../constants/colors';
import { MainStyles } from '../../assets/styles/main.styles';
import { confirm } from '../../components/PlatformAlert';

const STATUS_FILTER_OPTIONS = [
  { key: 'booked', label: 'Booked' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'payment_pending', label: 'Payment Pending' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const MODE_FILTER_OPTIONS = [
  { key: 'chat', label: 'Chat' },
  { key: 'video', label: 'Video' },
];

const allFilterKeys = [
  ...MODE_FILTER_OPTIONS.map((o) => o.key),
  ...STATUS_FILTER_OPTIONS.map((o) => o.key),
];

function buildAllChecked() {
  const next = {};
  allFilterKeys.forEach((k) => {
    next[k] = true;
  });
  return next;
}

export default function Appointments() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { appointments, loading, error } = useAppSelector(
    (state) => state.appointment,
  );

  const [refreshing, setRefreshing] = useState(false);
  const [checkedFilters, setCheckedFilters] = useState(buildAllChecked);

  const loadAppointments = useCallback(async () => {
    try {
      await dispatch(appointmentActions.fetchAppointments()).unwrap();
    } catch (err) {
      Alert.alert('Error', 'Failed to load appointments. Please try again.');
    }
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      loadAppointments();
    }, [loadAppointments]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAppointments();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    const s = String(status || '')
      .toLowerCase()
      .replace(/\s/g, '_');
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

  const getStatusMessage = (status) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('booked')) return 'Waiting for your confirmation';
    if (s.includes('confirmed')) return 'Ready to start';
    if (s.includes('progress')) return 'Consultation in progress';
    if (s.includes('payment')) return 'Payment pending';
    if (s.includes('completed')) return 'Completed';
    if (s.includes('cancelled')) return 'Cancelled';
    return '';
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const statusToFilterKey = (status) =>
    String(status || '')
      .toLowerCase()
      .replace(/\s/g, '_')
      .trim();

  const appointmentModeKey = (a) => {
    console.log('a', a);
    const mode = String(a?.appointmentMode).toLowerCase();
    if (mode === 'chat') return 'chat';
    if (mode === 'video') return 'video';
    return mode || 'video';
  };

  const selectAllFilters = () => {
    setCheckedFilters(buildAllChecked());
  };

  const toggleFilter = (key) => {
    setCheckedFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const allFiltersOn = allFilterKeys.every((k) => checkedFilters[k]);

  const statusKeyForFilter = (sk) => (sk === 'in_progress' ? 'confirmed' : sk);

  const filteredAppointments = (appointments || []).filter((a) => {
    const sk = statusToFilterKey(a.status);
    const mk = appointmentModeKey(a);
    const statusOk = checkedFilters[statusKeyForFilter(sk)] === true;
    const modeOk = checkedFilters[mk] === true;
    return statusOk && modeOk;
  });

  const handleAppointmentPress = (appointment) => {
    const id = appointment.appointmentId || appointment.id;

    if (String(appointment.appointmentMode).toLowerCase() === 'chat') {
      router.push(`/appointment/chat/${id}`);
    } else {
      router.push(`/appointment/video/${id}`);
    }
  };

  const handleAccept = (e, appointment) => {
    e?.stopPropagation?.();
    const appointmentId = appointment.appointmentId || appointment.id;
    const mode = String(appointment.appointmentMode).toLowerCase();
    const message =
      mode === 'chat'
        ? 'Accept this chat appointment?'
        : 'Accept this video appointment?';
    confirm(message, async () => {
      try {
        if (mode === 'chat') {
          await dispatch(
            appointmentActions.acceptChatAppointment(appointmentId),
          ).unwrap();
        } else {
          await dispatch(
            appointmentActions.confirmAppointment({
              appointmentId,
              reason: 'Confirmed by provider',
            }),
          ).unwrap();
        }
        await dispatch(appointmentActions.fetchAppointments()).unwrap();
        Alert.alert('Success', 'Appointment accepted.');
      } catch (err) {
        Alert.alert(
          'Error',
          err?.message || 'Failed to accept appointment. Please try again.',
        );
      }
    });
  };

  const handleDecline = (e, appointment) => {
    e?.stopPropagation?.();
    const appointmentId = appointment.appointmentId;
    const mode = String(appointment.appointmentMode).toLowerCase();
    confirm('Are you sure you want to decline this appointment?', async () => {
      try {
        if (mode === 'chat') {
          await dispatch(
            appointmentActions.rejectChatAppointment(appointmentId),
          ).unwrap();
        } else {
          await dispatch(
            appointmentActions.declineAppointment({
              appointmentId: appointmentId,
              reason: 'Declined by provider',
            }),
          ).unwrap();
        }
        // @ts-ignore
        await dispatch(appointmentActions.fetchAppointments()).unwrap();
        Alert.alert('Success', 'Appointment declined.');
      } catch (err) {
        Alert.alert(
          'Error',
          err?.message || 'Failed to decline appointment. Please try again.',
        );
      }
    });
  };

  if (loading && !refreshing && (!appointments || appointments.length === 0)) {
    return (
      <View style={MainStyles.loading_container}>
        <ActivityIndicator size="large" color={COLORS.logo} />
        <Text style={MainStyles.loading_text}>Loading appointments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <Text style={MainStyles.header_1}>Appointments</Text>

      <View style={styles.filterChipsWrap}>
        <TouchableOpacity
          onPress={selectAllFilters}
          style={[
            styles.checkboxChip,
            allFiltersOn && styles.checkboxChipAllActive,
          ]}
          activeOpacity={0.7}
        >
          <Ionicons
            name={allFiltersOn ? 'checkbox' : 'square-outline'}
            size={16}
            color={allFiltersOn ? COLORS.white : COLORS.txt_secondary}
          />
          <Text
            style={[
              styles.checkboxLabel,
              allFiltersOn && styles.checkboxLabelOnDark,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {MODE_FILTER_OPTIONS.map(({ key, label }) => {
          const isChat = key === 'chat';
          const on = checkedFilters[key];
          return (
            <TouchableOpacity
              key={key}
              onPress={() => toggleFilter(key)}
              style={[
                styles.checkboxChip,
                isChat ? styles.modeChipChat : styles.modeChipVideo,
                on &&
                  (isChat
                    ? styles.modeChipChatActive
                    : styles.modeChipVideoActive),
              ]}
              activeOpacity={0.7}
            >
              <Ionicons
                name={on ? 'checkbox' : 'square-outline'}
                size={16}
                color={
                  on
                    ? isChat
                      ? COLORS.access
                      : COLORS.blue
                    : COLORS.txt_secondary
                }
              />
              <Text
                style={[
                  styles.checkboxLabel,
                  on &&
                    (isChat
                      ? styles.modeChipLabelChat
                      : styles.modeChipLabelVideo),
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
        {STATUS_FILTER_OPTIONS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            onPress={() => toggleFilter(key)}
            style={styles.checkboxChip}
            activeOpacity={0.7}
          >
            <Ionicons
              name={checkedFilters[key] ? 'checkbox' : 'square-outline'}
              size={16}
              color={checkedFilters[key] ? COLORS.logo : COLORS.txt_secondary}
            />
            <Text style={styles.checkboxLabel}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.listContainer}>
        {error ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="alert-circle-outline"
              size={48}
              color={COLORS.txt_secondary}
            />
            <Text style={styles.emptyText}>Something went wrong</Text>
            <TouchableOpacity
              onPress={loadAppointments}
              style={[MainStyles.button_secondary, { marginTop: 12 }]}
            >
              <Text style={MainStyles.button_secondary_text}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : filteredAppointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="calendar-outline"
              size={56}
              color={COLORS.txt_secondary}
            />
            <Text style={styles.emptyTitle}>No appointments found</Text>
            <Text style={styles.emptyText}>
              {allFiltersOn && (!appointments || appointments.length === 0)
                ? "You don't have any appointments yet."
                : 'No appointments match the selected filters.'}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.listScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[COLORS.logo]}
              />
            }
          >
            {filteredAppointments.map((appointment) => (
              <TouchableOpacity
                key={appointment.appointmentId || appointment.id}
                style={styles.card}
                onPress={() => handleAppointmentPress(appointment)}
                activeOpacity={0.8}
              >
                <View style={styles.cardTop}>
                  <View style={styles.cardLeft}>
                    <View style={styles.infoRow}>
                      <Ionicons
                        name="calendar-outline"
                        size={16}
                        color={COLORS.txt_primary}
                      />
                      <Text style={styles.infoText}>
                        {formatDate(
                          appointment.scheduledTime || appointment.date,
                        )}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Ionicons
                        name="time-outline"
                        size={16}
                        color={COLORS.txt_primary}
                      />
                      <Text style={styles.infoText}>
                        {`${appointment.startTime || ''}${
                          appointment.endTime ? ` - ${appointment.endTime}` : ''
                        }`}
                      </Text>
                    </View>
                    <View style={[styles.infoRow, { marginTop: 6 }]}>
                      <Ionicons
                        name="person-circle-outline"
                        size={16}
                        color={COLORS.txt_secondary}
                      />
                      <Text style={styles.infoTextSecondary} numberOfLines={1}>
                        {appointment.patient?.firstName ||
                        appointment.patient?.lastName
                          ? `${appointment.patient?.firstName ?? ''} ${
                              appointment.patient?.lastName ?? ''
                            }`.trim()
                          : 'Patient'}
                      </Text>
                    </View>
                    {(appointment.patient?.timezone ||
                      appointment.patient?.gender ||
                      appointment.patient?.dateOfBirth) && (
                      <View style={styles.patientMeta}>
                        {appointment.patient?.timezone ? (
                          <View style={styles.infoRow}>
                            <Ionicons
                              name="globe-outline"
                              size={14}
                              color={COLORS.txt_secondary}
                            />
                            <Text style={styles.metaText}>
                              {appointment.patient.timezone}
                            </Text>
                          </View>
                        ) : null}
                        {appointment.patient?.gender ? (
                          <View style={styles.infoRow}>
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
                        ) : null}
                        {appointment.patient?.dateOfBirth ? (
                          <View style={styles.infoRow}>
                            <Ionicons
                              name="calendar-outline"
                              size={14}
                              color={COLORS.txt_secondary}
                            />
                            <Text style={styles.metaText}>
                              DOB: {formatDate(appointment.patient.dateOfBirth)}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    )}
                  </View>
                  <View style={styles.statusWrap}>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: getStatusColor(appointment.status),
                        },
                      ]}
                    >
                      <Text style={styles.statusText}>
                        {(appointment.status || '')
                          .replace(/_/g, ' ')
                          .replace(/\b\w/g, (c) => c.toUpperCase())}
                      </Text>
                    </View>
                    <Text style={styles.statusMessage}>
                      {getStatusMessage(appointment.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.chips}>
                  {appointment.appointmentType ? (
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>
                        {appointment.appointmentType}
                      </Text>
                    </View>
                  ) : null}
                  {/* <Text style={styles.chipText}>
                        {appointment.appointmentNoteByPatient}
                      </Text> */}

                  {appointment.appointmentMode ? (
                    <View style={styles.chip}>
                      <Ionicons
                        name={
                          String(appointment.appointmentMode).toLowerCase() ===
                          'video'
                            ? 'videocam-outline'
                            : 'people-outline'
                        }
                        size={12}
                        color={COLORS.txt_secondary}
                      />
                      <Text style={styles.chipText}>
                        {appointment.appointmentMode}
                      </Text>
                    </View>
                  ) : null}
                  {appointment.appointmentCharge != null &&
                  appointment.appointmentCharge !== undefined ? (
                    <View style={styles.chip}>
                      <Ionicons
                        name="cash-outline"
                        size={12}
                        color={COLORS.txt_secondary}
                      />
                      <Text style={styles.chipText}>
                        {appointment.appointmentCharge === '0.00'
                          ? 'Free'
                          : `LKR ${appointment.appointmentCharge}`}
                      </Text>
                    </View>
                  ) : null}
                  {appointment.appointmentNoteByPatient ? (
                    <View style={styles.chip}>
                      <Ionicons
                        name="document-text-outline"
                        size={12}
                        color={COLORS.txt_secondary}
                      />
                      <Text style={styles.chipText}>
                        note by patient:
                        {appointment.appointmentNoteByPatient}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {appointment.additionalDetails ? (
                  <Text style={styles.detailsText} numberOfLines={2}>
                    {appointment.additionalDetails}
                  </Text>
                ) : null}
                {String(appointment.status || '').toLowerCase() ===
                  'booked' && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnAccept]}
                      onPress={(e) => handleAccept(e, appointment)}
                    >
                      <Text style={styles.actionBtnText}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnDecline]}
                      onPress={(e) => handleDecline(e, appointment)}
                    >
                      <Text style={styles.actionBtnText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    paddingTop: 6,
    paddingHorizontal: 14,
    paddingBottom: 12,
    backgroundColor: COLORS.bg_light,
  },
  filterChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    alignItems: 'center',
  },
  checkboxChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 32,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.bg_dark,
    justifyContent: 'center',
  },
  checkboxChipAllActive: {
    backgroundColor: COLORS.primary_dark,
    borderColor: COLORS.primary_dark,
  },
  modeChipChat: {
    borderColor: '#B8E0B8',
    backgroundColor: '#F4FBF4',
  },
  modeChipChatActive: {
    backgroundColor: '#DCF5DC',
    borderColor: COLORS.access,
  },
  modeChipVideo: {
    borderColor: '#B3D4FF',
    backgroundColor: '#F4F8FF',
  },
  modeChipVideoActive: {
    backgroundColor: '#D6EBFF',
    borderColor: COLORS.blue,
  },
  modeChipLabelChat: {
    color: COLORS.access,
  },
  modeChipLabelVideo: {
    color: COLORS.blue,
  },
  checkboxLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.txt_primary,
  },
  checkboxLabelOnDark: {
    color: COLORS.white,
  },
  listContainer: {
    flex: 1,
    marginTop: 10,
    minHeight: 0,
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 12,
    flexGrow: 1,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: COLORS.bg_dark,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardLeft: {
    flex: 1,
    paddingRight: 12,
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.txt_primary,
    fontWeight: '500',
  },
  infoTextSecondary: {
    fontSize: 14,
    color: COLORS.txt_secondary,
  },
  patientMeta: {
    marginTop: 8,
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.txt_secondary,
  },
  statusWrap: {
    alignItems: 'flex-end',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  statusMessage: {
    fontSize: 11,
    color: COLORS.txt_secondary,
    marginTop: 4,
    textAlign: 'right',
    maxWidth: 100,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: COLORS.bg_dark,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.txt_secondary,
  },
  detailsText: {
    fontSize: 13,
    color: COLORS.txt_secondary,
    marginTop: 10,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnAccept: {
    backgroundColor: COLORS.access,
  },
  actionBtnDecline: {
    backgroundColor: COLORS.error,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.txt_primary,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.txt_secondary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
