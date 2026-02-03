import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../lib/prisma';
import { encrypt, decrypt } from '../utils/encryption';

// Google Calendar API scopes
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
];

// Types
export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  attendees?: Array<{ email: string; displayName?: string }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{ method: string; minutes: number }>;
  };
}

export interface CalendarInfo {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  backgroundColor?: string;
  accessRole?: string;
}

export interface BusyTime {
  start: string;
  end: string;
}

export interface CalendarCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

/**
 * Google Calendar Service
 * Handles OAuth flow and calendar operations
 */
export class GoogleCalendarService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    this.redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI || 'http://localhost:3000/api/calendar/auth/callback';

    if (!this.clientId || !this.clientSecret) {
      console.warn('⚠️  Google Calendar credentials not configured');
    }
  }

  /**
   * Create OAuth2 client
   */
  private createOAuth2Client(): OAuth2Client {
    return new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      this.redirectUri
    );
  }

  /**
   * Create authenticated OAuth2 client for a user
   */
  private async getAuthenticatedClient(userId: string): Promise<OAuth2Client> {
    const credentials = await this.getStoredCredentials(userId);
    if (!credentials) {
      throw new Error('Calendar not connected. Please authenticate first.');
    }

    const oauth2Client = this.createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken,
      expiry_date: credentials.expiresAt.getTime(),
    });

    // Check if token needs refresh
    if (credentials.expiresAt.getTime() < Date.now() + 60000) {
      await this.refreshToken(userId);
      const newCredentials = await this.getStoredCredentials(userId);
      if (newCredentials) {
        oauth2Client.setCredentials({
          access_token: newCredentials.accessToken,
          refresh_token: newCredentials.refreshToken,
          expiry_date: newCredentials.expiresAt.getTime(),
        });
      }
    }

    return oauth2Client;
  }

  // ==================== OAuth Methods ====================

  /**
   * Generate OAuth consent URL
   */
  getAuthUrl(userId: string): string {
    const oauth2Client = this.createOAuth2Client();
    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
      state: userId, // Pass userId to identify user in callback
    });

    return authUrl;
  }

  /**
   * Handle OAuth callback - exchange code for tokens
   */
  async handleCallback(code: string, userId: string): Promise<void> {
    const oauth2Client = this.createOAuth2Client();

    try {
      const { tokens } = await oauth2Client.getToken(code);

      if (!tokens.access_token || !tokens.refresh_token) {
        throw new Error('Failed to obtain tokens');
      }

      // Get primary calendar ID
      oauth2Client.setCredentials(tokens);
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const calendarList = await calendar.calendarList.list();
      const primaryCalendar = calendarList.data.items?.find((cal) => cal.primary);

      // Encrypt and store credentials
      const encryptedAccessToken = encrypt(tokens.access_token);
      const encryptedRefreshToken = encrypt(tokens.refresh_token);

      await prisma.calendarCredential.upsert({
        where: { userId },
        update: {
          accessTokenEncrypted: encryptedAccessToken,
          refreshTokenEncrypted: encryptedRefreshToken,
          tokenExpiresAt: new Date(tokens.expiry_date || Date.now() + 3600000),
          scope: tokens.scope,
          primaryCalendarId: primaryCalendar?.id,
          isActive: true,
          updatedAt: new Date(),
        },
        create: {
          userId,
          accessTokenEncrypted: encryptedAccessToken,
          refreshTokenEncrypted: encryptedRefreshToken,
          tokenExpiresAt: new Date(tokens.expiry_date || Date.now() + 3600000),
          scope: tokens.scope,
          primaryCalendarId: primaryCalendar?.id,
          isActive: true,
        },
      });
    } catch (error) {
      console.error('OAuth callback error:', error);
      throw new Error(`Failed to complete OAuth flow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(userId: string): Promise<void> {
    const credentials = await this.getStoredCredentials(userId);
    if (!credentials?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const oauth2Client = this.createOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: credentials.refreshToken,
    });

    try {
      const { credentials: newTokens } = await oauth2Client.refreshAccessToken();

      if (!newTokens.access_token) {
        throw new Error('Failed to refresh token');
      }

      const encryptedAccessToken = encrypt(newTokens.access_token);

      await prisma.calendarCredential.update({
        where: { userId },
        data: {
          accessTokenEncrypted: encryptedAccessToken,
          tokenExpiresAt: new Date(newTokens.expiry_date || Date.now() + 3600000),
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      // Mark credentials as inactive if refresh fails
      await prisma.calendarCredential.update({
        where: { userId },
        data: { isActive: false },
      });
      throw new Error('Failed to refresh token. Please re-authenticate.');
    }
  }

  /**
   * Revoke calendar access
   */
  async revokeAccess(userId: string): Promise<void> {
    const credentials = await this.getStoredCredentials(userId);
    
    if (credentials?.accessToken) {
      try {
        const oauth2Client = this.createOAuth2Client();
        await oauth2Client.revokeToken(credentials.accessToken);
      } catch (error) {
        console.error('Token revocation error:', error);
        // Continue with deletion even if revocation fails
      }
    }

    // Delete credentials from database
    await prisma.calendarCredential.delete({
      where: { userId },
    }).catch(() => {
      // Ignore if credentials don't exist
    });
  }

  /**
   * Get stored credentials for a user
   */
  private async getStoredCredentials(userId: string): Promise<CalendarCredentials | null> {
    const credential = await prisma.calendarCredential.findUnique({
      where: { userId },
    });

    if (!credential || !credential.isActive) {
      return null;
    }

    const accessToken = decrypt(credential.accessTokenEncrypted);
    const refreshToken = decrypt(credential.refreshTokenEncrypted);

    if (!accessToken || !refreshToken) {
      return null;
    }

    return {
      accessToken,
      refreshToken,
      expiresAt: credential.tokenExpiresAt,
    };
  }

  /**
   * Check if user has connected calendar
   */
  async isConnected(userId: string): Promise<boolean> {
    const credential = await prisma.calendarCredential.findUnique({
      where: { userId },
      select: { isActive: true },
    });
    return credential?.isActive || false;
  }

  // ==================== Calendar Operations ====================

  /**
   * List user's calendars
   */
  async listCalendars(userId: string): Promise<CalendarInfo[]> {
    const auth = await this.getAuthenticatedClient(userId);
    const calendar = google.calendar({ version: 'v3', auth });

    try {
      const response = await calendar.calendarList.list();
      
      return (response.data.items || []).map((cal) => ({
        id: cal.id || '',
        summary: cal.summary || 'Untitled',
        description: cal.description || undefined,
        primary: cal.primary || false,
        backgroundColor: cal.backgroundColor || undefined,
        accessRole: cal.accessRole || undefined,
      }));
    } catch (error) {
      console.error('List calendars error:', error);
      throw new Error(`Failed to list calendars: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get events from a calendar
   */
  async getEvents(
    userId: string,
    calendarId: string = 'primary',
    timeMin: Date,
    timeMax: Date
  ): Promise<calendar_v3.Schema$Event[]> {
    const auth = await this.getAuthenticatedClient(userId);
    const calendar = google.calendar({ version: 'v3', auth });

    try {
      const response = await calendar.events.list({
        calendarId,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Get events error:', error);
      throw new Error(`Failed to get events: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get busy times (free/busy query)
   */
  async getBusyTimes(
    userId: string,
    calendarIds: string[],
    timeMin: Date,
    timeMax: Date
  ): Promise<Record<string, BusyTime[]>> {
    const auth = await this.getAuthenticatedClient(userId);
    const calendar = google.calendar({ version: 'v3', auth });

    try {
      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          items: calendarIds.map((id) => ({ id })),
        },
      });

      const busyTimes: Record<string, BusyTime[]> = {};
      
      if (response.data.calendars) {
        for (const [calId, calData] of Object.entries(response.data.calendars)) {
          busyTimes[calId] = (calData.busy || []).map((slot) => ({
            start: slot.start || '',
            end: slot.end || '',
          }));
        }
      }

      return busyTimes;
    } catch (error) {
      console.error('Get busy times error:', error);
      throw new Error(`Failed to get busy times: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a calendar event
   */
  async createEvent(
    userId: string,
    calendarId: string = 'primary',
    event: CalendarEvent
  ): Promise<calendar_v3.Schema$Event> {
    const auth = await this.getAuthenticatedClient(userId);
    const calendar = google.calendar({ version: 'v3', auth });

    try {
      const response = await calendar.events.insert({
        calendarId,
        requestBody: {
          summary: event.summary,
          description: event.description,
          location: event.location,
          start: event.start,
          end: event.end,
          attendees: event.attendees,
          reminders: event.reminders,
        },
      });

      // Update sync timestamp
      await prisma.calendarCredential.update({
        where: { userId },
        data: { lastSyncAt: new Date() },
      });

      return response.data;
    } catch (error) {
      console.error('Create event error:', error);
      throw new Error(`Failed to create event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update a calendar event
   */
  async updateEvent(
    userId: string,
    calendarId: string = 'primary',
    eventId: string,
    event: Partial<CalendarEvent>
  ): Promise<calendar_v3.Schema$Event> {
    const auth = await this.getAuthenticatedClient(userId);
    const calendar = google.calendar({ version: 'v3', auth });

    try {
      const response = await calendar.events.patch({
        calendarId,
        eventId,
        requestBody: {
          ...(event.summary && { summary: event.summary }),
          ...(event.description !== undefined && { description: event.description }),
          ...(event.location !== undefined && { location: event.location }),
          ...(event.start && { start: event.start }),
          ...(event.end && { end: event.end }),
          ...(event.attendees && { attendees: event.attendees }),
          ...(event.reminders && { reminders: event.reminders }),
        },
      });

      // Update sync timestamp
      await prisma.calendarCredential.update({
        where: { userId },
        data: { lastSyncAt: new Date() },
      });

      return response.data;
    } catch (error) {
      console.error('Update event error:', error);
      throw new Error(`Failed to update event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(
    userId: string,
    calendarId: string = 'primary',
    eventId: string
  ): Promise<void> {
    const auth = await this.getAuthenticatedClient(userId);
    const calendar = google.calendar({ version: 'v3', auth });

    try {
      await calendar.events.delete({
        calendarId,
        eventId,
      });

      // Update sync timestamp
      await prisma.calendarCredential.update({
        where: { userId },
        data: { lastSyncAt: new Date() },
      });
    } catch (error) {
      console.error('Delete event error:', error);
      throw new Error(`Failed to delete event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sync an app event to Google Calendar
   */
  async syncEventToCalendar(
    userId: string,
    appEvent: {
      id: string;
      title: string;
      description?: string;
      date: Date;
      startTime: string;
      endTime: string;
      timezone: string;
      locationName?: string;
      locationAddress?: string;
      calendarEventId?: string | null;
    }
  ): Promise<string> {
    // Build datetime strings
    const dateStr = appEvent.date.toISOString().split('T')[0];
    const startDateTime = `${dateStr}T${appEvent.startTime}:00`;
    const endDateTime = `${dateStr}T${appEvent.endTime}:00`;

    const calendarEvent: CalendarEvent = {
      summary: appEvent.title,
      description: appEvent.description,
      location: appEvent.locationAddress || appEvent.locationName,
      start: {
        dateTime: startDateTime,
        timeZone: appEvent.timezone,
      },
      end: {
        dateTime: endDateTime,
        timeZone: appEvent.timezone,
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 60 },
          { method: 'popup', minutes: 1440 }, // 1 day
        ],
      },
    };

    let googleEventId: string;

    if (appEvent.calendarEventId) {
      // Update existing event
      const updated = await this.updateEvent(userId, 'primary', appEvent.calendarEventId, calendarEvent);
      googleEventId = updated.id || appEvent.calendarEventId;
    } else {
      // Create new event
      const created = await this.createEvent(userId, 'primary', calendarEvent);
      googleEventId = created.id || '';
    }

    // Update app event with Google Calendar event ID
    await prisma.event.update({
      where: { id: appEvent.id },
      data: { calendarEventId: googleEventId },
    });

    return googleEventId;
  }

  /**
   * Get primary calendar ID for a user
   */
  async getPrimaryCalendarId(userId: string): Promise<string | null> {
    const credential = await prisma.calendarCredential.findUnique({
      where: { userId },
      select: { primaryCalendarId: true },
    });
    return credential?.primaryCalendarId || null;
  }
}

// Export singleton instance
export const googleCalendarService = new GoogleCalendarService();
