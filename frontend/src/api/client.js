import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach access token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('fixflow_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 and refresh token
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('fixflow_refresh_token');

      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
            refresh: refreshToken,
          });

          const newAccessToken = res.data.access;
          localStorage.setItem('fixflow_access_token', newAccessToken);

          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        } catch (refreshErr) {
          // Token expired or invalid -> log out
          localStorage.removeItem('fixflow_access_token');
          localStorage.removeItem('fixflow_refresh_token');
          localStorage.removeItem('fixflow_user');
          window.location.href = '/login';
          return Promise.reject(refreshErr);
        }
      } else {
        localStorage.removeItem('fixflow_access_token');
        localStorage.removeItem('fixflow_refresh_token');
        localStorage.removeItem('fixflow_user');
      }
    }

    return Promise.reject(error);
  }
);
