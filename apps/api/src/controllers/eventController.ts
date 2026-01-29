import { Response } from 'express';
import { z } from 'zod';
import { EventService, CreateEventData, UpdateEventData } from '../services/eventService';
import { AuthenticatedRequest } from '../types/express';
import { BudgetTier, EventStatus } from '@prisma/client';

// Validation schemas
const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  eventType: z.string().min(1, 'Event type is required'),
  date: z.string().datetime(),
  startTime: z.string(),
  endTime: z.string(),
  timezone: z.string().default('UTC'),
  locationName: z.string().optional(),
  locationAddress: z.string().optional(),
  locationPlaceId: z.string().optional(),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),
  estimatedCost: z.number().min(0),
  actualCost: z.number().min(0).optional(),
  budgetTier: z.nativeEnum(BudgetTier),
  status: z.nativeEnum(EventStatus).optional(),
  isRecurring: z.boolean().optional(),
  linkedSavingsGoalId: z.string().uuid().optional(),
  calendarEventId: z.string().optional(),
});

const updateEventSchema = createEventSchema.partial();

/**
 * Get all events for the authenticated user
 * GET /events
 */
export async function getEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.uid;
    const { page, limit, status, eventType, dateFrom, dateTo } = req.query;

    const filters = {
      ...(status && { status: status as EventStatus }),
      ...(eventType && { eventType: eventType as string }),
      ...(dateFrom && { dateFrom: new Date(dateFrom as string) }),
      ...(dateTo && { dateTo: new Date(dateTo as string) }),
    };

    const pagination = {
      ...(page && { page: parseInt(page as string, 10) }),
      ...(limit && { limit: parseInt(limit as string, 10) }),
    };

    const result = await EventService.getEvents(userId, filters, pagination);
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
 * Get a single event by ID
 * GET /events/:id
 */
export async function getEventById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.uid;
    const { id } = req.params;

    const event = await EventService.getEventById(userId, id);
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
 * Create a new event
 * POST /events
 */
export async function createEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.uid;
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
      linkedSavingsGoalId: validated.linkedSavingsGoalId,
      calendarEventId: validated.calendarEventId,
    };

    const event = await EventService.createEvent(userId, data);
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
 */
export async function updateEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.uid;
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
      ...(validated.linkedSavingsGoalId !== undefined && { linkedSavingsGoalId: validated.linkedSavingsGoalId }),
      ...(validated.calendarEventId !== undefined && { calendarEventId: validated.calendarEventId }),
    };

    const event = await EventService.updateEvent(userId, id, data);
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

    console.error('Update event error:', error);
    res.status(500).json({
      error: 'Failed to update event',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Delete an event
 * DELETE /events/:id
 */
export async function deleteEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.uid;
    const { id } = req.params;

    await EventService.deleteEvent(userId, id);
    res.status(204).send();
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      error: 'Failed to delete event',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
