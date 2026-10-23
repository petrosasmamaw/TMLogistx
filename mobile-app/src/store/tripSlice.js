import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../api/client.js';
import { mapApiRequestToMobile } from '../utils/mapApiTrip.js';

function mergeStaffTripLists(existing = [], incoming = []) {
  const byId = new Map();
  for (const r of existing) {
    if (r?.id) byId.set(r.id, r);
  }
  for (const r of incoming) {
    if (!r?.id) continue;
    const prev = byId.get(r.id);
    byId.set(r.id, prev ? { ...prev, ...r } : r);
  }
  // Keep very recent local PENDING rows if server list has not caught up yet
  const now = Date.now();
  for (const r of existing) {
    if (!r?.id || byId.has(r.id)) continue;
    if (r.status !== 'PENDING') continue;
    const ts = new Date(r.created_at || 0).getTime();
    if (now - ts < 3 * 60 * 1000) {
      byId.set(r.id, r);
    }
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
  );
}

function pickActiveStaffTrip(list) {
  const terminal = new Set(['COMPLETED', 'CANCELLED', 'REJECTED']);
  return list.find((r) => r && !terminal.has(r.status)) || null;
}

export const refreshStaffTrips = createAsyncThunk(
  'trips/refreshStaffTrips',
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.getMyRequests();
      const rows = (res.requests || res.data || [])
        .map((r) => mapApiRequestToMobile(r))
        .filter(Boolean);
      return rows;
    } catch (err) {
      return rejectWithValue(err.message || 'Could not load trips');
    }
  }
);

const tripSlice = createSlice({
  name: 'trips',
  initialState: {
    requests: [],
    assignedTrips: [],
    activeTrip: null,
    loading: false,
    refreshing: false,
    hasLoadedStaffTrips: false,
    error: null,
  },
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    addRequest: (state, action) => {
      const newTrip = {
        status: 'PENDING',
        created_at: new Date().toISOString(),
        ...action.payload
      };
      state.requests.unshift(newTrip);
      state.activeTrip = newTrip;
    },
    hydrateStaffTrips: (state, action) => {
      const incoming = action.payload || [];
      const merged = mergeStaffTripLists(state.requests, incoming);
      state.requests = merged;
      const active = pickActiveStaffTrip(merged);
      if (active) {
        state.activeTrip = active;
      } else if (!state.activeTrip || !merged.find((r) => r.id === state.activeTrip?.id)) {
        state.activeTrip = null;
      }
      state.error = null;
    },
    upsertStaffTrip: (state, action) => {
      const trip = action.payload;
      if (!trip?.id) return;
      const merged = mergeStaffTripLists(state.requests, [trip]);
      state.requests = merged;
      const terminal = new Set(['COMPLETED', 'CANCELLED', 'REJECTED']);
      if (!terminal.has(trip.status)) {
        state.activeTrip = merged.find((r) => r.id === trip.id) || trip;
      }
    },
    hydrateDriverAssignments: (state, action) => {
      state.assignedTrips = action.payload || [];
      const pending = (action.payload || []).find((t) =>
        ['ASSIGNED', 'ACCEPTED', 'HEADING_TO_PICKUP', 'ARRIVED', 'IN_TRANSIT'].includes(t.status)
      );
      if (pending && !state.activeTrip) {
        state.activeTrip = pending;
      }
    },
    setActiveTrip: (state, action) => {
      state.activeTrip = action.payload;
    },
    updateTripStatus: (state, action) => {
      const { tripId, status } = action.payload;
      if (state.activeTrip && (state.activeTrip.id === tripId || state.activeTrip.request_number === tripId)) {
        state.activeTrip.status = status;
      }
      const req = state.requests.find(r => r.id === tripId || r.request_number === tripId);
      if (req) {
        req.status = status;
      }
      const assign = state.assignedTrips.find(a => a.id === tripId || a.request_number === tripId);
      if (assign) {
        assign.status = status;
      }
    },
    acceptTrip: (state, action) => {
      const tripId = action.payload;
      const trip = state.assignedTrips.find(t => t.id === tripId || t.request_number === tripId);
      if (trip) {
        trip.status = 'ACCEPTED';
        state.activeTrip = trip;
      }
    },
    rejectTrip: (state, action) => {
      const { tripId, reason } = action.payload;
      const trip = state.assignedTrips.find(t => t.id === tripId || t.request_number === tripId);
      if (trip) {
        trip.status = 'REJECTED';
        trip.rejection_reason = reason;
      }
    },
    startExternalTrip: (state, action) => {
      const { tripId, startLat, startLng, startTime } = action.payload;
      const trip = (state.activeTrip && (state.activeTrip.id === tripId || state.activeTrip.request_number === tripId))
        ? state.activeTrip
        : state.requests.find(r => r.id === tripId || r.request_number === tripId);
      if (trip) {
        trip.status = 'IN_TRANSIT';
        trip.external_status = 'IN_TRANSIT';
        trip.external_authorized = true;
        trip.external_start_lat = startLat;
        trip.external_start_lng = startLng;
        trip.external_start_time = startTime || new Date().toISOString();
        state.activeTrip = { ...trip };
      }
    },
    completeExternalTrip: (state, action) => {
      const { tripId, distanceKm, fareAmount, currency, notes } = action.payload;
      const trip = (state.activeTrip && (state.activeTrip.id === tripId || state.activeTrip.request_number === tripId))
        ? state.activeTrip
        : state.requests.find(r => r.id === tripId || r.request_number === tripId);
      if (trip) {
        trip.status = 'COMPLETED';
        trip.external_status = 'COMPLETED';
        trip.external_distance_km = distanceKm;
        trip.external_cost = parseFloat(fareAmount) || 0;
        trip.external_currency = currency || 'ETB';
        trip.external_receipt_notes = notes || '';
        trip.external_end_time = new Date().toISOString();
        state.activeTrip = { ...trip };
      }
    },
    cancelTrip: (state, action) => {
      const tripId = action.payload;
      if (state.activeTrip && (state.activeTrip.id === tripId || state.activeTrip.request_number === tripId)) {
        state.activeTrip = null;
      }
      const item = state.requests.find(r => r.id === tripId || r.request_number === tripId);
      if (item) item.status = 'CANCELLED';
    },
    clearActiveTrip: (state) => {
      state.activeTrip = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(refreshStaffTrips.pending, (state) => {
        state.refreshing = true;
        if (!state.hasLoadedStaffTrips && state.requests.length === 0) {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(refreshStaffTrips.fulfilled, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.hasLoadedStaffTrips = true;
        const incoming = action.payload || [];
        // Spurious empty responses must not flash-clear the UI
        if (incoming.length === 0 && state.requests.length > 0) {
          return;
        }
        const merged = mergeStaffTripLists(state.requests, incoming);
        state.requests = merged;
        const active = pickActiveStaffTrip(merged);
        const terminal = new Set(['COMPLETED', 'CANCELLED', 'REJECTED']);
        if (active) {
          state.activeTrip = active;
        } else if (state.activeTrip?.id) {
          const still = merged.find((r) => r.id === state.activeTrip.id);
          if (still && !terminal.has(still.status)) {
            state.activeTrip = still;
          } else if (!still && !terminal.has(state.activeTrip.status)) {
            state.requests = mergeStaffTripLists(merged, [state.activeTrip]);
          } else if (terminal.has(still?.status || state.activeTrip.status)) {
            state.activeTrip = pickActiveStaffTrip(state.requests);
          }
        }
      })
      .addCase(refreshStaffTrips.rejected, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.hasLoadedStaffTrips = true;
        state.error = action.payload || 'Failed to load trips';
      });
  }
});

export const {
  setLoading,
  addRequest,
  upsertStaffTrip,
  hydrateStaffTrips,
  hydrateDriverAssignments,
  setActiveTrip,
  updateTripStatus,
  acceptTrip,
  rejectTrip,
  startExternalTrip,
  completeExternalTrip,
  cancelTrip,
  clearActiveTrip
} = tripSlice.actions;

export default tripSlice.reducer;
