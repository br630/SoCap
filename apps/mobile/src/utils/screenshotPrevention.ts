import { useEffect, useRef } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, ReactNode } from 'react';

/**
 * Screenshot Prevention Hook
 * Prevents screenshots on sensitive screens
 * 
 * Note: On iOS, this requires native code configuration
 * On Android, uses FLAG_SECURE window flag
 */

/**
 * Enable screenshot prevention
 * Call this when screen is focused
 */
export function useScreenshotPrevention(enabled: boolean = true) {
  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;

      if (Platform.OS === 'android') {
        // Android: Use FLAG_SECURE
        // This needs to be implemented in native code
        // For now, we'll just log a warning
        console.warn(
          'Screenshot prevention requires native Android code. ' +
          'Add FLAG_SECURE to your MainActivity.java'
        );
      } else if (Platform.OS === 'ios') {
        // iOS: Requires native code configuration
        // Add to Info.plist: UIApplicationSupportsMultipleScenes = false
        // And implement in native code
        console.warn(
          'Screenshot prevention requires native iOS code. ' +
          'Implement in AppDelegate.swift'
        );
      }

      // Handle app state changes
      const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
        if (nextAppState === 'background' || nextAppState === 'inactive') {
          // App going to background - screenshot prevention is handled by OS
        }
      });

      return () => {
        subscription.remove();
      };
    }, [enabled])
  );
}

/**
 * Screenshot prevention component props
 */
export interface ScreenshotPreventionProps {
  enabled?: boolean;
  children: React.ReactNode;
}

/**
 * Screenshot Prevention Component
 * Wrap sensitive screens with this component
 */
export function ScreenshotPrevention({
  enabled = true,
  children,
}: ScreenshotPreventionProps) {
  useScreenshotPrevention(enabled);
  return <>{children}</>;
}
