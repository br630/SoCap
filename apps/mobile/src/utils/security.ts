import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import * as Clipboard from 'expo-clipboard';

/**
 * Security Utilities
 * Provides security-related helper functions
 */

/**
 * Check if device is jailbroken (iOS) or rooted (Android)
 */
export async function isDeviceCompromised(): Promise<{
  isCompromised: boolean;
  reason?: string;
}> {
  try {
    if (Platform.OS === 'ios') {
      const isJailbroken = await DeviceInfo.isJailBroken();
      if (isJailbroken) {
        return {
          isCompromised: true,
          reason: 'Device is jailbroken',
        };
      }
    } else if (Platform.OS === 'android') {
      const isRooted = await DeviceInfo.isRooted();
      if (isRooted) {
        return {
          isCompromised: true,
          reason: 'Device is rooted',
        };
      }
    }

    return { isCompromised: false };
  } catch (error) {
    console.error('Error checking device security:', error);
    // Fail open - don't block users if check fails
    return { isCompromised: false };
  }
}

/**
 * Clear clipboard after a delay
 * Useful for sensitive data that was copied
 */
export async function clearClipboardAfterDelay(delayMs: number = 30000): Promise<void> {
  setTimeout(async () => {
    try {
      await Clipboard.setStringAsync('');
    } catch (error) {
      console.error('Error clearing clipboard:', error);
    }
  }, delayMs);
}

/**
 * Clear clipboard immediately
 */
export async function clearClipboard(): Promise<void> {
  try {
    await Clipboard.setStringAsync('');
  } catch (error) {
    console.error('Error clearing clipboard:', error);
  }
}

/**
 * Get device security info
 */
export async function getDeviceSecurityInfo(): Promise<{
  isCompromised: boolean;
  isEmulator: boolean;
  deviceId: string;
  brand: string;
  model: string;
  systemVersion: string;
}> {
  const compromised = await isDeviceCompromised();
  const isEmulator = await DeviceInfo.isEmulator();

  return {
    isCompromised: compromised.isCompromised,
    isEmulator,
    deviceId: DeviceInfo.getDeviceId(),
    brand: DeviceInfo.getBrand(),
    model: DeviceInfo.getModel(),
    systemVersion: DeviceInfo.getSystemVersion(),
  };
}
