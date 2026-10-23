import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '../../api/client.js';

export const fetchCountries = createAsyncThunk('project/fetchCountries', async () => {
  const res = await apiRequest('/countries');
  return res.data;
});

export const fetchProjects = createAsyncThunk('project/fetchProjects', async () => {
  const res = await apiRequest('/projects');
  return res.data;
});

export const createCountry = createAsyncThunk('project/createCountry', async (countryData) => {
  const res = await apiRequest('/countries', {
    method: 'POST',
    body: countryData
  });
  return res.data;
});

export const createProject = createAsyncThunk('project/createProject', async (projectData) => {
  const res = await apiRequest('/projects', {
    method: 'POST',
    body: projectData
  });
  return res.data;
});

export const assignMasterPerson = createAsyncThunk('project/assignMasterPerson', async ({ projectId, userId }) => {
  const res = await apiRequest(`/projects/${projectId}/assign-master`, {
    method: 'POST',
    body: { user_id: userId }
  });
  return res;
});

export const updateProjectStatus = createAsyncThunk(
  'project/updateProjectStatus',
  async ({ projectId, is_active }, { rejectWithValue }) => {
    try {
      const res = await apiRequest(`/projects/${encodeURIComponent(projectId)}`, {
        method: 'PATCH',
        body: { is_active }
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to update project');
    }
  }
);

const projectSlice = createSlice({
  name: 'project',
  initialState: {
    countries: [],
    projects: [],
    loading: false,
    saving: false,
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCountries.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCountries.fulfilled, (state, action) => {
        state.loading = false;
        state.countries = action.payload;
      })
      .addCase(fetchCountries.rejected, (state) => {
        state.loading = false;
      })
      .addCase(fetchProjects.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.projects = action.payload;
      })
      .addCase(fetchProjects.rejected, (state) => {
        state.loading = false;
      })
      .addCase(createCountry.pending, (state) => {
        state.saving = true;
      })
      .addCase(createCountry.fulfilled, (state, action) => {
        state.saving = false;
        state.countries.push(action.payload);
      })
      .addCase(createCountry.rejected, (state) => {
        state.saving = false;
      })
      .addCase(createProject.pending, (state) => {
        state.saving = true;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.saving = false;
        const exists = state.projects.some((p) => p.id === action.payload.id);
        if (!exists) state.projects.push(action.payload);
      })
      .addCase(createProject.rejected, (state) => {
        state.saving = false;
      })
      .addCase(assignMasterPerson.pending, (state) => {
        state.saving = true;
      })
      .addCase(assignMasterPerson.fulfilled, (state) => {
        state.saving = false;
      })
      .addCase(assignMasterPerson.rejected, (state) => {
        state.saving = false;
      })
      .addCase(updateProjectStatus.pending, (state) => {
        state.saving = true;
      })
      .addCase(updateProjectStatus.fulfilled, (state, action) => {
        state.saving = false;
        const updated = action.payload;
        if (!updated?.id) return;
        const idx = state.projects.findIndex((p) => p.id === updated.id);
        if (idx >= 0) {
          state.projects[idx] = { ...state.projects[idx], ...updated, is_active: updated.is_active };
        }
      })
      .addCase(updateProjectStatus.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload || 'Failed to update project';
      });
  }
});

export default projectSlice.reducer;
