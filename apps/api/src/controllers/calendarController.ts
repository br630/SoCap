import { Response } from 'express';
import { z } from 'zod';
import { googleCalendarService } from '../services/googleCalendarService';
import { availabilityService } from '../services/availabilityService';
import { UserService } from '../services/userService';
import { EventService } from '../services/eventService';
import { AuthenticatedRequest } from '../types/express';

// Validation schemas
const findAvailabilitySchema = z.object({
  userIds: z.array(z.string().uuid()).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  minDurationMinutes: z.number().min(15).default(60),
  preferences: z.object({
    preferredTimeOfDay: z.enum(['morning', 'afternoon', 'evening']).optional(),
    preferWeekends: z.boolean().optional(),
    avoidEarlyMorning: z.boolean().optional(),
    avoidLateNight: z.boolean().optional(),
    preferredDays: z.array(z.number().min(0).max(6)).optional(),
  }).optional(),
});

const checkConflictsSchema = z.object({
  date: z.string().datetime(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
});

const syncEventSchema = z.object({
  eventId: z.string().uuid(),
});

/**
 * Helper to get local user ID from Firebase UID
 */
async function getLocalUserId(firebaseUid: string, email?: string): Promise<string> {
  const localUser = await UserService.getUserByEmail(email || '');
  if (!localUser) {
    throw new Error('User not found in local database');
  }
  return localUser.id;
}

/**
 * Get OAuth URL for Google Calendar
 * GET /calendar/auth/url
 */
export async function getAuthUrl(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const localUserId = await getLocalUserId(req.user!.uid, req.user!.email || '');
    
    const authUrl = googleCalendarService.getAuthUrl(localUserId);
    
    res.json({
      success: true,
      authUrl,
    });
  } catch (error) {
    console.error('Get auth URL error:', error);
    res.status(500).json({
      error: 'Failed to generate auth URL',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * OAuth callback handler
 * GET /calendar/auth/callback
 */
export async function handleAuthCallback(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { code, state: userId, error: oauthError } = req.query;

    if (oauthError) {
      // Redirect to app with error
      const redirectUrl = process.env.CALENDAR_AUTH_REDIRECT_SUCCESS || '/calendar/connected';
      res.redirect(`${redirectUrl}?error=${oauthError}`);
      return;
    }

    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'Missing authorization code' });
      return;
    }

    if (!userId || typeof userId !== 'string') {
      res.status(400).json({ error: 'Missing user identifier' });
      return;
    }

    await googleCalendarService.handleCallback(code, userId);

    // Redirect to success page or app
    const redirectUrl = process.env.CALENDAR_AUTH_REDIRECT_SUCCESS || '/calendar/connected';
    res.redirect(`${redirectUrl}?success=true`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    const redirectUrl = process.env.CALENDAR_AUTH_REDIRECT_SUCCESS || '/calendar/connected';
    res.redirect(`${redirectUrl}?error=auth_failed`);
  }
}

/**
 * Disconnect calendar (revoke access)
 * POST /calendar/disconnect
 */
export async function disconnectCalendar(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const localUserId = await getLocalUserId(req.user!.uid, req.user!.email || '');
    
    await googleCalendarService.revokeAccess(localUserId);

    res.json({
      success: true,
      message: 'Calendar disconnected successfully',
    });
  } catch (error) {
    console.error('Disconnect calendar error:', error);
    res.status(500).json({
      error: 'Failed to disconnect calendar',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get calendar connection status
 * GET /calendar/status
 */
export async function getConnectionStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const localUserId = await getLocalUserId(req.user!.uid, req.user!.email || '');
    
    const isConnected = await googleCalendarService.isConnected(localUserId);
    const primaryCalendarId = isConnected 
      ? await googleCalendarService.getPrimaryCalendarId(localUserId)
      : null;

    res.json({
      connected: isConnected,
      provider: isConnected ? 'google' : null,
      primaryCalendarId,
    });
  } catch (error) {
    console.error('Get connection status error:', error);
    res.status(500).json({
      error: 'Failed to get connection status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * List user's calendars
 * GET /calendar/calendars
 */
export async function listCalendars(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const localUserId = await getLocalUserId(req.user!.uid, req.user!.email || '');
    
    const calendars = await googleCalendarService.listCalendars(localUserId);

    res.json({
      success: true,
      calendars,
    });
  } catch (error) {
    console.error('List calendars error:', error);

    if (error instanceof Error && error.message.includes('not connected')) {
      res.status(401).json({
        error: 'Calendar not connected',
        message: 'Please connect your Google Calendar first',
      });
      return;
    }

    res.status(500).json({
      error: 'Failed to list calendars',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Find available time slots
 * GET /calendar/availability
 */
export async function findAvailability(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const localUserId = await getLocalUserId(req.user!.uid, req.user!.email || '');
    
    // Parse query params
    const params = findAvailabilitySchema.parse({
      userIds: req.query.userIds 
        ? (Array.isArray(req.query.userIds) ? req.query.userIds : [req.query.userIds])
        : undefined,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      minDurationMinutes: req.query.minDurationMinutes 
        ? parseInt(req.query.minDurationMinutes as string, 10) 
        : 60,
      preferences: req.query.preferences 
        ? JSON.parse(req.query.preferences as string) 
        : undefined,
    });

    // Default to current user if no userIds provided
    const userIds = params.userIds?.length ? params.userIds : [localUserId];

    const result = await availabilityService.findAvailability({
      userIds,
      startDate: new Date(params.startDate),
      endDate: new Date(params.endDate),
      minDurationMinutes: params.minDurationMinutes,
      preferences: params.preferences,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        issues: error.issues,
      });
      return;
    }

    console.error('Find availability error:', error);
    res.status(500).json({
      error: 'Failed to find availability',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Check for calendar conflicts
 * GET /calendar/conflicts
 */
export async function checkConflicts(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const localUserId = await getLocalUserId(req.user!.uid, req.user!.email || '');
    
    const params = checkConflictsSchema.parse({
      date: req.query.date,
      startTime: req.query.startTime,
      endTime: req.query.endTime,
    });

    const result = await availabilityService.getConflicts(
      localUserId,
      new Date(params.date),
      params.startTime,
      params.endTime
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        issues: error.issues,
      });
      return;
    }

    console.error('Check conflicts error:', error);
    res.status(500).json({
      error: 'Failed to check conflicts',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Sync app event to Google Calendar
 * POST /calendar/sync
 */
export async function syncEventToCalendar(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const localUserId = await getLocalUserId(req.user!.uid, req.user!.email || '');
    
    const { eventId } = syncEventSchema.parse(req.body);

    // Get the app event
    const event = await EventService.getEventById(localUserId, eventId);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    // Check if calendar is connected
    const isConnected = await googleCalendarService.isConnected(localUserId);
    if (!isConnected) {
      res.status(401).json({
        error: 'Calendar not connected',
        message: 'Please connect your Google Calendar first',
      });
      return;
    }

    // Sync to Google Calendar
    const googleEventId = await googleCalendarService.syncEventToCalendar(localUserId, {
      id: event.id,
      title: event.title,
      description: event.description || undefined,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      timezone: event.timezone,
      locationName: event.locationName || undefined,
      locationAddress: event.locationAddress || undefined,
      calendarEventId: event.calendarEventId,
    });

    res.json({
      success: true,
      googleEventId,
      message: event.calendarEventId ? 'Event updated in calendar' : 'Event added to calendar',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        issues: error.issues,
      });
      return;
    }

    console.error('Sync event error:', error);
    res.status(500).json({
      error: 'Failed to sync event',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Remove event from Google Calendar
 * DELETE /calendar/sync/:eventId
 */
export async function unsyncEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const localUserId = await getLocalUserId(req.user!.uid, req.user!.email || '');
    const { eventId } = req.params;

    // Get the app event
    const event = await EventService.getEventById(localUserId, eventId);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    if (!event.calendarEventId) {
      res.status(400).json({ error: 'Event is not synced to calendar' });
      return;
    }

    // Delete from Google Calendar
    await googleCalendarService.deleteEvent(localUserId, 'primary', event.calendarEventId);

    // Clear the calendar event ID from app event
    await EventService.updateEvent(localUserId, eventId, { calendarEventId: undefined });

    res.json({
      success: true,
      message: 'Event removed from calendar',
    });
  } catch (error) {
    console.error('Unsync event error:', error);
    res.status(500).json({
      error: 'Failed to remove event from calendar',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get calendar events (for preview/debugging)
 * GET /calendar/events
 */
export async function getCalendarEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const localUserId = await getLocalUserId(req.user!.uid, req.user!.email || '');
    
    const { calendarId = 'primary', timeMin, timeMax } = req.query;

    if (!timeMin || !timeMax) {
      res.status(400).json({ 
        error: 'Missing required parameters',
        message: 'timeMin and timeMax are required',
      });
      return;
    }

    const events = await googleCalendarService.getEvents(
      localUserId,
      calendarId as string,
      new Date(timeMin as string),
      new Date(timeMax as string)
    );

    res.json({
      success: true,
      events: events.map((e) => ({
        id: e.id,
        summary: e.summary,
        description: e.description,
        location: e.location,
        start: e.start,
        end: e.end,
        status: e.status,
      })),
      count: events.length,
    });
  } catch (error) {
    console.error('Get calendar events error:', error);

    if (error instanceof Error && error.message.includes('not connected')) {
      res.status(401).json({
        error: 'Calendar not connected',
        message: 'Please connect your Google Calendar first',
      });
      return;
    }

    res.status(500).json({
      error: 'Failed to get calendar events',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
