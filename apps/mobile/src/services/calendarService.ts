import { apiClient } from '../config/api';
import * as Calendar from 'expo-calendar';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

// Complete the auth session
WebBrowser.maybeCompleteAuthSession();

// Types
export interface CalendarInfo {
  id: string;
  title: string;
  type: 'google' | 'device';
  source?: string;
  color?: string;
  allowsModifications?: boolean;
}

export interface AvailabilitySlot {
  start: string;
  end: string;
  duration: number; // in minutes
  score?: number; // convenience score (0-100)
}

export interface AvailabilityParams {
  userIds: string[];
  dateRange: {
    start: Date;
    end: Date;
  };
  minDuration: number; // minutes
  preferences?: {
    preferAfternoon?: boolean;
    avoidEarlyMorning?: boolean;
    preferWeekdays?: boolean;
  };
}

export interface Conflict {
  eventId: string;
  title: string;
  start: string;
  end: string;
  calendarId?: string;
}

export interface CalendarConnectionStatus {
  connected: boolean;
  provider?: 'google' | 'device';
  lastSyncAt?: string;
  primaryCalendarId?: string;
}

/**
 * Calendar Service
 * Handles Google Calendar OAuth and device calendar operations
 */
class CalendarService {
  private discovery: AuthSession.DiscoveryDocument | null = null;

  constructor() {
    // Initialize Google OAuth discovery document
    this.initDiscovery();
  }

  private async initDiscovery() {
    try {
      this.discovery = await AuthSession.fetchDiscoveryAsync(
        'https://accounts.google.com'
      );
    } catch (error) {
      console.error('Failed to fetch Google discovery document:', error);
    }
  }

  // ==================== Google Calendar OAuth ====================

  /**
   * Initiate Google Calendar OAuth flow
   */
  async connectGoogleCalendar(): Promise<void> {
    try {
      // Get OAuth URL from backend
      const response = await apiClient.get('/calendar/auth/url');
      const { authUrl } = response.data;

      // Open OAuth URL in browser
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        'socap://calendar-auth'
      );

      if (result.type === 'success' && result.url) {
        // Extract code from callback URL
        const url = new URL(result.url);
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state'); // userId

        if (!code) {
          throw new Error('No authorization code received');
        }

        // Backend handles the callback automatically
        // Just verify connection status
        await this.getConnectionStatus();
      } else {
        throw new Error('OAuth flow cancelled or failed');
      }
    } catch (error) {
      console.error('Google Calendar connection error:', error);
      throw error;
    }
  }

  /**
   * Disconnect Google Calendar
   */
  async disconnectCalendar(): Promise<void> {
    try {
      await apiClient.post('/calendar/disconnect');
    } catch (error) {
      console.error('Disconnect calendar error:', error);
      throw error;
    }
  }

  /**
   * Get calendar connection status
   */
  async getConnectionStatus(): Promise<CalendarConnectionStatus> {
    try {
      const response = await apiClient.get('/calendar/status');
      return response.data;
    } catch (error) {
      console.error('Get connection status error:', error);
      return { connected: false };
    }
  }

  /**
   * List user's calendars
   */
  async listCalendars(): Promise<CalendarInfo[]> {
    try {
      const response = await apiClient.get('/calendar/calendars');
      return response.data.map((cal: any) => ({
        id: cal.id,
        title: cal.summary,
        type: 'google' as const,
        color: cal.backgroundColor,
      }));
    } catch (error) {
      console.error('List calendars error:', error);
      throw error;
    }
  }

  /**
   * Get availability for multiple users
   */
  async getAvailability(params: AvailabilityParams): Promise<AvailabilitySlot[]> {
    try {
      const response = await apiClient.get('/calendar/availability', {
        params: {
          userIds: params.userIds.join(','),
          startDate: params.dateRange.start.toISOString(),
          endDate: params.dateRange.end.toISOString(),
          minDuration: params.minDuration,
          preferAfternoon: params.preferences?.preferAfternoon,
          avoidEarlyMorning: params.preferences?.avoidEarlyMorning,
          preferWeekdays: params.preferences?.preferWeekdays,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Get availability error:', error);
      throw error;
    }
  }

  /**
   * Check for conflicts
   */
  async getConflicts(
    userId: string,
    date: Date,
    startTime: string,
    endTime: string
  ): Promise<Conflict[]> {
    try {
      const dateStr = date.toISOString().split('T')[0];
      const response = await apiClient.get('/calendar/conflicts', {
        params: {
          userId,
          date: dateStr,
          startTime,
          endTime,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Get conflicts error:', error);
      return [];
    }
  }

  /**
   * Sync app event to Google Calendar
   */
  async syncEventToCalendar(eventId: string): Promise<string> {
    try {
      const response = await apiClient.post('/calendar/sync', { eventId });
      return response.data.calendarEventId;
    } catch (error) {
      console.error('Sync event error:', error);
      throw error;
    }
  }

  /**
   * Unsync event from Google Calendar
   */
  async unsyncEventFromCalendar(eventId: string): Promise<void> {
    try {
      await apiClient.delete(`/calendar/sync/${eventId}`);
    } catch (error) {
      console.error('Unsync event error:', error);
      throw error;
    }
  }

  // ==================== Device Calendar (Expo Calendar) ====================

  /**
   * Request calendar permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Request permissions error:', error);
      return false;
    }
  }

  /**
   * Check if calendar permissions are granted
   */
  async hasPermissions(): Promise<boolean> {
    try {
      const { status } = await Calendar.getCalendarPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      return false;
    }
  }

  /**
   * Get device calendars
   */
  async getDeviceCalendars(): Promise<CalendarInfo[]> {
    try {
      const hasPermission = await this.hasPermissions();
      if (!hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) {
          throw new Error('Calendar permissions not granted');
        }
      }

      const calendars = await Calendar.getCalendarsAsync(
        Calendar.EntityTypes.EVENT
      );

      return calendars.map((cal) => ({
        id: cal.id,
        title: cal.title,
        type: 'device' as const,
        source: cal.source?.name,
        color: cal.color,
        allowsModifications: cal.allowsModifications,
      }));
    } catch (error) {
      console.error('Get device calendars error:', error);
      throw error;
    }
  }

  /**
   * Get events from device calendar
   */
  async getDeviceEvents(
    calendarId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    try {
      const hasPermission = await this.hasPermissions();
      if (!hasPermission) {
        throw new Error('Calendar permissions not granted');
      }

      const events = await Calendar.getEventsAsync(
        [calendarId],
        startDate,
        endDate
      );

      return events;
    } catch (error) {
      console.error('Get device events error:', error);
      throw error;
    }
  }

  /**
   * Create event in device calendar
   */
  async createDeviceEvent(
    calendarId: string,
    event: {
      title: string;
      startDate: Date;
      endDate: Date;
      location?: string;
      notes?: string;
      alarms?: Array<{ relativeOffset: number; method: Calendar.AlarmMethod }>;
    }
  ): Promise<string> {
    try {
      const hasPermission = await this.hasPermissions();
      if (!hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) {
          throw new Error('Calendar permissions not granted');
        }
      }

      const eventId = await Calendar.createEventAsync(calendarId, {
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        notes: event.notes,
        alarms: event.alarms || [
          { relativeOffset: -60, method: Calendar.AlarmMethod.ALERT }, // 1 hour before
        ],
      });

      return eventId;
    } catch (error) {
      console.error('Create device event error:', error);
      throw error;
    }
  }

  /**
   * Update event in device calendar
   */
  async updateDeviceEvent(
    calendarId: string,
    eventId: string,
    updates: {
      title?: string;
      startDate?: Date;
      endDate?: Date;
      location?: string;
      notes?: string;
    }
  ): Promise<void> {
    try {
      await Calendar.updateEventAsync(eventId, updates);
    } catch (error) {
      console.error('Update device event error:', error);
      throw error;
    }
  }

  /**
   * Delete event from device calendar
   */
  async deleteDeviceEvent(eventId: string): Promise<void> {
    try {
      await Calendar.deleteEventAsync(eventId);
    } catch (error) {
      console.error('Delete device event error:', error);
      throw error;
    }
  }

  /**
   * Check for conflicts in device calendar
   */
  async getDeviceConflicts(
    calendarId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Conflict[]> {
    try {
      const events = await this.getDeviceEvents(calendarId, startDate, endDate);
      return events.map((event) => ({
        eventId: event.id,
        title: event.title || 'Untitled Event',
        start: event.startDate.toISOString(),
        end: event.endDate.toISOString(),
        calendarId,
      }));
    } catch (error) {
      console.error('Get device conflicts error:', error);
      return [];
    }
  }
}

export default new CalendarService();
