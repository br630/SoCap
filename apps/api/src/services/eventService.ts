import { Prisma, Event, EventStatus, BudgetTier, RSVPStatus, EventAttendee } from '@prisma/client';
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
  createSavingsGoal?: boolean;
  savingsGoalName?: string;
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
  updateFutureOccurrences?: boolean;
}

export interface EventFilters {
  status?: EventStatus;
  eventType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  budgetTier?: BudgetTier;
}

export interface EventWithAttendeeCount extends Event {
  _count?: {
    attendees: number;
  };
  attendeeCount?: number;
}

export interface CalendarViewEvent {
  id: string;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: EventStatus;
  eventType: string;
  attendeeCount: number;
}

export interface AddAttendeeData {
  plusOnes?: number;
  dietaryRestrictions?: string;
  notes?: string;
}

export interface UpdateRSVPData {
  status: RSVPStatus;
  plusOnes?: number;
  dietaryRestrictions?: string;
}

export interface VenueSearchParams {
  query: string;
  location?: string;
  type?: string;
}

export interface VenueSuggestion {
  placeId: string;
  name: string;
  address: string;
  rating?: number;
  priceLevel?: number;
  types: string[];
  location?: {
    lat: number;
    lng: number;
  };
  photos?: string[];
  openNow?: boolean;
}

export class EventService {
  /**
   * Create a new event with optional linked savings goal
   */
  static async createEvent(userId: string, data: CreateEventData): Promise<Event> {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Create the event
        const event = await tx.event.create({
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

        // Optionally create linked savings goal
        if (data.createSavingsGoal && data.estimatedCost > 0) {
          const savingsGoal = await tx.savingsGoal.create({
            data: {
              userId,
              eventId: event.id,
              name: data.savingsGoalName || `Savings for ${data.title}`,
              targetAmount: data.estimatedCost,
              currentAmount: 0,
              deadline: data.date,
              status: 'ACTIVE',
            },
          });

          // Update event with linked savings goal
          await tx.event.update({
            where: { id: event.id },
            data: { linkedSavingsGoalId: savingsGoal.id },
          });
        }

        return event;
      });

      // Fetch the complete event with all relations
      const completeEvent = await prisma.event.findUnique({
        where: { id: result.id },
        include: {
          attendees: {
            include: {
              contact: true,
            },
          },
          savingsGoals: true,
        },
      });

      return completeEvent!;
    } catch (error) {
      throw new Error(`Failed to create event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get events with filters, pagination, and attendee counts
   * Supports both list and calendar view modes
   */
  static async getEvents(
    userId: string,
    filters?: EventFilters,
    pagination?: PaginationParams,
    view: 'list' | 'calendar' = 'list'
  ): Promise<PaginatedResponse<EventWithAttendeeCount | CalendarViewEvent>> {
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
            attendees: view === 'list' ? {
              include: {
                contact: true,
              },
            } : false,
            _count: {
              select: { attendees: true },
            },
          },
        }),
        prisma.event.count({ where }),
      ]);

      // Transform for calendar view (lightweight)
      if (view === 'calendar') {
        const calendarEvents: CalendarViewEvent[] = events.map((event) => ({
          id: event.id,
          title: event.title,
          date: event.date,
          startTime: event.startTime,
          endTime: event.endTime,
          status: event.status,
          eventType: event.eventType,
          attendeeCount: event._count?.attendees ?? 0,
        }));
        return createPaginatedResponse(calendarEvents, total, pagination);
      }

      // List view with full data
      const eventsWithCount: EventWithAttendeeCount[] = events.map((event) => ({
        ...event,
        attendeeCount: event._count?.attendees ?? 0,
      }));

      return createPaginatedResponse(eventsWithCount, total, pagination);
    } catch (error) {
      throw new Error(`Failed to get events: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get events by month for calendar view
   */
  static async getEventsByMonth(
    userId: string,
    year: number,
    month: number
  ): Promise<CalendarViewEvent[]> {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const events = await prisma.event.findMany({
        where: {
          userId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { date: 'asc' },
        include: {
          _count: {
            select: { attendees: true },
          },
        },
      });

      return events.map((event) => ({
        id: event.id,
        title: event.title,
        date: event.date,
        startTime: event.startTime,
        endTime: event.endTime,
        status: event.status,
        eventType: event.eventType,
        attendeeCount: event._count?.attendees ?? 0,
      }));
    } catch (error) {
      throw new Error(`Failed to get events by month: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get events where a specific contact is an attendee
   */
  static async getEventsByContact(userId: string, contactId: string): Promise<Event[]> {
    try {
      const events = await prisma.event.findMany({
        where: {
          userId,
          attendees: {
            some: {
              contactId,
            },
          },
        },
        include: {
          attendees: {
            where: { contactId },
            select: {
              rsvpStatus: true,
            },
          },
        },
        orderBy: { date: 'asc' },
      });

      // Flatten the attendee RSVP status onto the event
      return events.map((event) => ({
        ...event,
        rsvpStatus: event.attendees[0]?.rsvpStatus,
        attendees: undefined, // Remove the nested attendees array
      })) as Event[];
    } catch (error) {
      throw new Error(`Failed to get events by contact: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get event by ID with full attendee list and details
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
              contact: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  profileImage: true,
                },
              },
            },
            orderBy: { contact: { name: 'asc' } },
          },
          savingsGoals: true,
          reminders: {
            where: { status: { not: 'DISMISSED' } },
            orderBy: { scheduledDate: 'asc' },
          },
        },
      });

      return event;
    } catch (error) {
      throw new Error(`Failed to get event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update event with optional handling for recurring events
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

      const { recurringPattern, updateFutureOccurrences, ...rest } = data;

      // For recurring events, handle future occurrences if requested
      if (existingEvent.isRecurring && updateFutureOccurrences) {
        // Update all future occurrences with the same recurring pattern
        await prisma.event.updateMany({
          where: {
            userId,
            recurringPattern: existingEvent.recurringPattern as Prisma.InputJsonValue,
            date: { gte: existingEvent.date },
          },
          data: {
            ...rest,
            ...(recurringPattern !== undefined && { recurringPattern }),
            updatedAt: new Date(),
          },
        });
      }

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
          savingsGoals: true,
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
   * Returns attendee contact IDs for notifications
   */
  static async cancelEvent(userId: string, eventId: string): Promise<{ event: Event; attendeeUserIds: string[] }> {
    try {
      // Verify event belongs to user
      const existingEvent = await prisma.event.findFirst({
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
        include: {
          attendees: {
            include: {
              contact: true,
            },
          },
        },
      });

      // Get attendee user IDs for notifications (if contacts have associated users)
      const attendeeUserIds = existingEvent.attendees
        .map((a) => a.contact.userId)
        .filter((id) => id !== userId);

      return { event, attendeeUserIds };
    } catch (error) {
      if (error instanceof Error && error.message === 'Event not found') {
        throw error;
      }
      throw new Error(`Failed to cancel event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete event permanently
   */
  static async deleteEvent(userId: string, eventId: string): Promise<void> {
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

      await prisma.event.delete({
        where: { id: eventId },
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Event not found') {
        throw error;
      }
      throw new Error(`Failed to delete event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add multiple attendees to event
   */
  static async addAttendees(
    userId: string,
    eventId: string,
    contactIds: string[],
    data?: AddAttendeeData
  ): Promise<EventAttendee[]> {
    try {
      // Verify event belongs to user
      const event = await prisma.event.findFirst({
        where: { id: eventId, userId },
      });

      if (!event) {
        throw new Error('Event not found');
      }

      // Verify all contacts belong to user and are not deleted
      const contacts = await prisma.contact.findMany({
        where: {
          id: { in: contactIds },
          userId,
          isDeleted: false,
        },
      });

      if (contacts.length !== contactIds.length) {
        throw new Error('One or more contacts not found');
      }

      // Get existing attendees
      const existingAttendees = await prisma.eventAttendee.findMany({
        where: {
          eventId,
          contactId: { in: contactIds },
        },
      });

      const existingContactIds = existingAttendees.map((a) => a.contactId);
      const newContactIds = contactIds.filter((id) => !existingContactIds.includes(id));

      // Create new attendees
      if (newContactIds.length > 0) {
        await prisma.eventAttendee.createMany({
          data: newContactIds.map((contactId) => ({
            eventId,
            contactId,
            rsvpStatus: 'PENDING' as RSVPStatus,
            plusOnes: data?.plusOnes ?? 0,
            dietaryRestrictions: data?.dietaryRestrictions,
            notes: data?.notes,
          })),
        });
      }

      // Fetch all attendees
      const attendees = await prisma.eventAttendee.findMany({
        where: { eventId },
        include: {
          contact: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              profileImage: true,
            },
          },
        },
        orderBy: { contact: { name: 'asc' } },
      });

      return attendees;
    } catch (error) {
      if (error instanceof Error && (error.message === 'Event not found' || error.message === 'One or more contacts not found')) {
        throw error;
      }
      throw new Error(`Failed to add attendees: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add single attendee to event (legacy support)
   */
  static async addAttendee(
    eventId: string,
    contactId: string,
    data?: AddAttendeeData
  ): Promise<EventAttendee> {
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
          include: {
            contact: true,
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
          include: {
            contact: true,
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
   * Remove attendee from event
   */
  static async removeAttendee(userId: string, eventId: string, attendeeId: string): Promise<void> {
    try {
      // Verify event belongs to user
      const event = await prisma.event.findFirst({
        where: { id: eventId, userId },
      });

      if (!event) {
        throw new Error('Event not found');
      }

      // Verify attendee exists
      const attendee = await prisma.eventAttendee.findFirst({
        where: {
          id: attendeeId,
          eventId,
        },
      });

      if (!attendee) {
        throw new Error('Attendee not found');
      }

      await prisma.eventAttendee.delete({
        where: { id: attendeeId },
      });
    } catch (error) {
      if (error instanceof Error && (error.message === 'Event not found' || error.message === 'Attendee not found')) {
        throw error;
      }
      throw new Error(`Failed to remove attendee: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update RSVP status with additional details
   */
  static async updateRSVP(
    userId: string,
    eventId: string,
    attendeeId: string,
    data: UpdateRSVPData
  ): Promise<EventAttendee> {
    try {
      // Verify event belongs to user
      const event = await prisma.event.findFirst({
        where: { id: eventId, userId },
      });

      if (!event) {
        throw new Error('Event not found');
      }

      // Verify attendee exists
      const attendee = await prisma.eventAttendee.findFirst({
        where: {
          id: attendeeId,
          eventId,
        },
      });

      if (!attendee) {
        throw new Error('Attendee not found');
      }

      const updated = await prisma.eventAttendee.update({
        where: { id: attendeeId },
        data: {
          rsvpStatus: data.status,
          rsvpDate: new Date(),
          ...(data.plusOnes !== undefined && { plusOnes: data.plusOnes }),
          ...(data.dietaryRestrictions !== undefined && { dietaryRestrictions: data.dietaryRestrictions }),
        },
        include: {
          contact: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              profileImage: true,
            },
          },
        },
      });

      // Auto-confirm event if all attendees have confirmed
      if (data.status === 'CONFIRMED' && event.status === 'PLANNING') {
        await this.checkAndAutoConfirmEvent(eventId);
      }

      return updated;
    } catch (error) {
      if (error instanceof Error && (error.message === 'Event not found' || error.message === 'Attendee not found')) {
        throw error;
      }
      throw new Error(`Failed to update RSVP: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if all attendees have confirmed and auto-confirm the event
   */
  static async checkAndAutoConfirmEvent(eventId: string): Promise<boolean> {
    try {
      const attendees = await prisma.eventAttendee.findMany({
        where: { eventId },
      });

      // If no attendees, don't auto-confirm
      if (attendees.length === 0) {
        return false;
      }

      // Check if all attendees have confirmed
      const allConfirmed = attendees.every(a => a.rsvpStatus === 'CONFIRMED');

      if (allConfirmed) {
        await prisma.event.update({
          where: { id: eventId },
          data: { status: 'CONFIRMED' },
        });
        console.log(`✅ Event ${eventId} auto-confirmed: all ${attendees.length} attendees confirmed`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to auto-confirm event:', error);
      return false;
    }
  }

  /**
   * Send RSVP reminder to attendees who haven't responded
   */
  static async sendRSVPReminders(eventId: string, userId: string): Promise<number> {
    try {
      // Get pending attendees
      const pendingAttendees = await prisma.eventAttendee.findMany({
        where: {
          eventId,
          rsvpStatus: 'PENDING',
        },
        include: {
          contact: true,
          event: true,
        },
      });

      // Create reminders for each pending attendee
      let reminderCount = 0;
      for (const attendee of pendingAttendees) {
        // Check if a reminder already exists for this attendee
        const existingReminder = await prisma.reminder.findFirst({
          where: {
            eventId,
            contactId: attendee.contactId,
            type: 'RSVP_FOLLOWUP',
            status: 'PENDING',
          },
        });

        if (!existingReminder) {
          await prisma.reminder.create({
            data: {
              userId,
              eventId,
              contactId: attendee.contactId,
              type: 'RSVP_FOLLOWUP',
              title: `RSVP Reminder: ${attendee.event.title}`,
              message: `${attendee.contact.name} hasn't responded to your invitation for "${attendee.event.title}" on ${new Date(attendee.event.date).toLocaleDateString()}`,
              scheduledDate: new Date(), // Send immediately or schedule for later
              status: 'PENDING',
            },
          });
          reminderCount++;
        }
      }

      return reminderCount;
    } catch (error) {
      console.error('Failed to send RSVP reminders:', error);
      throw error;
    }
  }

  /**
   * Search venues using Google Places API
   */
  static async searchVenues(params: VenueSearchParams): Promise<VenueSuggestion[]> {
    try {
      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        throw new Error('Google Places API key not configured');
      }

      // Build the search query
      let searchQuery = params.query;
      if (params.type) {
        searchQuery += ` ${params.type}`;
      }

      // Use Google Places Text Search API
      const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
      url.searchParams.append('query', searchQuery);
      url.searchParams.append('key', apiKey);
      
      if (params.location) {
        // If location is provided, use it for location bias
        url.searchParams.append('location', params.location);
        url.searchParams.append('radius', '50000'); // 50km radius
      }

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Places API error: ${data.status}`);
      }

      const venues: VenueSuggestion[] = (data.results || []).map((place: any) => ({
        placeId: place.place_id,
        name: place.name,
        address: place.formatted_address,
        rating: place.rating,
        priceLevel: place.price_level,
        types: place.types || [],
        location: place.geometry?.location ? {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
        } : undefined,
        photos: place.photos?.map((photo: any) => 
          `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${apiKey}`
        ),
        openNow: place.opening_hours?.open_now,
      }));

      return venues;
    } catch (error) {
      throw new Error(`Failed to search venues: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get attendees for an event
   */
  static async getAttendees(userId: string, eventId: string): Promise<EventAttendee[]> {
    try {
      // Verify event belongs to user
      const event = await prisma.event.findFirst({
        where: { id: eventId, userId },
      });

      if (!event) {
        throw new Error('Event not found');
      }

      const attendees = await prisma.eventAttendee.findMany({
        where: { eventId },
        include: {
          contact: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              profileImage: true,
            },
          },
        },
        orderBy: { contact: { name: 'asc' } },
      });

      return attendees;
    } catch (error) {
      if (error instanceof Error && error.message === 'Event not found') {
        throw error;
      }
      throw new Error(`Failed to get attendees: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
