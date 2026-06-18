import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import chatService from '../../services/chatService';

export const fetchChatById = createAsyncThunk(
  'chat/fetchChatById',
  async (chatId, { rejectWithValue }) => {
    try {
      const response = await chatService.fetchChatById(chatId);
      return response?.data ?? response;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to fetch chat by id',
      );
    }
  },
);

const initialState = {
  currentChat: null,
  loading: false,
  error: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    clearCurrentChat: (state) => {
      state.currentChat = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChatById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChatById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentChat = action.payload;
      })
      .addCase(fetchChatById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearCurrentChat } = chatSlice.actions;
export default chatSlice.reducer;
