import axios from 'axios';
import { Platform } from 'react-native';

// API base URL - update this with your backend URL
// Android emulator uses 10.0.2.2 to access host machine's localhost
// iOS simulator can use localhost directly
// Physical devices need your computer's IP address (e.g., http://192.168.1.77:3000/api)
const getDefaultApiUrl = () => {
  // For Android, always use emulator address (10.0.2.2) when running in emulator
  // Check if we're in an emulator by checking if we can detect it
  if (Platform.OS === 'android') {
    // Android emulator - use 10.0.2.2 to access host machine's localhost
    // Only use EXPO_PUBLIC_API_URL if explicitly set for physical device testing
    const envUrl = process.env.EXPO_PUBLIC_API_URL;
    // If env URL contains localhost or 192.168.x.x, it's likely for physical device
    // For emulator, always use 10.0.2.2
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('192.168.')) {
      return envUrl;
    }
    return 'http://10.0.2.2:3000/api';
  }
  
  // For iOS or web, use env var if set, otherwise localhost
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  // iOS simulator or web
  return 'http://localhost:3000/api';
};

const API_BASE_URL = getDefaultApiUrl();

// Debug: Log the API URL being used
console.log('🔗 API Base URL:', API_BASE_URL);
console.log('📱 Platform:', Platform.OS);

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await getStoredToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        // Debug logging in development
        if (process.env.NODE_ENV === 'development') {
          console.log('🔑 Adding auth token to request:', config.url, token.substring(0, 20) + '...');
        }
      } else {
        // Debug logging when no token
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ No auth token available for request:', config.url);
        }
      }
    } catch (error) {
      console.error('❌ Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Helper to get stored token (will be implemented in AuthContext)
let getStoredToken: () => Promise<string | null> = async () => null;

export const setTokenGetter = (fn: () => Promise<string | null>) => {
  getStoredToken = fn;
};

// Handle 401 errors - token might be expired or missing
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If we get a 401 and haven't already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Try to get a fresh token
      try {
        const token = await getStoredToken();
        if (token) {
          // Retry the request with the new token
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.error('❌ 401 error: No token available to retry request');
          }
        }
      } catch (refreshError) {
        console.error('❌ Error refreshing token for retry:', refreshError);
      }
    }

    return Promise.reject(error);
  }
);
