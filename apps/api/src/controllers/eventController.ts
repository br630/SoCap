import { Response } from 'express';
import { z } from 'zod';
import { 
  EventService, 
  CreateEventData, 
  UpdateEventData,
  UpdateRSVPData,
} from '../services/eventService';
import { NotificationService } from '../services/notificationService';
import { UserService } from '../services/userService';
import { sendEventCancellationEmails } from '../services/emailService';
import { AuthenticatedRequest } from '../types/express';
import { BudgetTier, EventStatus, RSVPStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getEventTemplates, getTemplateById, getTemplatesByCategory, getTemplateCategories } from '../config/eventTemplates';

// Validation schemas
const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  eventType: z.string().min(1, 'Event type is required'),
  // Accept both ISO datetime and simple date strings (YYYY-MM-DD)
  date: z.string().refine((val) => {
    // Allow ISO datetime or simple date format
    return !isNaN(Date.parse(val));
  }, { message: 'Invalid date format' }),
  startTime: z.string(),
  endTime: z.string(),
  timezone: z.string().default('UTC'),
  locationName: z.string().optional(),
  locationAddress: z.string().optional(),
  locationPlaceId: z.string().optional(),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),
  estimatedCost: z.number().min(0).default(0),
  actualCost: z.number().min(0).optional(),
  budgetTier: z.nativeEnum(BudgetTier).default('BUDGET'),
  status: z.nativeEnum(EventStatus).optional(),
  isRecurring: z.boolean().optional(),
  recurringPattern: z.any().optional(),
  linkedSavingsGoalId: z.string().uuid().optional(),
  calendarEventId: z.string().optional(),
  createSavingsGoal: z.boolean().optional(),
  savingsGoalName: z.string().optional(),
  isAllDay: z.boolean().optional(),
  attendeeIds: z.array(z.string()).optional(),
});

const updateEventSchema = createEventSchema.partial().extend({
  updateFutureOccurrences: z.boolean().optional(),
});

const addAttendeesSchema = z.object({
  contactIds: z.array(z.string().uuid()).min(1, 'At least one contact ID is required'),
});

const updateRSVPSchema = z.object({
  status: z.nativeEnum(RSVPStatus),
  plusOnes: z.number().min(0).optional(),
  dietaryRestrictions: z.string().optional(),
});

const searchVenuesSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  location: z.string().optional(),
  type: z.string().optional(),
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
 * Get all events for the authenticated user
 * GET /events
 * Query: status, startDate, endDate, page, limit, view (list|calendar), year, month
 */
export async function getEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const localUserId = await getLocalUserId(req.user!.uid, req.user!.email || '');
    const { page, limit, status, eventType, dateFrom, dateTo, view, year, month } = req.query;

    // Handle calendar view by month
    if (view === 'calendar' && year && month) {
      const events = await EventService.getEventsByMonth(
        localUserId,
        parseInt(year as string, 10),
        parseInt(month as string, 10)
      );
      res.json({ data: events });
      return;
    }

    // Normalize dateFrom to start of day so today's events aren't filtered out
    let normalizedDateFrom: Date | undefined;
    if (dateFrom) {
      normalizedDateFrom = new Date(dateFrom as string);
      normalizedDateFrom.setHours(0, 0, 0, 0);
    }

    const filters = {
      ...(status && { status: status as EventStatus }),
      ...(eventType && { eventType: eventType as string }),
      ...(normalizedDateFrom && { dateFrom: normalizedDateFrom }),
      ...(dateTo && { dateTo: new Date(dateTo as string) }),
    };

    const pagination = {
      ...(page && { page: parseInt(page as string, 10) }),
      ...(limit && { limit: parseInt(limit as string, 10) }),
    };

    const result = await EventService.getEvents(
      localUserId, 
      filters, 
      pagination,
      (view as 'list' | 'calendar') || 'list'
    );
    res.json(result);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      error: 'Failed to get events',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get a single event by ID with full attendee list and details
 * GET /events/:id
 */
export async function getEventById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const localUserId = await getLocalUserId(req.user!.uid, req.user!.email || '');
    const { id } = req.params;

    const event = await EventService.getEventById(localUserId, id);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    res.json(event);
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      error: 'Failed to get event',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get events where a contact is an attendee
 * GET /events/contact/:contactId
 */
export async function getEventsByContact(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const localUserId = await getLocalUserId(req.user!.uid, req.user!.email || '');
    const { contactId } = req.params;

    const events = await EventService.getEventsByContact(localUserId, contactId);
    res.json({ data: events });
  } catch (error) {
    console.error('Get events by contact error:', error);
    res.status(500).json({
      error: 'Failed to get events for contact',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Create a new event
 * POST /events
 * Optionally creates linked savings goal
 */
export async function createEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const localUserId = await getLocalUserId(req.user!.uid, req.user!.email || '');
    const validated = createEventSchema.parse(req.body);

    const data: CreateEventData = {
      title: validated.title,
      description: validated.description,
      eventType: validated.eventType,
      date: new Date(validated.date),
      startTime: validated.startTime,
      endTime: validated.endTime,
      timezone: validated.timezone,
      locationName: validated.locationName,
      locationAddress: validated.locationAddress,
      locationPlaceId: validated.locationPlaceId,
      locationLat: validated.locationLat,
      locationLng: validated.locationLng,
      estimatedCost: validated.estimatedCost,
      actualCost: validated.actualCost,
      budgetTier: validated.budgetTier,
      status: validated.status,
      isRecurring: validated.isRecurring,
      recurringPattern: validated.recurringPattern,
      linkedSavingsGoalId: validated.linkedSavingsGoalId,
      calendarEventId: validated.calendarEventId,
      createSavingsGoal: validated.createSavingsGoal,
      savingsGoalName: validated.savingsGoalName,
    };

    const event = await EventService.createEvent(localUserId, data);
    res.status(201).json(event);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        issues: error.issues,
      });
      return;
    }

    console.error('Create event error:', error);
    res.status(500).json({
      error: 'Failed to create event',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Update an event
 * PUT /events/:id
 * Handles recurring event updates
 */
export async function updateEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const localUserId = await getLocalUserId(req.user!.uid, req.user!.email || '');
    const { id } = req.params;
    const validated = updateEventSchema.parse(req.body);

    const data: UpdateEventData = {
      ...(validated.title && { title: validated.title }),
      ...(validated.description !== undefined && { description: validated.description }),
      ...(validated.eventType && { eventType: validated.eventType }),
      ...(validated.date && { date: new Date(validated.date) }),
      ...(validated.startTime && { startTime: validated.startTime }),
      ...(validated.endTime && { endTime: validated.endTime }),
      ...(validated.timezone && { timezone: validated.timezone }),
      ...(validated.locationName !== undefined && { locationName: validated.locationName }),
      ...(validated.locationAddress !== undefined && { locationAddress: validated.locationAddress }),
      ...(validated.locationPlaceId !== undefined && { locationPlaceId: validated.locationPlaceId }),
      ...(validated.locationLat !== undefined && { locationLat: validated.locationLat }),
      ...(validated.locationLng !== undefined && { locationLng: validated.locationLng }),
      ...(validated.estimatedCost !== undefined && { estimatedCost: validated.estimatedCost }),
      ...(validated.actualCost !== undefined && { actualCost: validated.actualCost }),
      ...(validated.budgetTier && { budgetTier: validated.budgetTier }),
      ...(validated.status && { status: validated.status }),
      ...(validated.isRecurring !== undefined && { isRecurring: validated.isRecurring }),
      ...(validated.recurringPattern !== undefined && { recurringPattern: validated.recurringPattern }),
      ...(validated.linkedSavingsGoalId !== undefined && { linkedSavingsGoalId: validated.linkedSavingsGoalId }),
      ...(validated.calendarEventId !== undefined && { calendarEventId: validated.calendarEventId }),
      ...(validated.updateFutureOccurrences !== undefined && { updateFutureOccurrences: validated.updateFutureOccurrences }),
    };

    const event = await EventService.updateEvent(localUserId, id, data);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    res.json(event);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        issues: error.issues,
      });
      return;
    }

    if (error instanceof Error && error.message === 'Event not found') {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    console.error('Update event error:', error);
    res.status(500).json({
      error: 'Failed to update event',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Cancel an event
 * DELETE /events/:id
 * Sets status to CANCELLED and sends notifications to attendees
 */
export async function cancelEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const localUserId = await getLocalUserId(req.user!.uid, req.user!.email || '');
    const { id } = req.params;

    const { event, attendeeUserIds } = await EventService.cancelEvent(localUserId, id);

    // Get organizer name for emails
    const organizer = await prisma.user.findUnique({
      where: { id: localUserId },
      select: { firstName: true, lastName: true },
    });
    const organizerName = organizer
      ? `${organizer.firstName} ${organizer.lastName}`
      : 'The organizer';

    // Send push notifications to attendees
    if (attendeeUserIds.length > 0) {
      for (const userId of attendeeUserIds) {
        try {
          await NotificationService.sendPushNotification(
            userId,
            'Event Cancelled',
            `The event "${event.title}" has been cancelled.`,
            { eventId: event.id, type: 'event_cancelled' }
          );
        } catch (notifError) {
          console.error(`Failed to send notification to user ${userId}:`, notifError);
        }
      }
    }

    // Send cancellation emails to all attendees with email addresses
    const attendeesForEmail = (event.attendees || []).map((a: any) => ({
      name: a.contact?.name || 'Guest',
      email: a.contact?.email || null,
    }));

    let emailResult = { sent: 0, failed: 0 };
    if (attendeesForEmail.length > 0) {
      try {
        emailResult = await sendEventCancellationEmails(
          event.title,
          event.date,
          organizerName,
          attendeesForEmail
        );
      } catch (emailError) {
        console.error('Failed to send cancellation emails:', emailError);
      }
    }

    res.json({
      success: true,
      message: 'Event cancelled successfully',
      event,
      notificationsSent: attendeeUserIds.length,
      emailsSent: emailResult.sent,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Event not found') {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    console.error('Cancel event error:', error);
    res.status(500).json({
      error: 'Failed to cancel event',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Delete an event permanently (alias for cancelEvent for backward compatibility)
 * DELETE /events/:id with force=true query param for permanent delete
 */
export async function deleteEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const localUserId = await getLocalUserId(req.user!.uid, req.user!.email || '');
    const { id } = req.params;
    const { force } = req.query;

    if (force === 'true') {
      await EventService.deleteEvent(localUserId, id);
      res.status(204).send();
    } else {
      // Default to cancel behavior
      await cancelEvent(req, res);
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Event not found') {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    console.error('Delete event error:', error);
    res.status(500).json({
      error: 'Failed to delete event',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Add attendees to an event
 * POST /events/:id/attendees
 * Body: { contactIds: string[] }
 */
export async function addAttendees(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const localUserId = await getLocalUserId(req.user!.uid, req.user!.email || '');
    const { id: eventId } = req.params;
    const validated = addAttendeesSchema.parse(req.body);

    const attendees = await EventService.addAttendees(localUserId, eventId, validated.contactIds);

    res.status(201).json({
      success: true,
      attendees,
      added: validated.contactIds.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        issues: error.issues,
      });
      return;
    }

    if (error instanceof Error && (error.message === 'Event not found' || error.message === 'One or more contacts not found')) {
      res.status(404).json({ error: error.message });
      return;
    }

    console.error('Add attendees error:', error);
    res.status(500).json({
      error: 'Failed to add attendees',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Remove an attendee from an event
 * DELETE /events/:id/attendees/:attendeeId
 */
export async function removeAttendee(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const localUserId = await getLocalUserId(req.user!.uid, req.user!.email || '');
    const { id: eventId, attendeeId } = req.params;

    await EventService.removeAttendee(localUserId, eventId, attendeeId);

    res.json({
      success: true,
      message: 'Attendee removed successfully',
    });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Event not found' || error.message === 'Attendee not found')) {
      res.status(404).json({ error: error.message });
      return;
    }

    console.error('Remove attendee error:', error);
    res.status(500).json({
      error: 'Failed to remove attendee',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Update an attendee's RSVP
 * PUT /events/:id/attendees/:attendeeId/rsvp
 * Body: { status, plusOnes?, dietaryRestrictions? }
 */
export async function updateRSVP(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const localUserId = await getLocalUserId(req.user!.uid, req.user!.email || '');
    const { id: eventId, attendeeId } = req.params;
    const validated = updateRSVPSchema.parse(req.body);

    const data: UpdateRSVPData = {
      status: validated.status,
      plusOnes: validated.plusOnes,
      dietaryRestrictions: validated.dietaryRestrictions,
    };

    const attendee = await EventService.updateRSVP(localUserId, eventId, attendeeId, data);

    res.json({
      success: true,
      attendee,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        issues: error.issues,
      });
      return;
    }

    if (error instanceof Error && (error.message === 'Event not found' || error.message === 'Attendee not found')) {
      res.status(404).json({ error: error.message });
      return;
    }

    console.error('Update RSVP error:', error);
    res.status(500).json({
      error: 'Failed to update RSVP',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get pre-defined event templates
 * GET /events/templates
 * Query: category (optional)
 */
export async function getEventTemplatesHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { category, id } = req.query;

    // Get specific template by ID
    if (id) {
      const template = getTemplateById(id as string);
      if (!template) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }
      res.json(template);
      return;
    }

    // Get templates by category
    if (category) {
      const templates = getTemplatesByCategory(category as string);
      res.json({
        category,
        templates,
      });
      return;
    }

    // Get all templates grouped by category
    const categories = getTemplateCategories();
    const templates = getEventTemplates();
    
    const grouped = categories.reduce((acc, cat) => {
      acc[cat] = templates.filter((t) => t.category === cat);
      return acc;
    }, {} as Record<string, typeof templates>);

    res.json({
      categories,
      templates: grouped,
      all: templates,
    });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({
      error: 'Failed to get event templates',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Search for venues using Google Places API
 * GET /events/venues/search
 * Query: query, location, type
 */
export async function searchVenues(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const validated = searchVenuesSchema.parse(req.query);

    const venues = await EventService.searchVenues({
      query: validated.query,
      location: validated.location,
      type: validated.type,
    });

    res.json({
      success: true,
      venues,
      count: venues.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        issues: error.issues,
      });
      return;
    }

    console.error('Search venues error:', error);
    res.status(500).json({
      error: 'Failed to search venues',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Send RSVP reminders to attendees who haven't responded
 * POST /events/:id/send-rsvp-reminders
 */
export async function sendRSVPReminders(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const localUserId = await getLocalUserId(req.user!.uid, req.user!.email || '');
    const { id: eventId } = req.params;

    const reminderCount = await EventService.sendRSVPReminders(eventId, localUserId);

    res.json({
      success: true,
      message: `Sent ${reminderCount} RSVP reminder(s)`,
      reminderCount,
    });
  } catch (error) {
    console.error('Send RSVP reminders error:', error);
    res.status(500).json({
      error: 'Failed to send RSVP reminders',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
