import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import tripReducer from './tripSlice';
import gpsReducer from './gpsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    trips: tripReducer,
    gps: gpsReducer
  }
});

export default store;
