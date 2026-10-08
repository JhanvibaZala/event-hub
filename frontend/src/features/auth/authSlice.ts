import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../../services/api';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'USER' | 'ADMIN';
  isVerified: boolean;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  registeredOtp: { email: string; otp: string; message?: string } | null;
}

const savedToken = localStorage.getItem('access_token');
let savedUser: User | null = null;
try {
  const userJson = localStorage.getItem('user');
  if (userJson) savedUser = JSON.parse(userJson);
} catch {
  // Ignore parse error
}

const initialState: AuthState = {
  user: savedUser,
  accessToken: savedToken,
  isAuthenticated: !!savedToken,
  isLoading: false,
  error: null,
  registeredOtp: null,
};

export const registerThunk = createAsyncThunk(
  'auth/register',
  async (
    payload: { email: string; password: string; fullName: string; role?: 'USER' | 'ADMIN' },
    { rejectWithValue },
  ) => {
    try {
      const data: any = await api.post('/auth/register', payload);
      return data;
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  },
);

export const verifyOtpThunk = createAsyncThunk(
  'auth/verifyOtp',
  async (
    payload: { email: string; otp: string; type: 'REGISTER' | 'RESET_PASSWORD' },
    { rejectWithValue },
  ) => {
    try {
      const data: any = await api.post('/auth/verify-otp', payload);
      localStorage.setItem('access_token', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      return data;
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  },
);

export const loginThunk = createAsyncThunk(
  'auth/login',
  async (
    payload: { email: string; password: string },
    { rejectWithValue },
  ) => {
    try {
      const data: any = await api.post('/auth/login', payload);
      localStorage.setItem('access_token', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      return data;
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  },
);

export const fetchProfileThunk = createAsyncThunk(
  'auth/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const data: any = await api.get('/users/profile');
      localStorage.setItem('user', JSON.stringify(data));
      return data;
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  },
);

export const forgotPasswordThunk = createAsyncThunk(
  'auth/forgotPassword',
  async (payload: { email: string }, { rejectWithValue }) => {
    try {
      const data: any = await api.post('/auth/forgot-password', payload);
      return data;
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  },
);

export const resetPasswordThunk = createAsyncThunk(
  'auth/resetPassword',
  async (
    payload: { email: string; otp: string; newPassword: string },
    { rejectWithValue },
  ) => {
    try {
      const data: any = await api.post('/auth/reset-password', payload);
      return data;
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.error = null;
      state.registeredOtp = null;
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    },
    clearError: (state) => {
      state.error = null;
    },
    setRegisteredOtp: (
      state,
      action: PayloadAction<{ email: string; otp: string; message?: string } | null>,
    ) => {
      state.registeredOtp = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Register
    builder.addCase(registerThunk.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(registerThunk.fulfilled, (state, action) => {
      state.isLoading = false;
      state.registeredOtp = {
        email: action.payload.email,
        otp: action.payload.otp,
        message: action.payload.message,
      };
    });
    builder.addCase(registerThunk.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Verify OTP
    builder.addCase(verifyOtpThunk.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(verifyOtpThunk.fulfilled, (state, action) => {
      state.isLoading = false;
      state.accessToken = action.payload.accessToken;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.registeredOtp = null;
    });
    builder.addCase(verifyOtpThunk.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Login
    builder.addCase(loginThunk.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(loginThunk.fulfilled, (state, action) => {
      state.isLoading = false;
      state.accessToken = action.payload.accessToken;
      state.user = action.payload.user;
      state.isAuthenticated = true;
    });
    builder.addCase(loginThunk.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch Profile
    builder.addCase(fetchProfileThunk.fulfilled, (state, action) => {
      state.user = action.payload;
    });
    builder.addCase(fetchProfileThunk.rejected, (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = null;
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    });

    // Forgot Password
    builder.addCase(forgotPasswordThunk.fulfilled, (state, action) => {
      state.registeredOtp = {
        email: action.payload.email,
        otp: action.payload.otp,
        message: action.payload.message,
      };
    });
  },
});

export const { logout, clearError, setRegisteredOtp } = authSlice.actions;
export default authSlice.reducer;
