import { Router } from 'express';
import {
  getAuthUrl,
  handleAuthCallback,
  disconnectCalendar,
  getConnectionStatus,
  listCalendars,
  findAvailability,
  checkConflicts,
  syncEventToCalendar,
  unsyncEvent,
  getCalendarEvents,
} from '../controllers/calendarController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /calendar/auth/url
 * @desc    Get OAuth URL for Google Calendar authorization
 * @access  Private
 */
router.get('/auth/url', authMiddleware, getAuthUrl);

/**
 * @route   GET /calendar/auth/callback
 * @desc    OAuth callback handler (called by Google after user authorizes)
 * @access  Public (state parameter contains user ID)
 */
router.get('/auth/callback', handleAuthCallback);

/**
 * @route   POST /calendar/disconnect
 * @desc    Disconnect/revoke Google Calendar access
 * @access  Private
 */
router.post('/disconnect', authMiddleware, disconnectCalendar);

/**
 * @route   GET /calendar/status
 * @desc    Get calendar connection status
 * @access  Private
 */
router.get('/status', authMiddleware, getConnectionStatus);

/**
 * @route   GET /calendar/calendars
 * @desc    List user's Google Calendars
 * @access  Private
 */
router.get('/calendars', authMiddleware, listCalendars);

/**
 * @route   GET /calendar/events
 * @desc    Get calendar events for a time range
 * @query   calendarId, timeMin, timeMax
 * @access  Private
 */
router.get('/events', authMiddleware, getCalendarEvents);

/**
 * @route   GET /calendar/availability
 * @desc    Find available time slots across multiple users
 * @query   userIds[], startDate, endDate, minDurationMinutes, preferences
 * @access  Private
 */
router.get('/availability', authMiddleware, findAvailability);

/**
 * @route   GET /calendar/conflicts
 * @desc    Check for calendar conflicts for a given time
 * @query   date, startTime, endTime
 * @access  Private
 */
router.get('/conflicts', authMiddleware, checkConflicts);

/**
 * @route   POST /calendar/sync
 * @desc    Sync an app event to Google Calendar
 * @body    { eventId: string }
 * @access  Private
 */
router.post('/sync', authMiddleware, syncEventToCalendar);

/**
 * @route   DELETE /calendar/sync/:eventId
 * @desc    Remove an event from Google Calendar (unsync)
 * @access  Private
 */
router.delete('/sync/:eventId', authMiddleware, unsyncEvent);

export default router;
