import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';
import { Event, PaginationMeta } from '../events/eventsSlice';

export interface Registration {
  id: string;
  eventId: string;
  userId: string;
  status: 'CONFIRMED' | 'WAITLISTED' | 'CANCELLED';
  ticketCode: string;
  registeredAt: string;
  event?: Event;
}

export interface RegistrationsState {
  myRegistrations: Registration[];
  meta: PaginationMeta;
  isLoading: boolean;
  error: string | null;
}

const initialState: RegistrationsState = {
  myRegistrations: [],
  meta: {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  },
  isLoading: false,
  error: null,
};

export const fetchMyRegistrationsThunk = createAsyncThunk(
  'registrations/fetchMyRegistrations',
  async (params: Record<string, any> | void, { rejectWithValue }) => {
    try {
      const data: any = await api.get('/registrations/my', { params: params || undefined });
      return data;
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  },
);

export const bookTicketThunk = createAsyncThunk(
  'registrations/bookTicket',
  async (eventId: string, { rejectWithValue }) => {
    try {
      const data: any = await api.post(`/registrations/${eventId}`);
      return data;
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  },
);

export const cancelRegistrationThunk = createAsyncThunk(
  'registrations/cancelRegistration',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/registrations/${id}`);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  },
);

const registrationsSlice = createSlice({
  name: 'registrations',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // Fetch My Registrations
    builder.addCase(fetchMyRegistrationsThunk.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchMyRegistrationsThunk.fulfilled, (state, action) => {
      state.isLoading = false;
      state.myRegistrations = action.payload.items;
      state.meta = action.payload.meta;
    });
    builder.addCase(fetchMyRegistrationsThunk.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Book Ticket
    builder.addCase(bookTicketThunk.fulfilled, (state, action) => {
      state.myRegistrations.unshift(action.payload);
    });

    // Cancel Registration
    builder.addCase(cancelRegistrationThunk.fulfilled, (state, action) => {
      const item = state.myRegistrations.find((r) => r.id === action.payload);
      if (item) {
        item.status = 'CANCELLED';
      }
    });
  },
});

export default registrationsSlice.reducer;
