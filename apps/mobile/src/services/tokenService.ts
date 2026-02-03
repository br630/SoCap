import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { auth } from '../config/firebase';
import { User } from 'firebase/auth';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const TOKEN_EXPIRY_KEY = 'token_expiry';
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // Refresh 5 minutes before expiry

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
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
      
      if (refreshToken) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
      }

      if (expiresIn) {
        const expiryTime = Date.now() + expiresIn * 1000;
        await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, expiryTime.toString());
      }
    } catch (error) {
      console.error('Error storing tokens:', error);
      throw error;
    }
  }

  /**
   * Get access token
   */
  async getAccessToken(): Promise<string | null> {
    try {
      // Check if token is expired or about to expire
      const expiry = await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY);
      if (expiry) {
        const expiryTime = parseInt(expiry, 10);
        const now = Date.now();
        
        // If expired or about to expire, refresh it
        if (now >= expiryTime - TOKEN_REFRESH_THRESHOLD) {
          await this.refreshToken();
        }
      }

      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting access token:', error);
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
        return null;
      }

      // Force token refresh
      const token = await currentUser.getIdToken(true);
      
      // Store new token (Firebase tokens expire in 1 hour)
      const expiresIn = 3600; // 1 hour
      await this.storeTokens(token, undefined, expiresIn);

      return token;
    } catch (error) {
      console.error('Error refreshing token:', error);
      // Clear tokens on refresh failure
      await this.clearTokens();
      return null;
    }
  }

  /**
   * Clear all tokens
   */
  async clearTokens(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY);
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  /**
   * Check if token is expired
   */
  async isTokenExpired(): Promise<boolean> {
    try {
      const expiry = await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY);
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
      const expiry = await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY);
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
