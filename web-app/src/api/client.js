// Centralized API Client for TMLogistx Web Management Portal

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('tmlogistx_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && token) {
      const msg = String(data.error || '').toLowerCase();
      const authSessionRoute =
        endpoint.startsWith('/auth/me') ||
        endpoint.startsWith('/auth/login') ||
        msg.includes('token expired') ||
        msg.includes('token invalid') ||
        msg.includes('invalid authorization');
      if (authSessionRoute) {
        localStorage.removeItem('tmlogistx_token');
        localStorage.removeItem('tmlogistx_user');
      }
    }
    const error = new Error(data.error || `HTTP ${response.status}: Request failed`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export default apiRequest;
