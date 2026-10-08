import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'REGISTRATION' | 'REMINDER' | 'EVENT_UPDATE';
  isRead: boolean;
  metadata?: any;
  createdAt: string;
}

export interface NotificationsState {
  items: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
}

const initialState: NotificationsState = {
  items: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
};

export const fetchNotificationsThunk = createAsyncThunk(
  'notifications/fetchNotifications',
  async (unreadOnly: boolean | void, { rejectWithValue }) => {
    try {
      const data: any = await api.get('/notifications', {
        params: unreadOnly ? { unreadOnly: true } : undefined,
      });
      return data;
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  },
);

export const markAsReadThunk = createAsyncThunk(
  'notifications/markAsRead',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  },
);

export const markAllAsReadThunk = createAsyncThunk(
  'notifications/markAllAsRead',
  async (_, { rejectWithValue }) => {
    try {
      await api.patch('/notifications/read-all');
      return true;
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  },
);

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // Fetch
    builder.addCase(fetchNotificationsThunk.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchNotificationsThunk.fulfilled, (state, action) => {
      state.isLoading = false;
      state.items = action.payload.items;
      state.unreadCount = action.payload.unreadCount;
    });
    builder.addCase(fetchNotificationsThunk.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Mark single as read
    builder.addCase(markAsReadThunk.fulfilled, (state, action) => {
      const item = state.items.find((n) => n.id === action.payload);
      if (item && !item.isRead) {
        item.isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    });

    // Mark all as read
    builder.addCase(markAllAsReadThunk.fulfilled, (state) => {
      state.items.forEach((n) => {
        n.isRead = true;
      });
      state.unreadCount = 0;
    });
  },
});

export default notificationsSlice.reducer;
