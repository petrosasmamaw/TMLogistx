import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '../../api/client.js';
import { isWebPortalRole } from '../../constants/portalNav.js';

const WRONG_PORTAL_MSG =
  'This account is not authorized for the web portal. Staff and drivers must use the mobile app.';

export const loginUser = createAsyncThunk('auth/login', async ({ email, password }, { rejectWithValue }) => {
  try {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    if (!isWebPortalRole(res.user?.role)) {
      return rejectWithValue(WRONG_PORTAL_MSG);
    }
    const normalizedUser = {
      ...res.user,
      project_id: res.user?.project_id || res.user?.projectId || res.user?.project?.id || null
    };
    localStorage.setItem('tmlogistx_token', res.token);
    localStorage.setItem('tmlogistx_user', JSON.stringify(normalizedUser));
    return { ...res, user: normalizedUser };
  } catch (err) {
    return rejectWithValue(err.message || 'Login failed');
  }
});

export const bootstrapSession = createAsyncThunk('auth/bootstrap', async (_, { rejectWithValue }) => {
  const token = localStorage.getItem('tmlogistx_token');
  if (!token) {
    return null;
  }
  try {
    const res = await apiRequest('/auth/me');
    const user = res.user;
    if (!isWebPortalRole(user?.role)) {
      localStorage.removeItem('tmlogistx_token');
      localStorage.removeItem('tmlogistx_user');
      return rejectWithValue(WRONG_PORTAL_MSG);
    }
    const normalized = {
      ...user,
      project_id: user.project_id || user.projectId || user.project?.id || null
    };
    localStorage.setItem('tmlogistx_user', JSON.stringify(normalized));
    return { user: normalized, token };
  } catch (err) {
    localStorage.removeItem('tmlogistx_token');
    localStorage.removeItem('tmlogistx_user');
    return rejectWithValue(err.message || 'Session expired');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: null,
    role: null,
    isAuthenticated: false,
    initializing: Boolean(localStorage.getItem('tmlogistx_token')),
    loading: false,
    error: null
  },
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.role = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem('tmlogistx_token');
      localStorage.removeItem('tmlogistx_user');
    },
    clearAuthError(state) {
      state.error = null;
    },
    patchStoredUser(state, action) {
      if (!action.payload) return;
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem('tmlogistx_user', JSON.stringify(state.user));
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.initializing = false;
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.role = action.payload.user.role;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(bootstrapSession.pending, (state) => {
        if (localStorage.getItem('tmlogistx_token')) {
          state.initializing = true;
        }
      })
      .addCase(bootstrapSession.fulfilled, (state, action) => {
        state.initializing = false;
        if (!action.payload) {
          state.isAuthenticated = false;
          return;
        }
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.role = action.payload.user.role;
      })
      .addCase(bootstrapSession.rejected, (state) => {
        state.initializing = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.role = null;
      });
  }
});

export const { logout, clearAuthError, patchStoredUser } = authSlice.actions;
export default authSlice.reducer;
