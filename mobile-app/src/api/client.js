// TMLogistx Mobile API Client with Automatic Bearer Token & Offline Fallback Support
import { Platform } from 'react-native';
import { mapApiRequestToMobile } from '../utils/mapApiTrip.js';

/**
 * 10.0.2.2 = Android emulator → host machine only (not valid in Expo web or on a real phone).
 * Web / iOS simulator → localhost. Physical device → set LAN IP in mobile-app/.env.
 */
const getPlatformUrl = () => {
  const fromEnv =
    typeof process !== 'undefined' && process.env && process.env.EXPO_PUBLIC_API_BASE_URL
      ? process.env.EXPO_PUBLIC_API_BASE_URL.trim()
      : '';

  if (Platform.OS === 'web') {
    if (fromEnv && !fromEnv.includes('10.0.2.2')) return fromEnv.replace(/\/$/, '');
    return 'http://localhost:5000/api';
  }

  if (Platform.OS === 'android') {
    if (fromEnv) return fromEnv.replace(/\/$/, '');
    return 'http://10.0.2.2:5000/api';
  }

  // iOS simulator & other native
  if (fromEnv && !fromEnv.includes('10.0.2.2')) return fromEnv.replace(/\/$/, '');
  return 'http://localhost:5000/api';
};

export const API_BASE_URL = getPlatformUrl();

let currentToken = null;

export const setAuthToken = (token) => {
  currentToken = token;
};

let mockTrips = [];

export const apiClient = {
  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
      ...(options.headers || {})
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
      });

      const errData = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(errData.error || `Request failed with status ${response.status}`);
      }
      return errData;
    } catch (networkError) {
      if (endpoint === '/auth/login') {
        throw networkError;
      }
      // Authenticated reads must not return empty mock data (staff trips would vanish).
      const readEndpoints = [
        '/requests/my',
        '/requests',
        '/dispatch/driver-assignments',
        '/dispatch/driver-stats',
        '/accidents',
        '/fuel'
      ];
      const method = String(options.method || 'GET').toUpperCase();
      const isRead = method === 'GET';
      const isAuthRead =
        currentToken &&
        isRead &&
        readEndpoints.some((p) => endpoint === p || endpoint.startsWith(`${p}?`));
      const isAuthWrite = currentToken && !isRead && !endpoint.startsWith('/auth/');
      if (isAuthRead || isAuthWrite) {
        throw networkError;
      }
      console.warn(`[TMLogistx Mobile Client] API endpoint ${endpoint} unavailable, using intelligent local engine:`, networkError.message);
      return this.handleFallback(endpoint, options);
    }
  },

  handleFallback(endpoint, options) {
    const body = options.body ? JSON.parse(options.body) : {};

    // 1. Staff Requests Fallback
    if (endpoint === '/requests/my' || endpoint === '/requests') {
      if (options.method === 'POST') {
        const newReq = {
          id: 'req-' + Date.now(),
          request_number: `REQ-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          status: 'PENDING',
          ...body,
          created_at: new Date().toISOString()
        };
        mockTrips.unshift(newReq);
        return { message: 'Movement request created', request: newReq };
      }
      return { requests: mockTrips };
    }

    // 3. Driver stats & assignments fallback (no demo KPIs)
    if (endpoint === '/dispatch/driver-stats') {
      return {
        success: true,
        data: {
          trips_completed: 0,
          on_time_rate_pct: null,
          total_distance_km: 0,
          staff_rating: 5.0,
          vehicle: null,
          vehicle_status_label: null,
          completed_movements: []
        }
      };
    }

    if (endpoint === '/dispatch/driver-assignments') {
      return { assignments: mockTrips };
    }

    if (endpoint === '/accidents/driver-context') {
      return {
        success: true,
        data: {
          driver_id: null,
          default_vehicle_id: null,
          default_vehicle: null,
          selectable_vehicles: []
        }
      };
    }

    if (endpoint === '/accidents' && options.method === 'POST') {
      throw networkError;
    }

    if (endpoint === '/dispatch/reject' && options.method === 'POST') {
      const { assignment_id, reason } = body;
      const trip = mockTrips.find((t) => t.id === assignment_id);
      if (trip) {
        trip.status = 'REJECTED';
        trip.rejection_reason = reason;
      }
      return { success: true, message: 'Assignment declined' };
    }

    // 4. Trip Status Update Fallback (PATCH /tracking/trip/:id/status)
    if (endpoint.match(/^\/tracking\/trip\/[^/]+\/status$/) && options.method === 'PATCH') {
      const tripId = endpoint.split('/')[3];
      const { status, actual_distance_km, distance_source } = body;
      const trip = mockTrips.find(t => t.id === tripId || t.request_number === tripId);
      if (trip) {
        trip.status = status;
        if (actual_distance_km != null) {
          trip.actual_distance_km = actual_distance_km;
          trip.distance_source = distance_source;
        }
      }
      return { success: true, message: `Trip status updated to ${status}`, trip_id: tripId, status };
    }

    if (endpoint === '/tracking/trip-status' && options.method === 'POST') {
      const { trip_id, status, actual_distance_km } = body;
      const trip = mockTrips.find(t => t.id === trip_id || t.request_number === trip_id);
      if (trip) {
        trip.status = status;
        if (actual_distance_km != null) trip.actual_distance_km = actual_distance_km;
      }
      return { success: true, message: `Trip status updated to ${status}`, trip_id, status };
    }

    // 5. Live GPS Ping Fallback
    if (endpoint === '/tracking/gps') {
      return { success: true, message: 'GPS coordinates acknowledged' };
    }

    // 6. Incident Reporting Fallback
    if (endpoint === '/tracking/incident') {
      return { success: true, message: 'Incident logged & dispatched to Movement Officer' };
    }

    // 7. Start External Ride (Uber / RIDE)
    if (endpoint === '/dispatch/start-external' && options.method === 'POST') {
      const { request_id, start_lat, start_lng } = body;
      const trip = mockTrips.find(t => t.id === request_id || t.request_number === request_id);
      if (trip) {
        trip.status = 'IN_TRANSIT';
        trip.external_status = 'IN_TRANSIT';
        trip.external_start_lat = start_lat || trip.pickup_latitude;
        trip.external_start_lng = start_lng || trip.pickup_longitude;
        trip.external_start_time = new Date().toISOString();
      }
      return { success: true, message: 'External ride started successfully', data: trip };
    }

    // 8. Complete External Ride (Uber / RIDE)
    if (endpoint === '/dispatch/complete-external' && options.method === 'POST') {
      const { request_id, fare_amount, currency = 'ETB', receipt_notes = '', end_lat, end_lng } = body;
      const trip = mockTrips.find(t => t.id === request_id || t.request_number === request_id);
      const dist = 5.8; // calculated fallback distance
      if (trip) {
        trip.status = 'COMPLETED';
        trip.external_status = 'COMPLETED';
        trip.external_cost = parseFloat(fare_amount) || 0;
        trip.external_currency = currency;
        trip.external_distance_km = dist;
        trip.external_receipt_notes = receipt_notes;
        trip.external_end_time = new Date().toISOString();
      }
      return {
        success: true,
        message: 'External ride completed and expense recorded',
        data: { request: trip, distance_km: dist, fare_amount }
      };
    }

    return { success: true, data: [] };
  },

  // Auth
  login: (email, password) => apiClient.request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  }),

  forgotPassword: (email) =>
    apiClient.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    }),

  resetPassword: (token, newPassword) =>
    apiClient.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword })
    }),

  changePassword: (currentPassword, newPassword) =>
    apiClient.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    }),

  patchProfile: (body) =>
    apiClient.request('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(body)
    }),

  // Staff Movement Requests
  getMyRequests: async () => {
    const res = await apiClient.request('/requests/my', { method: 'GET' });
    const raw = res.requests || res.data || [];
    const requests = raw.map((row) => mapApiRequestToMobile(row)).filter(Boolean);
    return { ...res, requests, count: requests.length };
  },
  getRequestFormContext: (projectId) => {
    const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
    return apiClient.request(`/requests/form-context${q}`, { method: 'GET' });
  },

  createRequest: async (data) => {
    const res = await apiClient.request('/requests', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res;
  },

  // External Transport (Uber / RIDE) for Staff
  startExternalRide: (requestId, startLat, startLng, startAddress = '') => apiClient.request('/dispatch/start-external', {
    method: 'POST',
    body: JSON.stringify({
      request_id: requestId,
      start_lat: startLat,
      start_lng: startLng,
      start_address: startAddress
    })
  }),
  startFleetMeter: (requestId, startLat, startLng) =>
    apiClient.request('/dispatch/start-fleet-meter', {
      method: 'POST',
      body: JSON.stringify({
        request_id: requestId,
        start_lat: startLat,
        start_lng: startLng
      })
    }),
  completeFleetMeter: (requestId, endLat, endLng) =>
    apiClient.request('/dispatch/complete-fleet-meter', {
      method: 'POST',
      body: JSON.stringify({
        request_id: requestId,
        end_lat: endLat,
        end_lng: endLng
      })
    }),

  completeExternalRide: (data) => apiClient.request('/dispatch/complete-external', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Driver Fleet Console
  getDriverStats: () => apiClient.request('/dispatch/driver-stats', { method: 'GET' }),
  getDriverAssignments: () => apiClient.request('/dispatch/driver-assignments', { method: 'GET' }),
  acceptTrip: (assignmentId) => apiClient.request('/dispatch/accept', {
    method: 'POST',
    body: JSON.stringify({ assignment_id: assignmentId })
  }),
  rejectTrip: (assignmentId, reason) => apiClient.request('/dispatch/reject', {
    method: 'POST',
    body: JSON.stringify({ assignment_id: assignmentId, reason })
  }),

  // Workflow D Stepper (distance optional on COMPLETED)
  updateTripStatus: (tripId, status, options = {}) => {
    const {
      notes = '',
      actual_distance_km,
      distance_source,
      gps_tracked_distance_km,
      map_estimated_distance_km,
      manual_distance_km,
      drive_start_lat,
      drive_start_lng,
      drive_end_lat,
      drive_end_lng
    } = options;
    return apiClient.request(`/tracking/trip/${tripId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status,
        notes,
        actual_distance_km,
        distance_source,
        gps_tracked_distance_km,
        map_estimated_distance_km,
        manual_distance_km,
        drive_start_lat,
        drive_start_lng,
        drive_end_lat,
        drive_end_lng
      })
    });
  },

  // Live GPS Tracking & Incidents
  sendGpsPing: (data) => apiClient.request('/tracking/gps', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  reportIncident: (data) => apiClient.request('/tracking/incident', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Fuel Consumption Recording
  logFuel: (data) => apiClient.request('/fuel', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getFuelLogs: () => apiClient.request('/fuel', { method: 'GET' }),

  // Accident & Emergency Incident Logging
  getDriverAccidentContext: () =>
    apiClient.request('/accidents/driver-context', { method: 'GET' }),
  reportAccident: (data) => apiClient.request('/accidents', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getAccidents: () => apiClient.request('/accidents', { method: 'GET' }),

  // Fleet Safety Policies & User Agreement
  getMyPolicy: () => apiClient.request('/policies/my', { method: 'GET' }),
  acceptPolicy: (policyId) => apiClient.request(`/policies/${policyId}/accept`, { method: 'POST' }),

  // Staff Cancel Request
  cancelMyRequest: (requestId, reason = 'Cancelled by staff') => apiClient.request(`/requests/${requestId}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify({ reason })
  })
};

export default apiClient;
