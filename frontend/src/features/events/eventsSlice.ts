import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
}

export interface Event {
  id: string;
  title: string;
  slug: string;
  description: string;
  location: string;
  isOnline: boolean;
  startDate: string;
  endDate: string;
  capacity: number;
  registeredCount: number;
  price: string | number;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
  categoryId: string;
  category?: Category;
  organizer?: {
    id: string;
    fullName: string;
    email: string;
  };
  createdAt: string;
}

export type FilterOperator =
  | 'equals'
  | 'contains'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between';

export type FilterField =
  | 'title'
  | 'location'
  | 'price'
  | 'capacity'
  | 'registeredCount'
  | 'startDate'
  | 'endDate'
  | 'status'
  | 'categoryId'
  | 'isOnline';

export interface FilterRule {
  field: FilterField;
  operator: FilterOperator;
  value: any;
}

export interface FilterGroup {
  logic?: 'AND' | 'OR';
  rules?: FilterRule[];
  groups?: FilterGroup[];
}

export interface SortRule {
  field: string;
  direction: 'ASC' | 'DESC';
}

export interface PaginationMeta {
  total: number;
  page?: number;
  limit: number;
  totalPages?: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextCursor?: string | null;
  currentCursor?: string | null;
  activeSort?: SortRule[];
}

export interface EventsState {
  items: Event[];
  meta: PaginationMeta;
  currentEvent: Event | null;
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  viewMode: 'grid' | 'list';
}

const initialState: EventsState = {
  items: [],
  meta: {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
    nextCursor: null,
    currentCursor: null,
    activeSort: [],
  },
  currentEvent: null,
  categories: [],
  isLoading: false,
  error: null,
  viewMode: 'grid',
};

export const fetchEventsThunk = createAsyncThunk(
  'events/fetchEvents',
  async (params: Record<string, any> | undefined, { rejectWithValue }) => {
    try {
      const formattedParams = { ...params };
      if (formattedParams.filters && typeof formattedParams.filters === 'object') {
        formattedParams.filters = JSON.stringify(formattedParams.filters);
      }
      const data: any = await api.get('/events', { params: formattedParams });
      return data;
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  },
);

export const fetchEventByIdThunk = createAsyncThunk(
  'events/fetchEventById',
  async (idOrSlug: string, { rejectWithValue }) => {
    try {
      const data: any = await api.get(`/events/${idOrSlug}`);
      return data;
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  },
);

export const fetchCategoriesThunk = createAsyncThunk(
  'events/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const data: any = await api.get('/categories');
      return data;
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  },
);

export const createEventThunk = createAsyncThunk(
  'events/createEvent',
  async (eventData: any, { rejectWithValue }) => {
    try {
      const data: any = await api.post('/events', eventData);
      return data;
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  },
);

export const updateEventThunk = createAsyncThunk(
  'events/updateEvent',
  async ({ id, data }: { id: string; data: any }, { rejectWithValue }) => {
    try {
      const res: any = await api.patch(`/events/${id}`, data);
      return res;
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  },
);

export const deleteEventThunk = createAsyncThunk(
  'events/deleteEvent',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/events/${id}`);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  },
);

const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    clearCurrentEvent: (state) => {
      state.currentEvent = null;
    },
    setViewMode: (state, action) => {
      state.viewMode = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch Events
    builder.addCase(fetchEventsThunk.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchEventsThunk.fulfilled, (state, action) => {
      state.isLoading = false;
      state.items = action.payload.items;
      state.meta = action.payload.meta;
    });
    builder.addCase(fetchEventsThunk.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch Event By ID
    builder.addCase(fetchEventByIdThunk.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchEventByIdThunk.fulfilled, (state, action) => {
      state.isLoading = false;
      state.currentEvent = action.payload;
    });
    builder.addCase(fetchEventByIdThunk.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch Categories
    builder.addCase(fetchCategoriesThunk.fulfilled, (state, action) => {
      state.categories = action.payload;
    });

    // Delete Event
    builder.addCase(deleteEventThunk.fulfilled, (state, action) => {
      state.items = state.items.filter((e) => e.id !== action.payload);
    });
  },
});

export const { clearCurrentEvent, setViewMode } = eventsSlice.actions;
export default eventsSlice.reducer;
