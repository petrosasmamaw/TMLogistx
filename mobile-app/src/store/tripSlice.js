import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../api/client.js';
import {
  mapApiRequestToMobile,
  mapDriverAssignmentToMobile,
  normalizeAssignmentForMobileMap,
  resolveMobileTripStatus
} from '../utils/mapApiTrip.js';
import {
  DRIVER_ACTIVE_STATUSES,
  driverStatusRank,
  mergeDriverAssignmentRecord,
  mergeDriverAssignmentListsFromServer,
  pickHigherDriverStatus
} from '../utils/driverTripStatus.js';

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

function assignmentKey(trip) {
  return trip?.assignment_id || trip?.id;
}

function mergeDriverAssignmentLists(existing = [], incoming = []) {
  const byId = new Map();
  for (const r of existing) {
    const key = assignmentKey(r);
    if (key) byId.set(key, r);
  }
  for (const r of incoming) {
    const key = assignmentKey(r);
    if (!key) continue;
    const prev = byId.get(key);
    byId.set(key, mergeDriverAssignmentRecord(prev, r));
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.pickup_datetime || b.created_at || 0) - new Date(a.pickup_datetime || a.created_at || 0)
  );
}

function pickActiveDriverTrip(list) {
  const active = (list || []).filter((t) => t && DRIVER_ACTIVE_STATUSES.includes(t.status));
  if (!active.length) return null;
  return active.sort((a, b) => driverStatusRank(b.status) - driverStatusRank(a.status))[0];
}

export const refreshDriverAssignments = createAsyncThunk(
  'trips/refreshDriverAssignments',
  async (_options = {}, { rejectWithValue }) => {
    try {
      const res = await apiClient.getDriverAssignments();
      const rows = (res.assignments || res.data || [])
        .map((r) => mapDriverAssignmentToMobile(r))
        .filter(Boolean);
      return rows;
    } catch (err) {
      return rejectWithValue(err.message || 'Could not load assignments');
    }
  }
);

export const refreshStaffTrips = createAsyncThunk(
  'trips/refreshStaffTrips',
  async (_options = {}, { rejectWithValue }) => {
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
    driverLoading: false,
    driverRefreshing: false,
    hasLoadedDriverAssignments: false,
    error: null,
    driverError: null,
    driverStatsBump: 0
  },
  reducers: {
    bumpDriverStats: (state) => {
      state.driverStatsBump += 1;
    },
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
      const merged = mergeDriverAssignmentLists(state.assignedTrips, action.payload || []);
      state.assignedTrips = merged;
      const pending = pickActiveDriverTrip(merged);
      if (pending) {
        const same =
          state.activeTrip &&
          assignmentKey(state.activeTrip) === assignmentKey(pending);
        if (same) {
          const status = pickHigherDriverStatus(state.activeTrip.status, pending.status);
          state.activeTrip = mergeDriverAssignmentRecord(state.activeTrip, { ...pending, status });
        } else {
          state.activeTrip = pending;
        }
      }
    },
    upsertDriverAssignment: (state, action) => {
      const trip = action.payload;
      const key = assignmentKey(trip);
      if (!key) return;
      const merged = mergeDriverAssignmentLists(state.assignedTrips, [trip]);
      state.assignedTrips = merged;
      const row = merged.find((t) => assignmentKey(t) === key) || trip;
      if (DRIVER_ACTIVE_STATUSES.includes(row.status)) {
        const same = state.activeTrip && assignmentKey(state.activeTrip) === key;
        if (same) {
          const status = pickHigherDriverStatus(state.activeTrip.status, row.status);
          state.activeTrip = mergeDriverAssignmentRecord(state.activeTrip, { ...row, status });
        } else if (!state.activeTrip || driverStatusRank(row.status) >= driverStatusRank(state.activeTrip.status)) {
          state.activeTrip = row;
        }
      }
    },
    setActiveTrip: (state, action) => {
      state.activeTrip = action.payload;
    },
    updateTripStatus: (state, action) => {
      const { tripId, status, holdActive } = action.payload;
      const matches = (t) =>
        t &&
        (t.id === tripId ||
          t.assignment_id === tripId ||
          t.request_number === tripId);
      const terminal = new Set(['COMPLETED', 'CANCELLED', 'REJECTED']);
      if (state.activeTrip && matches(state.activeTrip)) {
        if (terminal.has(status) && !holdActive) {
          state.activeTrip = null;
        } else if (state.activeTrip.assignment_id) {
          const next = terminal.has(status)
            ? status
            : pickHigherDriverStatus(state.activeTrip.status, status);
          state.activeTrip = { ...state.activeTrip, status: next };
        } else {
          const next = terminal.has(status)
            ? status
            : resolveMobileTripStatus(state.activeTrip.status, status);
          state.activeTrip = { ...state.activeTrip, status: next };
        }
      }
      state.requests = state.requests.map((r) => {
        if (!matches(r) && r.assignment_id !== tripId) return r;
        return { ...r, status: resolveMobileTripStatus(r.status, status) };
      });
      state.assignedTrips = state.assignedTrips.map((a) => {
        if (!matches(a)) return a;
        const next = pickHigherDriverStatus(a.status, status);
        return { ...a, status: next };
      });
      if (terminal.has(status)) {
        const rid = state.requests.find((r) => matches(r) || r.assignment_id === tripId)?.id;
        if (state.activeTrip?.id === rid) {
          state.activeTrip = pickActiveStaffTrip(state.requests);
        }
      }
    },
    acceptTrip: (state, action) => {
      const tripId = action.payload;
      const trip = state.assignedTrips.find(
        (t) => t.id === tripId || t.assignment_id === tripId || t.request_number === tripId
      );
      if (trip) {
        trip.status = 'ACCEPTED';
        state.activeTrip = { ...trip, status: 'ACCEPTED' };
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
    },
    removeDriverAssignment: (state, action) => {
      const tripKey = action.payload;
      if (!tripKey) return;
      const matches = (t) =>
        t?.id === tripKey || t?.assignment_id === tripKey || t?.request_id === tripKey;
      state.assignedTrips = state.assignedTrips.filter((t) => !matches(t));
      if (state.activeTrip && matches(state.activeTrip)) {
        state.activeTrip = null;
      }
    },
    patchActiveTripDriverLocation: (state, action) => {
      const { latitude, longitude, driverId } = action.payload || {};
      if (latitude == null || longitude == null) return;
      const patch = {
        assigned_driver_latitude: latitude,
        assigned_driver_longitude: longitude
      };
      const matchesDriver = (trip) =>
        !driverId ||
        trip?.assigned_driver_id === driverId ||
        trip?.assignment_id === driverId;

      if (state.activeTrip && matchesDriver(state.activeTrip)) {
        state.activeTrip = { ...state.activeTrip, ...patch };
      }
      state.requests = state.requests.map((r) =>
        state.activeTrip?.id === r.id ? { ...r, ...patch } : r
      );
    },
    applyTripStatusFromSocket: (state, action) => {
      const { assignmentId, requestId, newStatus } = action.payload || {};
      if (!newStatus) return;
      const touch = (trip) => {
        if (!trip) return trip;
        const matches =
          (assignmentId && (trip.assignment_id === assignmentId || trip.id === assignmentId)) ||
          (requestId && trip.id === requestId);
        if (!matches) return trip;
        const status = pickHigherDriverStatus(trip.status, newStatus);
        return { ...trip, status };
      };
      const nextActive = touch(state.activeTrip);
      if (nextActive !== state.activeTrip) {
        state.activeTrip = nextActive;
      }
      state.requests = state.requests.map(touch);
      state.assignedTrips = state.assignedTrips.map(touch);
    },
    applyTripUpdateFromSocket: (state, action) => {
      const { assignment, newStatus, assignmentId, requestId, request } = action.payload || {};

      if (assignment) {
        const mapped = mapDriverAssignmentToMobile(assignment);
        if (mapped?.assignment_id) {
          state.assignedTrips = mergeDriverAssignmentLists(state.assignedTrips, [mapped]);
          const key = assignmentKey(mapped);
          const row =
            state.assignedTrips.find((t) => assignmentKey(t) === key) || mapped;
          const driverActiveContext = Boolean(state.activeTrip?.assignment_id);
          const staffOwnsActive =
            !driverActiveContext &&
            state.activeTrip &&
            (state.activeTrip.id === mapped.request_id ||
              state.activeTrip.id === assignment.request?.id ||
              state.activeTrip.id === request?.id);
          if (DRIVER_ACTIVE_STATUSES.includes(row.status) && !staffOwnsActive) {
            if (state.activeTrip && assignmentKey(state.activeTrip) === key) {
              const status = pickHigherDriverStatus(state.activeTrip.status, row.status);
              state.activeTrip = mergeDriverAssignmentRecord(state.activeTrip, { ...row, status });
            } else if (!state.activeTrip || driverStatusRank(row.status) >= driverStatusRank(state.activeTrip.status)) {
              state.activeTrip = row;
            }
          } else if (
            !staffOwnsActive &&
            state.activeTrip &&
            assignmentKey(state.activeTrip) === key &&
            ['COMPLETED', 'REJECTED', 'CANCELLED'].includes(row.status)
          ) {
            state.activeTrip = null;
          }
        }

        const req = request || assignment.request;
        if (req) {
          const terminal = new Set(['COMPLETED', 'CANCELLED', 'REJECTED']);
          const effectiveStatus = terminal.has(String(newStatus || '').toUpperCase())
            ? String(newStatus).toUpperCase()
            : resolveMobileTripStatus(req.status, newStatus || assignment.status);
          const staffRow = mapApiRequestToMobile({
            ...req,
            status: effectiveStatus,
            assignment: normalizeAssignmentForMobileMap({
              ...assignment,
              status: newStatus || assignment.status
            })
          });
          if (staffRow?.id) {
            state.requests = mergeStaffTripLists(state.requests, [staffRow]);
            const mergedRow = state.requests.find((r) => r.id === staffRow.id) || staffRow;
            const staffFocused =
              !state.activeTrip?.assignment_id ||
              state.activeTrip?.id === mergedRow.id ||
              state.activeTrip?.assignment_id === mergedRow.assignment_id;
            if (staffFocused) {
              state.activeTrip = mergedRow;
            }
          }
        }
      }

      if (newStatus && (assignmentId || requestId)) {
        const terminal = new Set(['COMPLETED', 'CANCELLED', 'REJECTED']);
        const touch = (trip) => {
          if (!trip) return trip;
          const matches =
            (assignmentId && (trip.assignment_id === assignmentId || trip.id === assignmentId)) ||
            (requestId && trip.id === requestId);
          if (!matches) return trip;
          const isDriverRow = Boolean(trip.assignment_id);
          const nextStatus = terminal.has(newStatus)
            ? newStatus
            : isDriverRow
              ? pickHigherDriverStatus(trip.status, newStatus)
              : resolveMobileTripStatus(trip.status, newStatus);
          return { ...trip, status: nextStatus };
        };
        const nextActive = touch(state.activeTrip);
        if (nextActive !== state.activeTrip) {
          if (nextActive?.assignment_id) {
            state.activeTrip = terminal.has(nextActive.status) ? null : nextActive;
          } else if (nextActive && terminal.has(nextActive.status)) {
            state.activeTrip = nextActive;
          } else {
            state.activeTrip = nextActive;
          }
        }
        state.requests = state.requests.map(touch);
        state.assignedTrips = state.assignedTrips.map((a) => {
          if (assignmentId && a.assignment_id !== assignmentId && a.id !== assignmentId) return a;
          if (requestId && a.request_id && a.request_id !== requestId) return a;
          const status = terminal.has(newStatus) ? newStatus : pickHigherDriverStatus(a.status, newStatus);
          return { ...a, status };
        });
      }
    },
    applyTripAssignedFromSocket: (state, action) => {
      const { requestId, assignment, driverName } = action.payload || {};
      if (!requestId) return;
      const patch = (trip) => {
        if (!trip || trip.id !== requestId) return trip;
        return {
          ...trip,
          status: assignment?.status || 'ASSIGNED',
          assignment_id: assignment?.id,
          assigned_driver_name: driverName || trip.assigned_driver_name,
          assigned_driver_id: assignment?.driver_id || trip.assigned_driver_id
        };
      };
      state.requests = state.requests.map(patch);
      if (state.activeTrip?.id === requestId) {
        state.activeTrip = patch(state.activeTrip);
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(refreshStaffTrips.pending, (state, action) => {
        const silent = Boolean(action.meta?.arg?.silent);
        if (!silent) {
          state.refreshing = true;
          if (!state.hasLoadedStaffTrips && state.requests.length === 0) {
            state.loading = true;
          }
        }
        state.error = null;
      })
      .addCase(refreshStaffTrips.fulfilled, (state, action) => {
        const silent = Boolean(action.meta?.arg?.silent);
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
        if (silent && state.activeTrip?.id) {
          const refreshed = merged.find((r) => r.id === state.activeTrip.id);
          if (refreshed) {
            state.activeTrip = { ...state.activeTrip, ...refreshed };
          }
          return;
        }
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
      })
      .addCase(refreshDriverAssignments.pending, (state, action) => {
        const silent = Boolean(action.meta?.arg?.silent);
        if (!silent) {
          state.driverRefreshing = true;
          if (!state.hasLoadedDriverAssignments && state.assignedTrips.length === 0) {
            state.driverLoading = true;
          }
        }
        state.driverError = null;
      })
      .addCase(refreshDriverAssignments.fulfilled, (state, action) => {
        const silent = Boolean(action.meta?.arg?.silent);
        state.driverLoading = false;
        state.driverRefreshing = false;
        state.hasLoadedDriverAssignments = true;
        const incoming = action.payload || [];
        if (incoming.length === 0 && state.assignedTrips.length > 0) {
          return;
        }
        const merged = mergeDriverAssignmentListsFromServer(state.assignedTrips, incoming);
        state.assignedTrips = merged;
        if (silent && state.activeTrip?.assignment_id) {
          const key = assignmentKey(state.activeTrip);
          const refreshed = merged.find((t) => assignmentKey(t) === key);
          if (refreshed) {
            state.activeTrip = mergeDriverAssignmentRecord(state.activeTrip, refreshed, true);
          } else {
            state.activeTrip = null;
          }
          return;
        }
        const active = pickActiveDriverTrip(merged);
        if (active) {
          const sameTrip =
            state.activeTrip && assignmentKey(state.activeTrip) === assignmentKey(active);
          if (sameTrip) {
            state.activeTrip = mergeDriverAssignmentRecord(state.activeTrip, active, true);
          } else {
            state.activeTrip = active;
          }
        } else if (state.activeTrip) {
          const key = assignmentKey(state.activeTrip);
          const still = merged.find((t) => assignmentKey(t) === key);
          if (!still) {
            state.activeTrip = null;
          }
        }
      })
      .addCase(refreshDriverAssignments.rejected, (state, action) => {
        state.driverLoading = false;
        state.driverRefreshing = false;
        state.hasLoadedDriverAssignments = true;
        state.driverError = action.payload || 'Failed to load assignments';
      });
  }
});

export const {
  setLoading,
  addRequest,
  upsertStaffTrip,
  hydrateStaffTrips,
  hydrateDriverAssignments,
  upsertDriverAssignment,
  setActiveTrip,
  updateTripStatus,
  acceptTrip,
  rejectTrip,
  startExternalTrip,
  completeExternalTrip,
  cancelTrip,
  clearActiveTrip,
  removeDriverAssignment,
  patchActiveTripDriverLocation,
  applyTripStatusFromSocket,
  applyTripAssignedFromSocket,
  applyTripUpdateFromSocket,
  bumpDriverStats
} = tripSlice.actions;

export default tripSlice.reducer;
