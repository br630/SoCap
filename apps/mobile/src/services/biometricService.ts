import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const BIOMETRIC_LAST_USED_KEY = 'biometric_last_used';

/**
 * Biometric Authentication Service
 * Handles Face ID, Touch ID, and fingerprint authentication
 */
class BiometricService {
  /**
   * Check if device supports biometric authentication
   */
  async isAvailable(): Promise<boolean> {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) return false;

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return enrolled;
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return false;
    }
  }

  /**
   * Get supported authentication types
   */
  async getSupportedTypes(): Promise<LocalAuthentication.AuthenticationType[]> {
    try {
      return await LocalAuthentication.supportedAuthenticationTypesAsync();
    } catch (error) {
      console.error('Error getting supported auth types:', error);
      return [];
    }
  }

  /**
   * Get human-readable biometric type name
   */
  getBiometricTypeName(types: LocalAuthentication.AuthenticationType[]): string {
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Iris';
    }
    return 'Biometric';
  }

  /**
   * Authenticate with biometrics
   */
  async authenticate(
    reason: string = 'Authenticate to continue',
    options?: LocalAuthentication.LocalAuthenticationOptions
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const available = await this.isAvailable();
      if (!available) {
        return {
          success: false,
          error: 'Biometric authentication is not available on this device',
        };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
        fallbackLabel: 'Use Passcode',
        ...options,
      });

      if (result.success) {
        // Store last successful authentication time
        await SecureStore.setItemAsync(
          BIOMETRIC_LAST_USED_KEY,
          Date.now().toString()
        );
      }

      return {
        success: result.success,
        error: result.success ? undefined : result.error || 'Authentication failed',
      };
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      };
    }
  }

  /**
   * Check if biometric authentication is enabled in settings
   */
  async isEnabled(): Promise<boolean> {
    try {
      const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      return enabled === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Enable biometric authentication
   */
  async enable(): Promise<void> {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
  }

  /**
   * Disable biometric authentication
   */
  async disable(): Promise<void> {
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_LAST_USED_KEY);
  }

  /**
   * Cancel ongoing authentication
   */
  async cancel(): Promise<void> {
    await LocalAuthentication.cancelAuthenticate();
  }
}

export default new BiometricService();
