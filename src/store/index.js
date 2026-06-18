import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import appointmentReducer from './slices/appointmentSlice';
import chatReducer from './slices/chatSlice';
import settingsReducer from './slices/settingsSlice';
import providerUploadFileReducer from './slices/providerUploadFileSlice';
import prescriptionWritingReducer from './slices/prescriptionWritingSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    appointment: appointmentReducer,
    chat: chatReducer,
    settings: settingsReducer,
    providerUpload: providerUploadFileReducer,
    prescriptionWriting: prescriptionWritingReducer,
  },
});
