import { useState, useCallback } from 'react';
import biometricService from '../services/biometricService';
import { Alert } from 'react-native';

/**
 * Hook for requiring biometric authentication before sensitive actions
 */
export function useBiometricAuth() {
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  /**
   * Require biometric authentication before executing an action
   */
  const requireBiometricAuth = useCallback(
    async (
      action: () => Promise<void> | void,
      reason: string = 'Authenticate to continue'
    ): Promise<boolean> => {
      try {
        setIsAuthenticating(true);

        // Check if biometric is enabled
        const enabled = await biometricService.isEnabled();
        if (!enabled) {
          // Biometric not enabled, proceed without authentication
          await action();
          return true;
        }

        // Check if biometric is available
        const available = await biometricService.isAvailable();
        if (!available) {
          Alert.alert(
            'Biometric Unavailable',
            'Biometric authentication is not available on this device.'
          );
          return false;
        }

        // Authenticate
        const result = await biometricService.authenticate(reason);
        if (result.success) {
          await action();
          return true;
        } else {
          Alert.alert('Authentication Failed', result.error || 'Biometric authentication failed');
          return false;
        }
      } catch (error) {
        console.error('Biometric auth error:', error);
        Alert.alert('Error', 'An error occurred during authentication');
        return false;
      } finally {
        setIsAuthenticating(false);
      }
    },
    []
  );

  return {
    requireBiometricAuth,
    isAuthenticating,
  };
}
