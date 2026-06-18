import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Linking,
  StyleSheet,
  Modal,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector, useAppDispatch } from '../../../src/store/hooks';
import * as appointmentActions from '../../../src/store/slices/appointmentSlice';
import {
  downloadPatientFile,
  fetchAppointmentFiles,
  uploadProviderFile,
} from '../../../src/store/slices/providerUploadFileSlice';
import { writePrescription } from '../../../src/store/slices/prescriptionWritingSlice';
import { MainStyles } from '../../../assets/styles/main.styles';
import { COLORS } from '../../../constants/colors';
import { confirm, info } from '../../../components/PlatformAlert';
import * as DocumentPicker from 'expo-document-picker';
import { MaskedTextInput } from 'react-native-advanced-input-mask';
import { parse, format, isValid } from 'date-fns';
import { useSelector } from 'react-redux';

const AppointmentDetail = () => {
  const { id: idParam } = useLocalSearchParams();
  const id =
    typeof idParam === 'string'
      ? idParam
      : ((Array.isArray(idParam) ? idParam?.[0] : '') ?? '');
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { appointments } = useAppSelector((state) => state.appointment);
  const { user } = useSelector((state) => state.auth);
  const { appointmentFiles, loading: filesLoading } = useSelector(
    (state) => state.providerUpload,
  );

  const [processingAction, setProcessingAction] = useState(null);
  const [reportDrawerVisible, setReportDrawerVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [comment, setComment] = useState('');
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [prescriptionDrawerVisible, setPrescriptionDrawerVisible] =
    useState(false);
  const [diagnosis, setDiagnosis] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [notes, setNotes] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [documentsDrawerVisible, setDocumentsDrawerVisible] = useState(false);
  const [items, setItems] = useState([
    {
      medication_name: '',
      dosage_form: '',
      strength: '',
      dosage_instructions: '',
      frequency: '',
      duration: '',
      quantity: 1,
      special_instructions: '',
    },
  ]);

  const appointment = useMemo(
    () => appointments.find((a) => (a.appointmentId || a.id) === id),
    [appointments, id],
  );

  const resolvedAppointmentId = appointment?.appointmentId || appointment?.id;
  const statusNorm = (s) =>
    String(s || '')
      .toLowerCase()
      .replace(/\s/g, '_');
  const isCompleted = statusNorm(appointment?.status) === 'completed';
  const isBooked = statusNorm(appointment?.status) === 'booked';
  const disabledStyle = isCompleted ? { opacity: 0.5 } : null;

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

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        medication_name: '',
        generic_name: '',
        dosage_form: '',
        strength: '',
        dosage_instructions: '',
        frequency: '',
        duration: '',
        quantity: 1,
        special_instructions: '',
      },
    ]);
  };

  useEffect(() => {
    if (documentsDrawerVisible && resolvedAppointmentId) {
      dispatch(fetchAppointmentFiles(resolvedAppointmentId));
    }
  }, [documentsDrawerVisible, resolvedAppointmentId, dispatch]);

  const updateItem = (index, key, value) => {
    const updated = [...items];
    updated[index][key] = value;
    setItems(updated);
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDownloadDocument = async (fileId) => {
    try {
      const url = await dispatch(downloadPatientFile(fileId)).unwrap();
      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.download = '';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        await Linking.openURL(url);
      }
    } catch (error) {
      info('Error', `Failed to download file: ${error?.message || 'Unknown'}`);
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

  const handleConfirm = () => {
    confirm('Are you sure you want to confirm this appointment?', async () => {
      try {
        setProcessingAction('confirm');
        await dispatch(
          appointmentActions.confirmAppointment({
            appointmentId: resolvedAppointmentId,
            reason: 'Confirmed by provider',
          }),
        ).unwrap();
        await dispatch(appointmentActions.fetchAppointments()).unwrap();
        info('Success', 'Appointment confirmed');
      } catch (e) {
        info('Error', 'Failed to confirm appointment');
      } finally {
        setProcessingAction(null);
      }
    });
  };

  const handleUpdate = (status) => {
    confirm(
      'Are you sure you want to update this appointment to complete?',
      async () => {
        try {
          setProcessingAction('Completed');
          await dispatch(
            appointmentActions.updateAppointmentStatus({
              appointmentId: resolvedAppointmentId,
              status,
            }),
          ).unwrap();
          await dispatch(appointmentActions.fetchAppointments()).unwrap();
          info('Success', 'Appointment completed');
        } catch (e) {
          info('Error', 'Failed to complete appointment');
        } finally {
          setProcessingAction(null);
        }
      },
    );
  };

  const handleDecline = (reason = 'Cancelled by provider') => {
    confirm('Are you sure you want to cancel this appointment?', async () => {
      try {
        setProcessingAction('cancel');
        await dispatch(
          appointmentActions.declineAppointment({
            appointmentId: resolvedAppointmentId,
            reason,
          }),
        ).unwrap();
        await dispatch(appointmentActions.fetchAppointments()).unwrap();
        info('Cancelled', 'Appointment cancelled');
      } catch (e) {
        info('Error', 'Failed to cancel appointment');
      } finally {
        setProcessingAction(null);
      }
    });
  };

  const handlePickReport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setSelectedFile({
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType || 'application/octet-stream',
        size: asset.size,
        file: asset.file,
      });
    } catch (error) {
      info('Error', 'Failed to pick document');
    }
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile || !user?.id) return;
    try {
      setUploadingDocument(true);
      await dispatch(
        uploadProviderFile({
          appointment_id: resolvedAppointmentId,
          practitioner_id: user.id,
          file: selectedFile,
          comment,
        }),
      ).unwrap();
      info('Success', 'Document uploaded successfully');
      setSelectedFile(null);
      setComment('');
      setReportDrawerVisible(false);
    } catch (error) {
      info('Error', error || 'Failed to upload document');
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleUploadPrescription = async () => {
    try {
      const parseValidUntil = () => {
        if (!validUntil || validUntil.replace(/\D/g, '').length < 8)
          return null;
        try {
          const d = parse(validUntil, 'dd/MM/yyyy', new Date());
          return isValid(d) ? format(d, 'yyyy-MM-dd') : null;
        } catch {
          return null;
        }
      };
      const payload = {
        appointment_id: resolvedAppointmentId,
        patient_id: appointment.patientId || appointment.patient?.id,
        provider_id: user?.id,
        diagnosis,
        symptoms,
        notes,
        valid_until: parseValidUntil(),
        items: items.map((item) => ({
          medication_name: item.medication_name,
          dosage: item.dosage_instructions,
          frequency: item.frequency,
          duration: item.duration,
          instructions: item.special_instructions,
          quantity: item.quantity || 1,
        })),
      };
      await dispatch(writePrescription(payload)).unwrap();
      info('Success', 'Prescription created successfully');
      setPrescriptionDrawerVisible(false);
      setDiagnosis('');
      setSymptoms('');
      setNotes('');
      setValidUntil('');
      setItems([
        {
          medication_name: '',
          dosage_form: '',
          strength: '',
          dosage_instructions: '',
          frequency: '',
          duration: '',
          quantity: 1,
          special_instructions: '',
        },
      ]);
    } catch (err) {
      info('Error', err || 'Failed to write prescription');
    }
  };

  const renderFileItem = ({ item }) => (
    <TouchableOpacity
      style={styles.documentCard}
      onPress={() => handleDownloadDocument(item.id)}
      activeOpacity={0.7}
    >
      <View
        style={[styles.documentIcon, { backgroundColor: COLORS.logo + '15' }]}
      >
        <Ionicons name="document-text-outline" size={24} color={COLORS.logo} />
      </View>
      <View style={styles.documentInfo}>
        <Text style={styles.documentName}>
          {item.original_name || item.file_name}
        </Text>
        <Text style={styles.documentMeta}>
          {item.comment || 'No description'}
        </Text>
      </View>
      <Ionicons name="download-outline" size={22} color={COLORS.logo} />
    </TouchableOpacity>
  );

  return (
    <View style={MainStyles.Primary_screen_container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/appointments')}>
          <Ionicons name="arrow-back" size={24} color={COLORS.txt_primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, disabledStyle]}>
          Appointment Details
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
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[MainStyles.button, styles.actionBtn, disabledStyle]}
              onPress={() => router.push(`/(tabs)/video-call/${id}`)}
              disabled={isCompleted}
            >
              <Text style={MainStyles.button_text}>Call</Text>
            </TouchableOpacity>
          </View>

          {isBooked && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[MainStyles.button, styles.actionBtn, disabledStyle]}
                disabled={isCompleted || processingAction === 'confirm'}
                onPress={handleConfirm}
              >
                <Text style={MainStyles.button_text}>
                  {processingAction === 'confirm' ? 'Confirming...' : 'Accept'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  MainStyles.button_secondary,
                  styles.actionBtn,
                  disabledStyle,
                ]}
                disabled={isCompleted || processingAction === 'cancel'}
                onPress={() => handleDecline('Declined by provider')}
              >
                <Text style={MainStyles.button_secondary_text}>
                  {processingAction === 'cancel' ? 'Cancelling...' : 'Decline'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[MainStyles.button, styles.actionBtn]}
              onPress={() => {
                dispatch(fetchAppointmentFiles(resolvedAppointmentId));
                setDocumentsDrawerVisible(true);
              }}
            >
              <Text style={MainStyles.button_text}>View Documents</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[MainStyles.button, styles.actionBtn, disabledStyle]}
              onPress={() => setReportDrawerVisible(true)}
              disabled={isCompleted}
            >
              <Text style={MainStyles.button_text}>Upload Report</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                MainStyles.button,
                styles.actionBtn,
                !isCompleted ? { opacity: 0.5 } : null,
              ]}
              // disabled={!isCompleted}
              onPress={() => setPrescriptionDrawerVisible(true)}
            >
              <Text style={MainStyles.button_text}>Write Prescription</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[MainStyles.button, styles.actionBtn, disabledStyle]}
              disabled={isCompleted || processingAction === 'Completed'}
              onPress={() => handleUpdate('Completed')}
            >
              <Text style={MainStyles.button_text}>
                {processingAction === 'Completed'
                  ? 'Completing...'
                  : 'Complete'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                MainStyles.button_secondary,
                styles.actionBtn,
                { opacity: 0.45 },
              ]}
              disabled
            >
              <Text style={MainStyles.button_secondary_text}>Reschedule</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[MainStyles.button_secondary, disabledStyle]}
            disabled={isCompleted || processingAction === 'cancel'}
            onPress={() => handleDecline()}
          >
            <Text style={MainStyles.button_secondary_text}>
              {processingAction === 'cancel'
                ? 'Cancelling...'
                : 'Cancel Appointment'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Upload Report Modal */}
      <Modal
        visible={reportDrawerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setReportDrawerVisible(false)}
      >
        <View style={MainStyles.drawer_overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={MainStyles.drawer_container}>
              <Text style={MainStyles.drawer_title}>Upload Report</Text>
              <TouchableOpacity
                onPress={handlePickReport}
                style={MainStyles.upload_box}
              >
                <Ionicons
                  name="cloud-upload-outline"
                  size={30}
                  color={COLORS.logo}
                />
                <Text style={MainStyles.upload_text}>Upload a file</Text>
              </TouchableOpacity>
              {selectedFile && (
                <View style={MainStyles.selected_file_container}>
                  <Ionicons name="document-text-outline" size={20} />
                  <Text style={MainStyles.selected_file_text}>
                    {selectedFile.name}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedFile(null)}>
                    <Ionicons name="close-circle" size={20} color="red" />
                  </TouchableOpacity>
                </View>
              )}
              <TextInput
                placeholder="Add comment..."
                value={comment}
                onChangeText={setComment}
                multiline
                style={MainStyles.comment_input}
              />
              <View style={MainStyles.drawer_button_row}>
                <TouchableOpacity
                  style={[MainStyles.button_secondary, { flex: 1 }]}
                  onPress={() => setReportDrawerVisible(false)}
                >
                  <Text style={MainStyles.button_secondary_text}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[MainStyles.button, { flex: 1 }]}
                  disabled={!selectedFile || uploadingDocument}
                  onPress={handleConfirmUpload}
                >
                  <Text style={MainStyles.button_text}>
                    {uploadingDocument ? 'Uploading...' : 'Upload'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Prescription Modal */}
      <Modal
        visible={prescriptionDrawerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPrescriptionDrawerVisible(false)}
      >
        <View style={MainStyles.drawer_overlay}>
          <View style={MainStyles.drawer_container}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ flex: 1 }}
            >
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 30 }}
              >
                <Text style={MainStyles.drawer_title}>Write Prescription</Text>
                <TextInput
                  placeholder="Diagnosis"
                  value={diagnosis}
                  onChangeText={setDiagnosis}
                  style={MainStyles.comment_input}
                />
                <TextInput
                  placeholder="Symptoms"
                  value={symptoms}
                  onChangeText={setSymptoms}
                  style={MainStyles.comment_input}
                />
                <Text style={[MainStyles.header_2, { marginBottom: 5 }]}>
                  Valid Until
                </Text>
                <MaskedTextInput
                  mask="[00]{/}[00]{/}[0000]"
                  value={validUntil}
                  onChangeText={(formatted) => setValidUntil(formatted)}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor={COLORS.txt_secondary}
                  keyboardType="numeric"
                  style={[MainStyles.input, { marginBottom: 15 }]}
                />
                <Text style={[MainStyles.header_2, { marginBottom: 10 }]}>
                  Medications
                </Text>

                {items.map((item, index) => (
                  <View key={index} style={MainStyles.card}>
                    <TextInput
                      placeholder="Medication name *"
                      value={item.medication_name}
                      onChangeText={(v) =>
                        updateItem(index, 'medication_name', v)
                      }
                      style={MainStyles.input}
                    />
                    <TextInput
                      placeholder="Strength (e.g. 500mg)"
                      value={item.strength}
                      onChangeText={(v) => updateItem(index, 'strength', v)}
                      style={MainStyles.input}
                    />
                    <TextInput
                      placeholder="Dosage instructions *"
                      value={item.dosage_instructions}
                      onChangeText={(v) =>
                        updateItem(index, 'dosage_instructions', v)
                      }
                      style={MainStyles.comment_input}
                    />
                    <TextInput
                      placeholder="Frequency"
                      value={item.frequency}
                      onChangeText={(v) => updateItem(index, 'frequency', v)}
                      style={MainStyles.input}
                    />
                    <TextInput
                      placeholder="Duration"
                      value={item.duration}
                      onChangeText={(v) => updateItem(index, 'duration', v)}
                      style={MainStyles.input}
                    />
                    <TextInput
                      placeholder="Quantity"
                      value={
                        item.quantity !== undefined && item.quantity !== null
                          ? String(item.quantity)
                          : ''
                      }
                      onChangeText={(v) =>
                        updateItem(
                          index,
                          'quantity',
                          v === '' ? '' : parseInt(v, 10),
                        )
                      }
                      keyboardType="numeric"
                      style={MainStyles.input}
                    />
                    <TextInput
                      placeholder="Special instructions"
                      value={item.special_instructions}
                      onChangeText={(v) =>
                        updateItem(index, 'special_instructions', v)
                      }
                      style={MainStyles.input}
                    />
                    {items.length > 1 && (
                      <TouchableOpacity
                        onPress={() => removeItem(index)}
                        style={[MainStyles.button_secondary, { marginTop: 10 }]}
                      >
                        <Text style={MainStyles.button_secondary_text}>
                          Remove Medication
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

                <TouchableOpacity
                  onPress={addItem}
                  style={MainStyles.button_secondary}
                >
                  <Text style={MainStyles.button_secondary_text}>
                    + Add Medication
                  </Text>
                </TouchableOpacity>

                <TextInput
                  placeholder="Additional notes"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  style={MainStyles.comment_input}
                />

                <View style={MainStyles.drawer_button_row}>
                  <TouchableOpacity
                    style={[MainStyles.button_secondary, { flex: 1 }]}
                    onPress={() => setPrescriptionDrawerVisible(false)}
                  >
                    <Text style={MainStyles.button_secondary_text}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[MainStyles.button, { flex: 1 }]}
                    onPress={handleUploadPrescription}
                  >
                    <Text style={MainStyles.button_text}>Save</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>

      {/* Documents Modal */}
      <Modal
        visible={documentsDrawerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDocumentsDrawerVisible(false)}
      >
        <View style={MainStyles.drawer_overlay}>
          <View style={MainStyles.drawer_container}>
            <Text style={MainStyles.drawer_title}>Documents</Text>
            {filesLoading ? (
              <Text style={{ textAlign: 'center' }}>Loading...</Text>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[MainStyles.header_2, { marginBottom: 10 }]}>
                  Uploaded by Patient
                </Text>
                {appointmentFiles?.patient_files?.length > 0 ? (
                  appointmentFiles.patient_files.map((file) => (
                    <View key={file.id}>{renderFileItem({ item: file })}</View>
                  ))
                ) : (
                  <Text
                    style={{ color: COLORS.txt_secondary, marginBottom: 20 }}
                  >
                    No documents uploaded by patient
                  </Text>
                )}
                <Text style={[MainStyles.header_2, { marginBottom: 10 }]}>
                  Uploaded by You
                </Text>
                {appointmentFiles?.practitioner_files?.length > 0 ? (
                  appointmentFiles.practitioner_files.map((file) => (
                    <View key={file.id}>{renderFileItem({ item: file })}</View>
                  ))
                ) : (
                  <Text style={{ color: COLORS.txt_secondary }}>
                    No documents uploaded by you
                  </Text>
                )}
              </ScrollView>
            )}
            <TouchableOpacity
              style={[MainStyles.button_secondary, { marginTop: 15 }]}
              onPress={() => setDocumentsDrawerVisible(false)}
            >
              <Text style={MainStyles.button_secondary_text}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.bg_light,
    borderRadius: 8,
    marginBottom: 12,
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  documentInfo: { flex: 1 },
  documentName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.txt_primary,
    marginBottom: 2,
  },
  documentMeta: { fontSize: 11, color: COLORS.txt_secondary },
  actionsContainer: { marginTop: 16, marginBottom: 30, gap: 10 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1 },
});

export default AppointmentDetail;
