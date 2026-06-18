import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import prescriptionWritingService from '../../services/prescriptionWritingService';

export const writePrescription = createAsyncThunk(
  'prescriptionWriting/write',
  async (payload, { rejectWithValue }) => {
    try {
      const data = await prescriptionWritingService.uploadPrescriptionDocument(payload);
      return data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.error || 'Failed to write prescription'
      );
    }
  }
);

const initialState = {
  loading: false,
  success: false,
  prescription: null,
  error: null,
};

const slice = createSlice({
  name: 'prescriptionWriting',
  initialState,
  reducers: {
    resetPrescriptionWritingState: (state) => {
      state.loading = false;
      state.success = false;
      state.prescription = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(writePrescription.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(writePrescription.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.prescription = action.payload;
      })
      .addCase(writePrescription.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      });
  },
});

export const { resetPrescriptionWritingState } = slice.actions;
export default slice.reducer;
