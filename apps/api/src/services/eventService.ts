import { Prisma, Event, EventStatus, BudgetTier, RSVPStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { PaginationParams, PaginatedResponse, getPaginationParams, createPaginatedResponse } from '../types/pagination';

export interface CreateEventData {
  title: string;
  description?: string;
  eventType: string;
  date: Date;
  startTime: string;
  endTime: string;
  timezone: string;
  locationName?: string;
  locationAddress?: string;
  locationPlaceId?: string;
  locationLat?: number;
  locationLng?: number;
  estimatedCost: number;
  actualCost?: number;
  budgetTier: BudgetTier;
  status?: EventStatus;
  isRecurring?: boolean;
  recurringPattern?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
  linkedSavingsGoalId?: string;
  calendarEventId?: string;
}

export interface UpdateEventData {
  title?: string;
  description?: string;
  eventType?: string;
  date?: Date;
  startTime?: string;
  endTime?: string;
  timezone?: string;
  locationName?: string;
  locationAddress?: string;
  locationPlaceId?: string;
  locationLat?: number;
  locationLng?: number;
  estimatedCost?: number;
  actualCost?: number;
  budgetTier?: BudgetTier;
  status?: EventStatus;
  isRecurring?: boolean;
  recurringPattern?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
  linkedSavingsGoalId?: string;
  calendarEventId?: string;
}

export interface EventFilters {
  status?: EventStatus;
  eventType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  budgetTier?: BudgetTier;
}

export class EventService {
  /**
   * Create a new event
   */
  static async createEvent(userId: string, data: CreateEventData): Promise<Event> {
    try {
      const event = await prisma.event.create({
        data: {
          userId,
          title: data.title,
          description: data.description,
          eventType: data.eventType,
          date: data.date,
          startTime: data.startTime,
          endTime: data.endTime,
          timezone: data.timezone,
          locationName: data.locationName,
          locationAddress: data.locationAddress,
          locationPlaceId: data.locationPlaceId,
          locationLat: data.locationLat,
          locationLng: data.locationLng,
          estimatedCost: data.estimatedCost,
          actualCost: data.actualCost,
          budgetTier: data.budgetTier,
          status: data.status ?? 'DRAFT',
          isRecurring: data.isRecurring ?? false,
          ...(data.recurringPattern !== undefined && {
            recurringPattern: data.recurringPattern,
          }),
          linkedSavingsGoalId: data.linkedSavingsGoalId,
          calendarEventId: data.calendarEventId,
        },
        include: {
          attendees: {
            include: {
              contact: true,
            },
          },
        },
      });

      return event;
    } catch (error) {
      throw new Error(`Failed to create event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get events with filters and pagination
   */
  static async getEvents(
    userId: string,
    filters?: EventFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Event>> {
    try {
      const { skip, take } = getPaginationParams(pagination);

      const where: Prisma.EventWhereInput = {
        userId,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.eventType && { eventType: filters.eventType }),
        ...(filters?.budgetTier && { budgetTier: filters.budgetTier }),
        ...(filters?.dateFrom || filters?.dateTo
          ? {
              date: {
                ...(filters.dateFrom && { gte: filters.dateFrom }),
                ...(filters.dateTo && { lte: filters.dateTo }),
              },
            }
          : {}),
      };

      const [events, total] = await Promise.all([
        prisma.event.findMany({
          where,
          skip,
          take,
          orderBy: { date: 'asc' },
          include: {
            attendees: {
              include: {
                contact: true,
              },
            },
          },
        }),
        prisma.event.count({ where }),
      ]);

      return createPaginatedResponse(events, total, pagination);
    } catch (error) {
      throw new Error(`Failed to get events: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get event by ID
   */
  static async getEventById(userId: string, eventId: string): Promise<Event | null> {
    try {
      const event = await prisma.event.findFirst({
        where: {
          id: eventId,
          userId,
        },
        include: {
          attendees: {
            include: {
              contact: true,
            },
          },
          savingsGoals: true,
        },
      });

      return event;
    } catch (error) {
      throw new Error(`Failed to get event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update event
   */
  static async updateEvent(userId: string, eventId: string, data: UpdateEventData): Promise<Event> {
    try {
      // Verify event belongs to user
      const existingEvent = await prisma.event.findFirst({
        where: {
          id: eventId,
          userId,
        },
      });

      if (!existingEvent) {
        throw new Error('Event not found');
      }

      const { recurringPattern, ...rest } = data;

      const event = await prisma.event.update({
        where: { id: eventId },
        data: {
          ...rest,
          ...(recurringPattern !== undefined && { recurringPattern }),
          updatedAt: new Date(),
        },
        include: {
          attendees: {
            include: {
              contact: true,
            },
          },
        },
      });

      return event;
    } catch (error) {
      if (error instanceof Error && error.message === 'Event not found') {
        throw error;
      }
      throw new Error(`Failed to update event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cancel event (set status to CANCELLED)
   */
  static async cancelEvent(userId: string, eventId: string): Promise<Event> {
    try {
      // Verify event belongs to user
      const existingEvent = await prisma.event.findFirst({
        where: {
          id: eventId,
          userId,
        },
      });

      if (!existingEvent) {
        throw new Error('Event not found');
      }

      const event = await prisma.event.update({
        where: { id: eventId },
        data: {
          status: 'CANCELLED',
          updatedAt: new Date(),
        },
      });

      return event;
    } catch (error) {
      if (error instanceof Error && error.message === 'Event not found') {
        throw error;
      }
      throw new Error(`Failed to cancel event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add attendee to event
   */
  static async addAttendee(
    eventId: string,
    contactId: string,
    data?: { plusOnes?: number; dietaryRestrictions?: string; notes?: string }
  ): Promise<any> {
    try {
      // Verify event exists
      const event = await prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        throw new Error('Event not found');
      }

      // Verify contact exists and is not deleted
      const contact = await prisma.contact.findFirst({
        where: {
          id: contactId,
          isDeleted: false,
        },
      });

      if (!contact) {
        throw new Error('Contact not found');
      }

      // Check if attendee already exists
      const existingAttendee = await prisma.eventAttendee.findFirst({
        where: {
          eventId,
          contactId,
        },
      });

      let attendee;
      if (existingAttendee) {
        // Update existing attendee
        attendee = await prisma.eventAttendee.update({
          where: { id: existingAttendee.id },
          data: {
            rsvpStatus: 'PENDING',
            plusOnes: data?.plusOnes ?? existingAttendee.plusOnes,
            dietaryRestrictions: data?.dietaryRestrictions ?? existingAttendee.dietaryRestrictions,
            notes: data?.notes ?? existingAttendee.notes,
          },
        });
      } else {
        // Create new attendee
        attendee = await prisma.eventAttendee.create({
          data: {
            eventId,
            contactId,
            rsvpStatus: 'PENDING',
            plusOnes: data?.plusOnes ?? 0,
            dietaryRestrictions: data?.dietaryRestrictions,
            notes: data?.notes,
          },
        });
      }

      return attendee;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new Error('Attendee already exists for this event');
        }
      }
      if (error instanceof Error && (error.message === 'Event not found' || error.message === 'Contact not found')) {
        throw error;
      }
      throw new Error(`Failed to add attendee: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update RSVP status
   */
  static async updateRSVP(eventId: string, contactId: string, status: RSVPStatus): Promise<any> {
    try {
      const attendee = await prisma.eventAttendee.findFirst({
        where: {
          eventId,
          contactId,
        },
      });

      if (!attendee) {
        throw new Error('Attendee not found');
      }

      const updated = await prisma.eventAttendee.update({
        where: { id: attendee.id },
        data: {
          rsvpStatus: status,
          rsvpDate: new Date(),
        },
      });

      return updated;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new Error('Attendee not found');
        }
      }
      if (error instanceof Error && error.message === 'Attendee not found') {
        throw error;
      }
      throw new Error(`Failed to update RSVP: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
