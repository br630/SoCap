import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainerRef } from '@react-navigation/native';
import { AuthProvider, useAuthContext } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import { lightTheme } from './src/theme/paperTheme';
import NotificationService from './src/services/notificationService';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Inner component that has access to AuthContext
function AppContent() {
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const { isAuthenticated } = useAuthContext();

  // Set up notification listeners (always, regardless of auth)
  useEffect(() => {
    const cleanup = NotificationService.setupNotificationListeners(
      (notification) => {
        // Handle foreground notifications
        console.log('Notification received:', notification);
      },
      (response) => {
        // Handle notification tap
        if (navigationRef.current) {
          NotificationService.handleNotificationTap(response, navigationRef.current);
        }
      }
    );

    return cleanup;
  }, []);

  // Register device token only when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // User is logged in, register device token
      NotificationService.registerDeviceToken().catch((error) => {
        // Silently handle errors - notifications are optional
        console.log('Device token registration skipped:', error.message);
      });
    } else {
      // User logged out, unregister device token
      NotificationService.unregisterDeviceToken().catch(() => {
        // Ignore errors on unregister
      });
    }
  }, [isAuthenticated]);

  return (
    <>
      <StatusBar style="auto" />
      <RootNavigator ref={navigationRef} />
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={lightTheme}>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}
