import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '../../api/client.js';

export const fetchLiveFleet = createAsyncThunk('fleet/fetchLiveFleet', async (projectId = null) => {
  const query = projectId ? `?project_id=${projectId}` : '';
  const res = await apiRequest(`/tracking/live-fleet${query}`);
  return {
    fleet: res.data || [],
    drivers: res.drivers || []
  };
});

export const fetchVehicles = createAsyncThunk('fleet/fetchVehicles', async (projectId = null) => {
  const query = projectId ? `?project_id=${projectId}` : '';
  const res = await apiRequest(`/vehicles${query}`);
  return res.data;
});

export const fetchDrivers = createAsyncThunk('fleet/fetchDrivers', async (projectId = null) => {
  const query = projectId ? `?project_id=${projectId}` : '';
  const res = await apiRequest(`/drivers${query}`);
  return res.data;
});

export const fetchSchedules = createAsyncThunk('fleet/fetchSchedules', async (projectId = null) => {
  const query = projectId ? `?project_id=${projectId}` : '';
  const res = await apiRequest(`/schedules${query}`);
  return res.data;
});

export const fetchExpenses = createAsyncThunk('fleet/fetchExpenses', async (projectId = null) => {
  const query = projectId ? `?project_id=${projectId}` : '';
  const res = await apiRequest(`/expenses${query}`);
  return res.data;
});

export const fetchExpenseSummary = createAsyncThunk('fleet/fetchExpenseSummary', async (projectId = null) => {
  const query = projectId ? `?project_id=${projectId}` : '';
  const res = await apiRequest(`/expenses/summary${query}`);
  return res.data;
});

export const createVehicle = createAsyncThunk('fleet/createVehicle', async (vehicleData) => {
  const res = await apiRequest('/vehicles', {
    method: 'POST',
    body: vehicleData
  });
  return res.data;
});

export const updateVehicle = createAsyncThunk('fleet/updateVehicle', async ({ id, data }) => {
  const res = await apiRequest(`/vehicles/${id}`, {
    method: 'PATCH',
    body: data
  });
  return res.data;
});

export const fetchAccidents = createAsyncThunk('fleet/fetchAccidents', async () => {
  const res = await apiRequest('/accidents');
  return res.data;
});

export const updateAccident = createAsyncThunk('fleet/updateAccident', async ({ id, data }) => {
  const res = await apiRequest(`/accidents/${id}`, {
    method: 'PATCH',
    body: data
  });
  return res.data;
});

export const recordExpense = createAsyncThunk('fleet/recordExpense', async (expenseData) => {
  const res = await apiRequest('/expenses', {
    method: 'POST',
    body: expenseData
  });
  return res.data;
});

const fleetSlice = createSlice({
  name: 'fleet',
  initialState: {
    liveFleet: [],
    liveDrivers: [],
    vehicles: [],
    drivers: [],
    schedules: [],
    expenses: [],
    accidents: [],
    expenseSummary: null,
    loading: false,
    saving: false,
    error: null
  },
  reducers: {
    updateLiveLocation(state, action) {
      const { vehicleId, latitude, longitude, speed, heading, reportedAt } = action.payload;
      const index = state.liveFleet.findIndex(v => v.id === vehicleId);
      if (index !== -1) {
        state.liveFleet[index].latitude = latitude;
        state.liveFleet[index].longitude = longitude;
        state.liveFleet[index].last_location_update = reportedAt;
        state.liveFleet[index].is_stale = false;
      }
    }
  },
  extraReducers: (builder) => {
    const fetchPending = (state) => {
      state.loading = true;
    };
    const fetchDone = (state) => {
      state.loading = false;
    };
    const savePending = (state) => {
      state.saving = true;
    };
    const saveDone = (state) => {
      state.saving = false;
    };

    builder
      .addCase(fetchLiveFleet.pending, fetchPending)
      .addCase(fetchLiveFleet.rejected, fetchDone)
      .addCase(fetchLiveFleet.fulfilled, (state, action) => {
        fetchDone(state);
        const payload = action.payload;
        if (Array.isArray(payload)) {
          state.liveFleet = payload;
          state.liveDrivers = [];
        } else {
          state.liveFleet = payload.fleet || [];
          state.liveDrivers = payload.drivers || [];
        }
      })
      .addCase(fetchVehicles.pending, fetchPending)
      .addCase(fetchVehicles.rejected, fetchDone)
      .addCase(fetchVehicles.fulfilled, (state, action) => {
        fetchDone(state);
        state.vehicles = action.payload;
      })
      .addCase(fetchDrivers.pending, fetchPending)
      .addCase(fetchDrivers.rejected, fetchDone)
      .addCase(fetchDrivers.fulfilled, (state, action) => {
        fetchDone(state);
        state.drivers = action.payload;
      })
      .addCase(fetchSchedules.pending, fetchPending)
      .addCase(fetchSchedules.rejected, fetchDone)
      .addCase(fetchSchedules.fulfilled, (state, action) => {
        fetchDone(state);
        state.schedules = action.payload;
      })
      .addCase(fetchExpenses.pending, fetchPending)
      .addCase(fetchExpenses.rejected, fetchDone)
      .addCase(fetchExpenses.fulfilled, (state, action) => {
        fetchDone(state);
        state.expenses = action.payload;
      })
      .addCase(fetchAccidents.pending, fetchPending)
      .addCase(fetchAccidents.rejected, fetchDone)
      .addCase(fetchAccidents.fulfilled, (state, action) => {
        fetchDone(state);
        state.accidents = action.payload;
      })
      .addCase(updateAccident.fulfilled, (state, action) => {
        const idx = state.accidents.findIndex(a => a.id === action.payload.id);
        if (idx !== -1) {
          state.accidents[idx] = action.payload;
        }
      })
      .addCase(fetchExpenseSummary.pending, fetchPending)
      .addCase(fetchExpenseSummary.rejected, fetchDone)
      .addCase(fetchExpenseSummary.fulfilled, (state, action) => {
        fetchDone(state);
        state.expenseSummary = action.payload;
      })
      .addCase(createVehicle.pending, savePending)
      .addCase(createVehicle.rejected, saveDone)
      .addCase(createVehicle.fulfilled, (state, action) => {
        saveDone(state);
        state.vehicles.push(action.payload);
      })
      .addCase(updateVehicle.fulfilled, (state, action) => {
        const idx = state.vehicles.findIndex(v => v.id === action.payload.id);
        if (idx !== -1) {
          state.vehicles[idx] = action.payload;
        }
      })
      .addCase(recordExpense.pending, savePending)
      .addCase(recordExpense.rejected, saveDone)
      .addCase(recordExpense.fulfilled, (state, action) => {
        saveDone(state);
        state.expenses.unshift(action.payload);
      });
  }
});

export const { updateLiveLocation } = fleetSlice.actions;
export default fleetSlice.reducer;

