import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import providerFileService from '../../services/providerFileService';

export const uploadProviderFile = createAsyncThunk(
  'providerUpload/upload',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await providerFileService.uploadProviderDocument(payload);
      return response;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || 'File upload failed'
      );
    }
  }
);

export const fetchAppointmentFiles = createAsyncThunk(
  'providerUpload/fetchAppointmentFiles',
  async (appointment_id, { rejectWithValue }) => {
    try {
      const response = await providerFileService.getAppointmentFiles(appointment_id);
      const data = response?.data ?? response;
      return { patient_files: data?.patient_files ?? [], practitioner_files: data?.practitioner_files ?? [] };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch appointment files'
      );
    }
  }
);

export const downloadPatientFile = createAsyncThunk(
  'providerUpload/downloadPatientFile',
  async (file_id, { rejectWithValue }) => {
    try {
      const downloadUrl = await providerFileService.downloadFile(file_id);
      return downloadUrl;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to download file'
      );
    }
  }
);

const initialState = {
  loading: false,
  success: false,
  uploadedFile: null,
  appointmentFiles: {
    patient_files: [],
    practitioner_files: [],
  },
  downloadUrl: null,
  error: null,
};

const slice = createSlice({
  name: 'providerUpload',
  initialState,
  reducers: {
    resetProviderUploadState: (state) => {
      state.loading = false;
      state.success = false;
      state.uploadedFile = null;
      state.appointmentFiles = { patient_files: [], practitioner_files: [] };
      state.downloadUrl = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(uploadProviderFile.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(uploadProviderFile.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.uploadedFile = action.payload;
      })
      .addCase(uploadProviderFile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchAppointmentFiles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAppointmentFiles.fulfilled, (state, action) => {
        state.loading = false;
        state.appointmentFiles = {
          patient_files: action.payload?.patient_files ?? [],
          practitioner_files: action.payload?.practitioner_files ?? [],
        };
      })
      .addCase(fetchAppointmentFiles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(downloadPatientFile.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.downloadUrl = null;
      })
      .addCase(downloadPatientFile.fulfilled, (state, action) => {
        state.loading = false;
        state.downloadUrl = action.payload;
      })
      .addCase(downloadPatientFile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { resetProviderUploadState } = slice.actions;
export default slice.reducer;
