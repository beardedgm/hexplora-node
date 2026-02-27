import axios from 'axios';
import useAuthStore from '../store/useAuthStore.js';
import { showStatus } from '../ui/status.js';

const TOKEN_KEY = 'hexplora_token';

const apiClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses — clear stale token, sync UI, notify user
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      // Sync Zustand so UI reflects logged-out state
      const authState = useAuthStore.getState();
      if (authState.isAuthenticated) {
        authState.logout();
        showStatus('Session expired. Please sign in again.', 'error');
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
