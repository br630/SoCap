import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Secure Storage Service
 * Wrapper around expo-secure-store for secure data storage
 * Never use AsyncStorage for sensitive data
 */
class SecureStorageService {
  /**
   * Store a value securely
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error(`Error storing secure item ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get a value securely
   */
  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error(`Error getting secure item ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete a value
   */
  async deleteItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error(`Error deleting secure item ${key}:`, error);
    }
  }

  /**
   * Clear all secure storage (on logout)
   */
  async clearAll(): Promise<void> {
    try {
      // Note: expo-secure-store doesn't have a clearAll method
      // You need to track keys and delete them individually
      // For now, we'll clear known keys
      const knownKeys = [
        'auth_token',
        'auth_user',
        'access_token',
        'refresh_token',
        'token_expiry',
        'last_activity',
        'biometric_enabled',
        'biometric_last_used',
        'logout_on_close',
      ];

      await Promise.all(knownKeys.map((key) => this.deleteItem(key)));
    } catch (error) {
      console.error('Error clearing secure storage:', error);
    }
  }

  /**
   * Check if secure storage is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Try to set and get a test value
      const testKey = '__test_secure_storage__';
      const testValue = 'test';
      await SecureStore.setItemAsync(testKey, testValue);
      const retrieved = await SecureStore.getItemAsync(testKey);
      await SecureStore.deleteItemAsync(testKey);
      return retrieved === testValue;
    } catch {
      return false;
    }
  }
}

export default new SecureStorageService();
