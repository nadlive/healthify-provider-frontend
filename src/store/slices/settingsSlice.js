import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const rehydrateSettings = createAsyncThunk(
  'settings/rehydrate',
  async () => {
    const timezone = await AsyncStorage.getItem('timezone');
    return {
      timezone: timezone || 'UTC',
    };
  },
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState: {
    timezone: 'UTC',
    isLoading: true,
  },
  reducers: {
    setTimezone: (state, action) => {
      state.timezone = action.payload;
      AsyncStorage.setItem('timezone', action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(rehydrateSettings.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(rehydrateSettings.fulfilled, (state, action) => {
        state.timezone = action.payload.timezone;
        state.isLoading = false;
      })
      .addCase(rehydrateSettings.rejected, (state) => {
        state.isLoading = false;
        state.timezone = 'UTC';
      });
  },
});

export const { setTimezone } = settingsSlice.actions;
export default settingsSlice.reducer;
