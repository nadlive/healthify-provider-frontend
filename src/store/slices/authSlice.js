import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from '../../services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_KEYS = ['authToken', 'refreshToken', 'user'];

export const rehydrateAuth = createAsyncThunk('auth/rehydrate', async () => {
  const entries = await AsyncStorage.multiGet([...AUTH_KEYS, 'practitionerId']);
  const storage = Object.fromEntries(entries || []);
  let parsedUser = null;
  if (storage.user) {
    try {
      parsedUser = JSON.parse(storage.user);
    } catch {
      parsedUser = null;
    }
  }
  if (!parsedUser || parsedUser.role !== 'practitioner') {
    await AsyncStorage.multiRemove(AUTH_KEYS);
    return { token: null, refreshToken: null, user: null };
  }
  if (storage.practitionerId) {
    parsedUser = { ...parsedUser, practitionerId: storage.practitionerId };
  }
  return {
    token: storage.authToken || null,
    refreshToken: storage.refreshToken || null,
    user: parsedUser,
  };
});

export const loginWithGoogle = createAsyncThunk(
  'auth/loginWithGoogle',
  async ({ user, token, refreshToken }, { rejectWithValue }) => {
    try {
      await AsyncStorage.setItem('authToken', token);
      if (refreshToken) {
        await AsyncStorage.setItem('refreshToken', refreshToken);
      }
      await AsyncStorage.setItem('user', JSON.stringify(user));
      return { user, token, refreshToken };
    } catch (error) {
      return rejectWithValue(error.message || 'Google login failed');
    }
  }
);

export const verifyTotp = createAsyncThunk(
  'auth/verifyTotp',
  async ({ email, totpCode }, { rejectWithValue }) => {
    try {
      const response = await authService.verifyTotp(email, totpCode);
      const data = response?.data ?? response;
      if (data?.token) {
        await AsyncStorage.setItem('authToken', data.token);
        if (data.refreshToken) {
          await AsyncStorage.setItem('refreshToken', data.refreshToken);
        }
        if (data.user) {
          await AsyncStorage.setItem('user', JSON.stringify(data.user));
        }
      }
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Verification failed'
      );
    }
  }
);

export const fetchUser = createAsyncThunk(
  'auth/fetchUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authService.getUser();
      if (response?.practitionerId) {
        await AsyncStorage.setItem('practitionerId', response.practitionerId);
      }
      return response;
    } catch (error) {
      return rejectWithValue(error?.message || 'Failed to fetch user');
    }
  }
);

function rejectNonPractitioner(state) {
  state.error = 'Access denied. Practitioner only.';
  state.token = null;
  state.refreshToken = null;
  state.user = null;
  state.isAuthenticated = false;
}

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: true,
    user: null,
    error: null,
    requiresTotp: false,
    tempEmail: null,
  },
  reducers: {
    setAuthTokens: (state, action) => {
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = !!action.payload.token;
    },
    logout: (state) => {
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.user = null;
      state.error = null;
      state.requiresTotp = false;
      state.tempEmail = null;
      AsyncStorage.multiRemove([...AUTH_KEYS, 'practitionerId']);
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(rehydrateAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(rehydrateAuth.fulfilled, (state, action) => {
        const { token, user } = action.payload;
        const isPractitioner = user?.role === 'practitioner';
        if (!token || !user || !isPractitioner) {
          state.token = null;
          state.refreshToken = null;
          state.user = null;
          state.isAuthenticated = false;
        } else {
          state.token = action.payload.token;
          state.refreshToken = action.payload.refreshToken;
          state.user = action.payload.user;
          state.isAuthenticated = true;
        }
        state.isLoading = false;
      })
      .addCase(rehydrateAuth.rejected, (state) => {
        state.isLoading = false;
        state.token = null;
        state.refreshToken = null;
        state.user = null;
        state.isAuthenticated = false;
      })
      .addCase(loginWithGoogle.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginWithGoogle.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload?.user?.role !== 'practitioner') {
          rejectNonPractitioner(state);
          return;
        }
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(loginWithGoogle.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })
      .addCase(verifyTotp.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyTotp.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload?.user?.role !== 'practitioner') {
          rejectNonPractitioner(state);
          return;
        }
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.requiresTotp = false;
        state.tempEmail = null;
      })
      .addCase(verifyTotp.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.requiresTotp = true;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        if (action.payload?.practitionerId != null) {
          state.user = { ...state.user, practitionerId: action.payload.practitionerId };
        }
      });
  },
});

export const { setAuthTokens, logout, setLoading, clearError } = authSlice.actions;
export default authSlice.reducer;
