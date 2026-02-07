import { Platform, PermissionsAndroid, Alert, AppState, AppStateStatus } from 'react-native';
import * as Contacts from 'expo-contacts';
import { apiClient } from '../config/api';
import { secureStore } from './secureStorage';

export interface CallLogEntry {
  phoneNumber: string;
  name?: string;
  type: 'incoming' | 'outgoing' | 'missed';
  date: string;
  duration: number; // in seconds
  id: string;
}

export interface AutoSyncInteraction {
  contactId?: string;
  contactPhone?: string;
  contactName?: string;
  type: 'CALL' | 'TEXT' | 'VIDEO_CALL' | 'IN_PERSON' | 'EVENT';
  date: string;
  duration?: number;
  direction?: 'incoming' | 'outgoing';
  externalId?: string;
}

export interface SyncResult {
  success: boolean;
  created: number;
  skipped: number;
  errors: string[];
}

export interface PendingCallLog {
  phoneNumber: string;
  contactName?: string;
  direction: 'incoming' | 'outgoing';
  startTime: Date;
  endTime?: Date;
}

const LAST_SYNC_KEY = 'last_call_log_sync';
const PENDING_CALL_KEY = 'pending_call_log';
const QUICK_LOG_ENABLED_KEY = 'quick_log_enabled';

class AutoSyncService {
  /**
   * Check if we have permission to read call logs (Android only)
   */
  async hasCallLogPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false; // iOS doesn't allow call log access
    }

    try {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_CALL_LOG
      );
      return granted;
    } catch (error) {
      console.error('Error checking call log permission:', error);
      return false;
    }
  }

  /**
   * Request permission to read call logs (Android only)
   */
  async requestCallLogPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
        {
          title: 'Call Log Permission',
          message:
            'SoCap needs access to your call history to automatically log interactions with your contacts.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.error('Error requesting call log permission:', error);
      return false;
    }
  }

  /**
   * Get call logs from device (Android only)
   * Note: This requires a native module - react-native-call-log or similar
   * For now, we'll provide the infrastructure and a placeholder
   */
  async getCallLogs(sinceDate?: Date): Promise<CallLogEntry[]> {
    if (Platform.OS !== 'android') {
      return [];
    }

    // Note: This would require react-native-call-log package
    // For now, return empty array - this is the infrastructure
    // To fully implement, install: npm install react-native-call-log
    
    console.log('Call log sync: Native module required for full implementation');
    return [];
  }

  /**
   * Get last sync timestamp
   */
  async getLastSyncTime(): Promise<Date | null> {
    try {
      const response = await apiClient.get<{ lastSyncTime: string | null }>('/contacts/sync/last');
      return response.data.lastSyncTime ? new Date(response.data.lastSyncTime) : null;
    } catch (error) {
      console.error('Failed to get last sync time:', error);
      // Fall back to local storage
      const localSync = await secureStore.getItem(LAST_SYNC_KEY);
      return localSync ? new Date(localSync) : null;
    }
  }

  /**
   * Sync call logs with server
   */
  async syncCallLogs(): Promise<SyncResult> {
    try {
      // Get last sync time
      const lastSync = await this.getLastSyncTime();
      
      // Get call logs since last sync
      const callLogs = await this.getCallLogs(lastSync || undefined);

      if (callLogs.length === 0) {
        return {
          success: true,
          created: 0,
          skipped: 0,
          errors: [],
        };
      }

      // Convert to interaction format
      const interactions: AutoSyncInteraction[] = callLogs.map((log) => ({
        contactPhone: log.phoneNumber,
        contactName: log.name,
        type: 'CALL' as const,
        date: log.date,
        duration: log.duration,
        direction: log.type === 'outgoing' ? 'outgoing' : 'incoming',
        externalId: log.id,
      }));

      // Send to server
      const response = await apiClient.post<SyncResult>('/contacts/sync/interactions', {
        interactions,
      });

      // Update local sync time
      await secureStore.setItem(LAST_SYNC_KEY, new Date().toISOString());

      return response.data;
    } catch (error) {
      console.error('Call log sync error:', error);
      return {
        success: false,
        created: 0,
        skipped: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Manually log an interaction
   */
  async logInteraction(
    contactId: string,
    type: AutoSyncInteraction['type'],
    date: Date,
    duration?: number,
    notes?: string
  ): Promise<boolean> {
    try {
      await apiClient.post(`/contacts/${contactId}/interactions`, {
        type,
        date: date.toISOString(),
        duration,
        notes,
        sentiment: 'NEUTRAL',
      });
      return true;
    } catch (error) {
      console.error('Failed to log interaction:', error);
      return false;
    }
  }

  /**
   * Quick log after a call ends
   */
  async quickLogCall(
    phoneNumber: string,
    duration: number,
    direction: 'incoming' | 'outgoing'
  ): Promise<SyncResult> {
    try {
      const response = await apiClient.post<SyncResult>('/contacts/sync/interactions', {
        interactions: [
          {
            contactPhone: phoneNumber,
            type: 'CALL',
            date: new Date().toISOString(),
            duration,
            direction,
            externalId: `quick-${Date.now()}`,
          },
        ],
      });
      return response.data;
    } catch (error) {
      console.error('Quick log call error:', error);
      return {
        success: false,
        created: 0,
        skipped: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Show prompt to enable auto-sync
   */
  showEnableAutoSyncPrompt(): Promise<boolean> {
    return new Promise((resolve) => {
      if (Platform.OS === 'ios') {
        Alert.alert(
          'Enable Quick Log',
          'Would you like SoCap to prompt you to log calls after they end? This helps keep your relationship health score accurate.',
          [
            {
              text: 'Not Now',
              style: 'cancel',
              onPress: () => resolve(false),
            },
            {
              text: 'Enable',
              onPress: async () => {
                await secureStore.setItem(QUICK_LOG_ENABLED_KEY, 'true');
                resolve(true);
              },
            },
          ]
        );
        return;
      }

      Alert.alert(
        'Enable Auto-Sync',
        'Would you like SoCap to automatically log your calls with contacts? This helps keep your relationship health score accurate.',
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Enable',
            onPress: async () => {
              const granted = await this.requestCallLogPermission();
              resolve(granted);
            },
          },
        ]
      );
    });
  }

  // ============ iOS-Specific Methods ============

  /**
   * Check if quick log prompts are enabled (iOS)
   */
  async isQuickLogEnabled(): Promise<boolean> {
    const enabled = await secureStore.getItem(QUICK_LOG_ENABLED_KEY);
    return enabled === 'true';
  }

  /**
   * Enable quick log prompts (iOS)
   */
  async enableQuickLog(): Promise<void> {
    await secureStore.setItem(QUICK_LOG_ENABLED_KEY, 'true');
  }

  /**
   * Disable quick log prompts (iOS)
   */
  async disableQuickLog(): Promise<void> {
    await secureStore.setItem(QUICK_LOG_ENABLED_KEY, 'false');
  }

  /**
   * Store pending call info when a call starts (iOS)
   * This is called when CallKit detects an active call
   */
  async storePendingCall(phoneNumber: string, direction: 'incoming' | 'outgoing', contactName?: string): Promise<void> {
    const pendingCall: PendingCallLog = {
      phoneNumber,
      contactName,
      direction,
      startTime: new Date(),
    };
    await secureStore.setItem(PENDING_CALL_KEY, JSON.stringify(pendingCall));
  }

  /**
   * Get and clear pending call info (iOS)
   * Called when the app returns to foreground after a call
   */
  async getPendingCall(): Promise<PendingCallLog | null> {
    const stored = await secureStore.getItem(PENDING_CALL_KEY);
    if (!stored) return null;

    try {
      const call = JSON.parse(stored) as PendingCallLog;
      // Clear the pending call
      await secureStore.deleteItem(PENDING_CALL_KEY);
      
      // Calculate approximate duration
      call.endTime = new Date();
      return call;
    } catch {
      return null;
    }
  }

  /**
   * Show quick log prompt after a call ends (iOS)
   */
  async showQuickLogPrompt(pendingCall: PendingCallLog): Promise<boolean> {
    const isEnabled = await this.isQuickLogEnabled();
    if (!isEnabled) return false;

    const duration = pendingCall.endTime 
      ? Math.floor((pendingCall.endTime.getTime() - pendingCall.startTime.getTime()) / 1000)
      : 0;

    // Don't prompt for very short calls (< 10 seconds) - likely missed/declined
    if (duration < 10) return false;

    const contactDisplay = pendingCall.contactName || pendingCall.phoneNumber;
    const durationMinutes = Math.floor(duration / 60);
    const durationText = durationMinutes > 0 
      ? `${durationMinutes} minute${durationMinutes > 1 ? 's' : ''}`
      : `${duration} seconds`;

    return new Promise((resolve) => {
      Alert.alert(
        'Log This Call?',
        `You just had a ${durationText} ${pendingCall.direction} call with ${contactDisplay}. Would you like to log it?`,
        [
          {
            text: 'Skip',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Log Call',
            onPress: async () => {
              const result = await this.quickLogCall(
                pendingCall.phoneNumber,
                duration,
                pendingCall.direction
              );
              resolve(result.created > 0);
            },
          },
        ]
      );
    });
  }

  /**
   * Check for pending calls when app comes to foreground (iOS)
   * Should be called from AppState change listener
   */
  async checkPendingCallOnForeground(): Promise<void> {
    if (Platform.OS !== 'ios') return;

    const pendingCall = await this.getPendingCall();
    if (pendingCall) {
      await this.showQuickLogPrompt(pendingCall);
    }
  }
}


export default new AutoSyncService();
