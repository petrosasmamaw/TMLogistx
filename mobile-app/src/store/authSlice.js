import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient, { setAuthToken } from '../api/client.js';
import { loadSession, saveSession, clearSession } from '../storage/session.js';

const MOBILE_ROLES = ['STAFF', 'DRIVER'];

const WRONG_APP_MSG =
  'This account is for the web management portal. Please sign in with a staff or driver account.';

function normalizeUser(user) {
  if (!user) return user;
  const role = user.role === 'STAFF_MEMBER' ? 'STAFF' : user.role;
  return { ...user, role };
}

export const restoreSession = createAsyncThunk('auth/restore', async () => {
  const { token, user } = await loadSession();
  if (!token || !user) return null;
  const normalized = normalizeUser(user);
  if (!MOBILE_ROLES.includes(normalized.role)) {
    await clearSession();
    setAuthToken(null);
    return null;
  }
  setAuthToken(token);
  return { token, user: normalized };
});

export const loginUser = createAsyncThunk('auth/login', async ({ email, password }, { rejectWithValue }) => {
  try {
    const res = await apiClient.login(email, password);
    const user = normalizeUser(res.user);
    if (!MOBILE_ROLES.includes(user.role)) {
      return rejectWithValue(WRONG_APP_MSG);
    }
    await saveSession(res.token, user);
    setAuthToken(res.token);
    return { token: res.token, user };
  } catch (err) {
    return rejectWithValue(err.message || 'Login failed');
  }
});

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  await clearSession();
  setAuthToken(null);
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: null,
    isAuthenticated: false,
    initializing: true,
    loading: false,
    error: null
  },
  reducers: {
    clearAuthError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(restoreSession.pending, (state) => {
        state.initializing = true;
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.initializing = false;
        if (!action.payload) {
          state.isAuthenticated = false;
          state.user = null;
          state.token = null;
          return;
        }
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(restoreSession.rejected, (state) => {
        state.initializing = false;
        state.isAuthenticated = false;
      })
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.error = null;
      });
  }
});

export const { clearAuthError } = authSlice.actions;
export default authSlice.reducer;
