import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { auth } from '../config/firebase';
import { User } from 'firebase/auth';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const TOKEN_EXPIRY_KEY = 'token_expiry';
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // Refresh 5 minutes before expiry

// Cross-platform storage helper for web compatibility
const storage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          return window.localStorage.getItem(key);
        } catch {
          return null;
        }
      }
      return null;
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem(key, value);
        } catch {
          // Ignore storage errors on web
        }
      }
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Ignore storage errors on native
    }
  },
  deleteItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.removeItem(key);
        } catch {
          // Ignore
        }
      }
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Ignore
    }
  },
};

/**
 * Token Service
 * Manages secure token storage and automatic refresh
 */
class TokenService {
  /**
   * Store tokens securely
   */
  async storeTokens(accessToken: string, refreshToken?: string, expiresIn?: number): Promise<void> {
    try {
      await storage.setItem(ACCESS_TOKEN_KEY, accessToken);
      
      if (refreshToken) {
        await storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }

      if (expiresIn) {
        const expiryTime = Date.now() + expiresIn * 1000;
        await storage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
      }
    } catch (error) {
      console.error('Error storing tokens:', error);
      // Don't throw on storage errors - auth will still work
    }
  }

  /**
   * Get access token
   * Always checks expiry and refreshes from Firebase if needed
   */
  async getAccessToken(): Promise<string | null> {
    try {
      // Check if we have a valid Firebase user first
      const currentUser = auth.currentUser;
      
      // Get stored token and expiry
      let token = await storage.getItem(ACCESS_TOKEN_KEY);
      const expiry = await storage.getItem(TOKEN_EXPIRY_KEY);
      
      // Check if token is expired or about to expire
      const isExpiredOrExpiring = !expiry || !token || 
        (Date.now() >= parseInt(expiry, 10) - TOKEN_REFRESH_THRESHOLD);
      
      // If expired/expiring and we have a Firebase user, get fresh token
      if (isExpiredOrExpiring && currentUser) {
        console.log('🔄 Token expired/expiring, getting fresh token from Firebase...');
        try {
          token = await currentUser.getIdToken(true); // Force refresh
          await this.storeTokens(token, undefined, 3600);
          console.log('✅ Got fresh token from Firebase');
        } catch (refreshError) {
          console.error('❌ Failed to get fresh token:', refreshError);
          // If we still have an old token, try it anyway
          if (!token) {
            await this.clearTokens();
            return null;
          }
        }
      }
      
      // If no token and no Firebase user, we need to re-login
      if (!token && !currentUser) {
        console.warn('⚠️ No token and no Firebase user - login required');
        await this.clearTokens();
        return null;
      }
      
      // If no stored token but we have Firebase user, get one
      if (!token && currentUser) {
        token = await currentUser.getIdToken();
        await this.storeTokens(token, undefined, 3600);
      }

      return token;
    } catch (error) {
      console.error('❌ Error getting access token:', error);
      return null;
    }
  }

  /**
   * Refresh access token using Firebase
   */
  async refreshToken(): Promise<string | null> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.warn('⚠️ No Firebase user for token refresh - session may have expired');
        // Clear expired tokens so user gets prompted to login
        await this.clearTokens();
        return null;
      }

      // Force token refresh from Firebase
      console.log('🔄 Refreshing token from Firebase...');
      const token = await currentUser.getIdToken(true);
      
      // Store new token (Firebase tokens expire in 1 hour)
      const expiresIn = 3600; // 1 hour
      await this.storeTokens(token, undefined, expiresIn);
      console.log('✅ Token refreshed successfully');

      return token;
    } catch (error) {
      console.error('❌ Error refreshing token:', error);
      // Clear tokens so user gets prompted to login
      await this.clearTokens();
      return null;
    }
  }

  /**
   * Clear all tokens
   */
  async clearTokens(): Promise<void> {
    try {
      await storage.deleteItem(ACCESS_TOKEN_KEY);
      await storage.deleteItem(REFRESH_TOKEN_KEY);
      await storage.deleteItem(TOKEN_EXPIRY_KEY);
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  /**
   * Check if token is expired
   */
  async isTokenExpired(): Promise<boolean> {
    try {
      const expiry = await storage.getItem(TOKEN_EXPIRY_KEY);
      if (!expiry) return true;

      const expiryTime = parseInt(expiry, 10);
      return Date.now() >= expiryTime;
    } catch {
      return true;
    }
  }

  /**
   * Check if token needs refresh
   */
  async needsRefresh(): Promise<boolean> {
    try {
      const expiry = await storage.getItem(TOKEN_EXPIRY_KEY);
      if (!expiry) return true;

      const expiryTime = parseInt(expiry, 10);
      const now = Date.now();
      return now >= expiryTime - TOKEN_REFRESH_THRESHOLD;
    } catch {
      return true;
    }
  }

  /**
   * Initialize token refresh listener
   * Automatically refreshes token before expiry
   */
  startTokenRefreshListener(): () => void {
    const interval = setInterval(async () => {
      if (await this.needsRefresh()) {
        await this.refreshToken();
      }
    }, 60 * 1000); // Check every minute

    return () => clearInterval(interval);
  }
}

export default new TokenService();
