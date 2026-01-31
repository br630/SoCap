import axios from 'axios';
import { Platform } from 'react-native';

// API base URL - update this with your backend URL
// Android emulator uses 10.0.2.2 to access host machine's localhost
// iOS simulator can use localhost directly
// Physical devices need your computer's IP address (e.g., http://192.168.1.77:3000/api)
const getDefaultApiUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  if (Platform.OS === 'android') {
    // Android emulator
    return 'http://10.0.2.2:3000/api';
  }
  
  // iOS simulator or web
  return 'http://localhost:3000/api';
};

const API_BASE_URL = getDefaultApiUrl();

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
