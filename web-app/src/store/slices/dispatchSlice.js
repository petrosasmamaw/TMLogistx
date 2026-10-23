import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '../../api/client.js';

export const fetchRequests = createAsyncThunk('dispatch/fetchRequests', async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await apiRequest(`/requests${query ? '?' + query : ''}`);
  return res.data;
});

export const fetchRecommendations = createAsyncThunk('dispatch/fetchRecommendations', async (requestId) => {
  const res = await apiRequest(`/dispatch/recommendations/${requestId}`);
  return res;
});

export const assignVehicle = createAsyncThunk('dispatch/assignVehicle', async ({ request_id, vehicle_id, driver_id, notes }) => {
  const res = await apiRequest('/dispatch/assign', {
    method: 'POST',
    body: { request_id, vehicle_id, driver_id, notes }
  });
  return res.data;
});

export const assignExternal = createAsyncThunk('dispatch/assignExternal', async (externalData) => {
  const res = await apiRequest('/dispatch/external', {
    method: 'POST',
    body: externalData
  });
  return res.data;
});

export const authorizeExternal = createAsyncThunk('dispatch/authorizeExternal', async (params) => {
  const res = await apiRequest('/dispatch/authorize-external', {
    method: 'POST',
    body: params
  });
  return res.data;
});

export const reassignTrip = createAsyncThunk('dispatch/reassignTrip', async ({ request_id, vehicle_id, driver_id, reason }) => {
  const res = await apiRequest('/dispatch/reassign', {
    method: 'POST',
    body: { request_id, vehicle_id, driver_id, reason }
  });
  return res.data;
});

export const cancelTripAssignment = createAsyncThunk('dispatch/cancelTripAssignment', async ({ request_id, reason }) => {
  const res = await apiRequest('/dispatch/cancel-assignment', {
    method: 'POST',
    body: { request_id, reason }
  });
  return res.data;
});

export const cancelRequest = createAsyncThunk('dispatch/cancelRequest', async ({ requestId, reason }) => {
  const res = await apiRequest(`/requests/${requestId}/cancel`, {
    method: 'PATCH',
    body: { reason }
  });
  return res.data;
});

const dispatchSlice = createSlice({
  name: 'dispatch',
  initialState: {
    requests: [],
    selectedRequest: null,
    recommendations: null,
    loadingRecs: false,
    loading: false,
    actionError: null
  },
  reducers: {
    selectRequest(state, action) {
      state.selectedRequest = action.payload;
      state.recommendations = null;
    },
    clearRecommendations(state) {
      state.recommendations = null;
    },
    onNewRequest(state, action) {
      state.requests.unshift(action.payload);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRequests.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.requests = action.payload;
      })
      .addCase(fetchRequests.rejected, (state) => {
        state.loading = false;
      })
      .addCase(fetchRecommendations.pending, (state) => {
        state.loadingRecs = true;
        state.actionError = null;
      })
      .addCase(fetchRecommendations.fulfilled, (state, action) => {
        state.loadingRecs = false;
        state.recommendations = action.payload;
      })
      .addCase(fetchRecommendations.rejected, (state, action) => {
        state.loadingRecs = false;
        state.actionError = action.error.message;
      })
      .addCase(assignVehicle.fulfilled, (state, action) => {
        const assignedReqId = action.payload.request_id;
        const index = state.requests.findIndex(r => r.id === assignedReqId);
        if (index !== -1) {
          state.requests[index].status = 'ASSIGNED';
          state.requests[index].assignment = action.payload;
        }
        state.recommendations = null;
      })
      .addCase(assignExternal.fulfilled, (state, action) => {
        const extReqId = action.payload.request_id;
        const index = state.requests.findIndex(r => r.id === extReqId);
        if (index !== -1) {
          state.requests[index].status = 'COMPLETED';
          state.requests[index].external_transport = action.payload;
          state.requests[index].external_authorized = true;
        }
      })
      .addCase(authorizeExternal.fulfilled, (state, action) => {
        const updated = action.payload;
        const id = updated?.id;
        if (!id) return;
        const index = state.requests.findIndex((r) => r.id === id);
        if (index !== -1) {
          state.requests[index] = { ...state.requests[index], ...updated };
        }
        if (state.selectedRequest?.id === id) {
          state.selectedRequest = { ...state.selectedRequest, ...updated };
        }
      })
      .addCase(reassignTrip.fulfilled, (state, action) => {
        const reqId = action.payload.request_id || action.payload.id;
        const index = state.requests.findIndex(r => r.id === reqId);
        if (index !== -1) {
          state.requests[index].assignment = action.payload.assignment || action.payload;
        }
        if (state.selectedRequest && state.selectedRequest.id === reqId) {
          state.selectedRequest.assignment = action.payload.assignment || action.payload;
        }
      })
      .addCase(cancelTripAssignment.fulfilled, (state, action) => {
        const reqId = action.payload.id;
        const index = state.requests.findIndex(r => r.id === reqId);
        if (index !== -1) {
          state.requests[index] = { ...state.requests[index], ...action.payload };
        }
        if (state.selectedRequest && state.selectedRequest.id === reqId) {
          state.selectedRequest = { ...state.selectedRequest, ...action.payload };
        }
      });
  }
});

export const { selectRequest, clearRecommendations, onNewRequest } = dispatchSlice.actions;
export default dispatchSlice.reducer;
