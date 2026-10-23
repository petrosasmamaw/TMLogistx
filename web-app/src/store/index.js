import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice.js';
import fleetReducer from './slices/fleetSlice.js';
import dispatchReducer from './slices/dispatchSlice.js';
import projectReducer from './slices/projectSlice.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    fleet: fleetReducer,
    dispatch: dispatchReducer,
    project: projectReducer
  }
});

export default store;
