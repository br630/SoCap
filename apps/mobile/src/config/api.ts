import axios from 'axios';

// API base URL - update this with your backend URL
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use(
  async (config) => {
    const token = await getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
