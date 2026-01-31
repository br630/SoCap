import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiClient } from '../config/api';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationData {
  type?: string;
  reminderId?: string;
  reminderType?: string;
  contactId?: string;
  eventId?: string;
  savingsGoalId?: string;
}

class NotificationService {
  private static token: string | null = null;
  private static listeners: Array<(notification: Notifications.Notification) => void> = [];

  /**
   * Request notification permissions
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Notification permissions not granted');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Request notification permissions error:', error);
      return false;
    }
  }

  /**
   * Get and register device token
   */
  static async registerDeviceToken(): Promise<string | null> {
    try {
      const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
      
      // Validate project ID format (UUID)
      const isValidUUID = projectId && projectId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      
      if (!projectId || projectId === 'your-project-id-here' || !isValidUUID) {
        console.warn(
          '⚠️ Expo Project ID not configured. Push notifications are disabled.\n' +
          'To enable push notifications:\n' +
          '1. Go to https://expo.dev and sign in\n' +
          '2. Create or select your project\n' +
          '3. Copy the Project ID (UUID format)\n' +
          '4. Add to apps/mobile/.env: EXPO_PUBLIC_PROJECT_ID=your-project-id\n' +
          '5. Note: Push notifications require a development build (not Expo Go)'
        );
        // Return null but don't throw - allows app to continue without notifications
        return null;
      }

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      const token = tokenData.data;
      this.token = token;

      // Determine platform
      const platform = Platform.OS === 'ios' ? 'IOS' : Platform.OS === 'android' ? 'ANDROID' : 'WEB';

      // Register with backend
      try {
        await apiClient.post('/notifications/register-device', {
          token,
          platform,
        });
        console.log('Device token registered successfully');
      } catch (error) {
        console.error('Failed to register device token with backend:', error);
      }

      return token;
    } catch (error) {
      console.error('Get device token error:', error);
      return null;
    }
  }

  /**
   * Unregister device token
   */
  static async unregisterDeviceToken(): Promise<void> {
    if (!this.token) return;

    try {
      await apiClient.delete('/notifications/unregister-device', {
        data: { token: this.token },
      });
      this.token = null;
    } catch (error) {
      console.error('Unregister device token error:', error);
    }
  }

  /**
   * Set up notification listeners
   */
  static setupNotificationListeners(
    onNotificationReceived?: (notification: Notifications.Notification) => void,
    onNotificationTapped?: (notification: Notifications.NotificationResponse) => void
  ): () => void {
    // Foreground notification listener
    const receivedListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
      onNotificationReceived?.(notification);
      this.listeners.forEach((listener) => listener(notification));
    });

    // Background/foreground notification tap listener
    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification tapped:', response);
      onNotificationTapped?.(response);
    });

    // Return cleanup function
    return () => {
      Notifications.removeNotificationSubscription(receivedListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }

  /**
   * Handle notification tap (deep linking)
   */
  static handleNotificationTap(
    response: Notifications.NotificationResponse,
    navigation: any
  ): void {
    const data = response.notification.request.content.data as NotificationData;

    if (!data || !data.type) {
      return;
    }

    switch (data.type) {
      case 'reminder':
        if (data.contactId) {
          navigation.navigate('ContactDetail', { id: data.contactId });
        } else if (data.eventId) {
          navigation.navigate('EventDetail', { id: data.eventId });
        } else if (data.savingsGoalId) {
          navigation.navigate('SavingsDetail', { id: data.savingsGoalId });
        }
        break;

      case 'reach_out':
        if (data.contactId) {
          navigation.navigate('ContactDetail', { id: data.contactId });
        }
        break;

      case 'event':
        if (data.eventId) {
          navigation.navigate('EventDetail', { id: data.eventId });
        }
        break;

      case 'savings':
        if (data.savingsGoalId) {
          navigation.navigate('SavingsDetail', { id: data.savingsGoalId });
        }
        break;

      case 'weekly_summary':
        navigation.navigate('Home');
        break;

      default:
        console.log('Unknown notification type:', data.type);
    }
  }

  /**
   * Schedule a local notification (for testing)
   */
  static async scheduleTestNotification(): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test Notification',
        body: 'This is a test notification from SoCap',
        data: { type: 'test' },
      },
      trigger: { seconds: 2 },
    });
  }

  /**
   * Cancel all notifications
   */
  static async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Get badge count
   */
  static async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * Set badge count
   */
  static async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }
}

export default NotificationService;
