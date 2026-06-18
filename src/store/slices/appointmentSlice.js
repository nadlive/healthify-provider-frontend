import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import appointmentService from '../../services/appointmentService';

export const fetchAppointments = createAsyncThunk(
  'appointment/fetchAppointments',
  async (_, { rejectWithValue }) => {
    try {
      const response = await appointmentService.getUserAppointments();
      const transformedAppointments = (response.data || []).map(
        (appointment) => {
          const startDate = appointment.scheduled_time
            ? new Date(appointment.scheduled_time)
            : null;
          const endDate = appointment.end_time
            ? new Date(appointment.end_time)
            : null;
          const formatTime = (date) =>
            date
              ? date.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : null;
          return {
            id: appointment.appointment_id,
            appointmentId: appointment.appointment_id,
            patientId: appointment.patient_id,
            practitionerId: appointment.practitioner_id,
            scheduledTime: appointment.scheduled_time,
            endTimeRaw: appointment.end_time,
            duration: appointment.duration ?? null,
            status: appointment.status,
            consultationLog: appointment.consultationLog,
            appointmentCharge: appointment.appointmentCharge,
            additionalDetails: appointment.additionalDetails,
            appointmentNoteByPatient: appointment.appointmentNoteByPatient,
            createdAt: appointment.created_at,
            updatedAt: appointment.updated_at,
            appointmentType: appointment.appointment_type || null,
            appointmentMode: appointment.appointment_mode || null,
            timeSlotId: appointment.time_slot_id,
            date: appointment.scheduled_time,
            startTime: formatTime(startDate),
            endTime: formatTime(endDate),
            timeSlot: appointment.timeSlot
              ? {
                  timeSlotId: appointment.timeSlot.time_slot_id,
                  providerId: appointment.timeSlot.provider_id,
                  appointmentType: appointment.timeSlot.appointment_type,
                  startTime: appointment.timeSlot.start_time,
                  endTime: appointment.timeSlot.end_time,
                  isBooked: appointment.timeSlot.is_booked,
                }
              : null,
            patient: appointment.patient
              ? {
                  firstName: appointment.patient.firstName,
                  lastName: appointment.patient.lastName,
                  middleName: appointment.patient.middleName,
                  gender: appointment.patient.gender,
                  dateOfBirth: appointment.patient.dateOfBirth,
                  timezone: appointment.patient.timezone,
                  identifier: appointment.patient.identifier,
                  active: appointment.patient.active,
                  fhirId: appointment.patient.fhirId,
                }
              : null,
            chat: appointment.chat,
          };
        },
      );
      return transformedAppointments;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch appointments');
    }
  },
);

export const declineAppointment = createAsyncThunk(
  'appointment/decline',
  async ({ appointmentId, reason }, { rejectWithValue }) => {
    try {
      const response = await appointmentService.declineAppointment(
        appointmentId,
        reason,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to decline appointment');
    }
  },
);

export const updateAppointmentStatus = createAsyncThunk(
  'appointment/update',
  async ({ appointmentId, status }, { rejectWithValue }) => {
    try {
      const response = await appointmentService.updateAppointmentStatus(
        appointmentId,
        status,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update status');
    }
  },
);

export const confirmAppointment = createAsyncThunk(
  'appointment/confirm',
  async ({ appointmentId, reason }, { rejectWithValue }) => {
    try {
      const response = await appointmentService.confirmAppointment(
        appointmentId,
        reason,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to confirm appointment');
    }
  },
);

export const acceptChatAppointment = createAsyncThunk(
  'appointment/acceptChatAppointment',
  async (appointmentId, { rejectWithValue }) => {
    try {
      const response =
        await appointmentService.acceptChatAppointment(appointmentId);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.message || 'Failed to accept chat appointment',
      );
    }
  },
);

export const rejectChatAppointment = createAsyncThunk(
  'appointment/rejectChatAppointment',
  async (appointmentId, { rejectWithValue }) => {
    try {
      const response =
        await appointmentService.rejectChatAppointment(appointmentId);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.message || 'Failed to reject chat appointment',
      );
    }
  },
);

export const completeChatAppointment = createAsyncThunk(
  'appointment/completeChatAppointment',
  async (appointmentId, { rejectWithValue }) => {
    try {
      const response =
        await appointmentService.completeChatAppointment(appointmentId);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.message || 'Failed to complete chat appointment',
      );
    }
  },
);

export const createTimeSlot = createAsyncThunk(
  'appointment/createTimeSlot',
  async ({ startTime, endTime }, { rejectWithValue }) => {
    try {
      const response = await appointmentService.createTimeSlot(
        startTime,
        endTime,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to create time slot');
    }
  },
);

export const deleteTimeSlot = createAsyncThunk(
  'appointment/deleteTimeSlot',
  async (timeSlotId, { rejectWithValue }) => {
    try {
      const response = await appointmentService.deleteTimeSlot(timeSlotId);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error?.message ||
          'Failed to delete time slot (check for existing booking)',
      );
    }
  },
);

export const fetchTimeSlots = createAsyncThunk(
  'appointment/fetchTimeSlots',
  async ({ fromDate, toDate }, { rejectWithValue }) => {
    try {
      const response = await appointmentService.getTimeSlots(fromDate, toDate);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch time slots');
    }
  },
);

const initialState = {
  appointments: [],
  currentAppointment: null,
  timeSlots: [],
  loading: false,
  error: null,
};

const appointmentSlice = createSlice({
  name: 'appointment',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentAppointment: (state, action) => {
      state.currentAppointment = action.payload;
    },
    clearCurrentAppointment: (state) => {
      state.currentAppointment = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAppointments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAppointments.fulfilled, (state, action) => {
        state.loading = false;
        state.appointments = action.payload ?? [];
      })
      .addCase(fetchAppointments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(declineAppointment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(declineAppointment.fulfilled, (state, action) => {
        state.loading = false;
        const payloadId = action.payload?.id ?? action.payload?.appointment_id;
        if (!payloadId || !action.payload) return;
        const index = state.appointments.findIndex(
          (apt) => (apt.id || apt.appointmentId) === payloadId,
        );
        if (index !== -1) {
          state.appointments[index] = {
            ...state.appointments[index],
            ...action.payload,
            id: payloadId,
            appointmentId: payloadId,
          };
        }
        if (
          (state.currentAppointment?.id ||
            state.currentAppointment?.appointmentId) === payloadId
        ) {
          state.currentAppointment = {
            ...state.currentAppointment,
            ...action.payload,
            id: payloadId,
            appointmentId: payloadId,
          };
        }
      })
      .addCase(declineAppointment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(confirmAppointment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(confirmAppointment.fulfilled, (state, action) => {
        state.loading = false;
        const payloadId = action.payload?.id ?? action.payload?.appointment_id;
        if (!payloadId || !action.payload) return;
        const index = state.appointments.findIndex(
          (apt) => (apt.id || apt.appointmentId) === payloadId,
        );
        if (index !== -1) {
          state.appointments[index] = {
            ...state.appointments[index],
            ...action.payload,
            id: payloadId,
            appointmentId: payloadId,
          };
        }
        if (
          (state.currentAppointment?.id ||
            state.currentAppointment?.appointmentId) === payloadId
        ) {
          state.currentAppointment = {
            ...state.currentAppointment,
            ...action.payload,
            id: payloadId,
            appointmentId: payloadId,
          };
        }
      })
      .addCase(confirmAppointment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(acceptChatAppointment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(acceptChatAppointment.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(acceptChatAppointment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(rejectChatAppointment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(rejectChatAppointment.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(rejectChatAppointment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(completeChatAppointment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(completeChatAppointment.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(completeChatAppointment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createTimeSlot.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTimeSlot.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(createTimeSlot.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteTimeSlot.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteTimeSlot.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(deleteTimeSlot.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchTimeSlots.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTimeSlots.fulfilled, (state, action) => {
        state.loading = false;
        state.timeSlots = action.payload || [];
      })
      .addCase(fetchTimeSlots.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateAppointmentStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAppointmentStatus.fulfilled, (state, action) => {
        state.loading = false;
        const payloadId = action.payload?.id ?? action.payload?.appointment_id;
        if (!payloadId || !action.payload) return;
        const index = state.appointments.findIndex(
          (apt) => (apt.id || apt.appointmentId) === payloadId,
        );
        if (index !== -1) {
          state.appointments[index] = {
            ...state.appointments[index],
            ...action.payload,
            id: payloadId,
            appointmentId: payloadId,
          };
        }
        if (
          (state.currentAppointment?.id ||
            state.currentAppointment?.appointmentId) === payloadId
        ) {
          state.currentAppointment = {
            ...state.currentAppointment,
            ...action.payload,
            id: payloadId,
            appointmentId: payloadId,
          };
        }
      })
      .addCase(updateAppointmentStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearCurrentAppointment, setCurrentAppointment } =
  appointmentSlice.actions;
export default appointmentSlice.reducer;
