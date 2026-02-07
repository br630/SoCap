import { apiClient } from '../config/api';

// Types
export type BudgetTier = 'FREE' | 'BUDGET' | 'MODERATE' | 'PREMIUM';
export type EventStatus = 'DRAFT' | 'PLANNING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
export type RSVPStatus = 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'MAYBE';

export interface Event {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  eventType: string;
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
  locationName?: string | null;
  locationAddress?: string | null;
  locationPlaceId?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  estimatedCost: number;
  actualCost?: number | null;
  budgetTier: BudgetTier;
  status: EventStatus;
  isRecurring: boolean;
  recurringPattern?: any;
  linkedSavingsGoalId?: string | null;
  calendarEventId?: string | null;
  createdAt: string;
  updatedAt: string;
  attendees?: EventAttendee[];
  attendeeCount?: number;
  savingsGoals?: SavingsGoal[];
  reminders?: Reminder[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  status: EventStatus;
  eventType: string;
  attendeeCount: number;
}

export interface EventAttendee {
  id: string;
  eventId: string;
  contactId: string;
  rsvpStatus: RSVPStatus;
  rsvpDate?: string | null;
  plusOnes: number;
  dietaryRestrictions?: string | null;
  notes?: string | null;
  contact?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    profileImage?: string | null;
  };
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  status: string;
}

export interface Reminder {
  id: string;
  title: string;
  scheduledDate: string;
  status: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface EventFilters {
  status?: EventStatus;
  eventType?: string;
  dateFrom?: string;
  dateTo?: string;
  view?: 'list' | 'calendar';
  year?: number;
  month?: number;
}

export interface CreateEventData {
  title: string;
  description?: string;
  eventType: string;
  date: string;
  startTime: string;
  endTime: string;
  timezone?: string;
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
  recurringPattern?: any;
  linkedSavingsGoalId?: string;
  calendarEventId?: string;
  createSavingsGoal?: boolean;
  savingsGoalName?: string;
}

export interface UpdateEventData extends Partial<CreateEventData> {
  updateFutureOccurrences?: boolean;
}

export interface UpdateRSVPData {
  status: RSVPStatus;
  plusOnes?: number;
  dietaryRestrictions?: string;
}

export interface EventTemplate {
  id: string;
  name: string;
  description: string;
  eventType: string;
  category: string;
  suggestedDuration: number;
  suggestedBudgetTier: BudgetTier;
  estimatedCostRange: {
    min: number;
    max: number;
  };
  suggestedActivities: string[];
  venueTypes: string[];
  planningTips: string[];
  icon: string;
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

class EventService {
  /**
   * Get all events with filters and pagination
   */
  async getEvents(
    filters?: EventFilters,
    page = 1,
    limit = 20
  ): Promise<PaginatedResponse<Event>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters?.status) params.append('status', filters.status);
    if (filters?.eventType) params.append('eventType', filters.eventType);
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    if (filters?.view) params.append('view', filters.view);
    if (filters?.year) params.append('year', filters.year.toString());
    if (filters?.month) params.append('month', filters.month.toString());

    const response = await apiClient.get<PaginatedResponse<Event>>(`/events?${params}`);
    return response.data;
  }

  /**
   * Get events for calendar view (by month)
   */
  async getCalendarEvents(year: number, month: number): Promise<CalendarEvent[]> {
    const params = new URLSearchParams({
      view: 'calendar',
      year: year.toString(),
      month: month.toString(),
    });

    const response = await apiClient.get<{ data: CalendarEvent[] }>(`/events?${params}`);
    return response.data.data;
  }

  /**
   * Get a single event by ID with full details
   */
  async getEventById(id: string): Promise<Event> {
    const response = await apiClient.get<Event>(`/events/${id}`);
    return response.data;
  }

  /**
   * Get events where a specific contact is an attendee
   */
  async getEventsByContact(contactId: string): Promise<Event[]> {
    const response = await apiClient.get<{ data: Event[] }>(`/events/contact/${contactId}`);
    return response.data.data || [];
  }

  /**
   * Create a new event
   */
  async createEvent(data: CreateEventData): Promise<Event> {
    const response = await apiClient.post<Event>('/events', data);
    return response.data;
  }

  /**
   * Update an event
   */
  async updateEvent(id: string, data: UpdateEventData): Promise<Event> {
    const response = await apiClient.put<Event>(`/events/${id}`, data);
    return response.data;
  }

  /**
   * Cancel an event
   */
  async cancelEvent(id: string): Promise<{ success: boolean; event: Event; notificationsSent: number }> {
    const response = await apiClient.delete<{ success: boolean; event: Event; notificationsSent: number }>(
      `/events/${id}`
    );
    return response.data;
  }

  /**
   * Delete an event permanently
   */
  async deleteEvent(id: string): Promise<void> {
    await apiClient.delete(`/events/${id}?force=true`);
  }

  /**
   * Add attendees to an event
   */
  async addAttendees(eventId: string, contactIds: string[]): Promise<{ success: boolean; attendees: EventAttendee[]; added: number }> {
    const response = await apiClient.post<{ success: boolean; attendees: EventAttendee[]; added: number }>(
      `/events/${eventId}/attendees`,
      { contactIds }
    );
    return response.data;
  }

  /**
   * Remove an attendee from an event
   */
  async removeAttendee(eventId: string, attendeeId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `/events/${eventId}/attendees/${attendeeId}`
    );
    return response.data;
  }

  /**
   * Update an attendee's RSVP
   */
  async updateRSVP(eventId: string, attendeeId: string, data: UpdateRSVPData): Promise<{ success: boolean; attendee: EventAttendee }> {
    const response = await apiClient.put<{ success: boolean; attendee: EventAttendee }>(
      `/events/${eventId}/attendees/${attendeeId}/rsvp`,
      data
    );
    return response.data;
  }

  /**
   * Send RSVP reminders to pending attendees
   */
  async sendRSVPReminders(eventId: string): Promise<{ success: boolean; message: string; reminderCount: number }> {
    const response = await apiClient.post<{ success: boolean; message: string; reminderCount: number }>(
      `/events/${eventId}/send-rsvp-reminders`
    );
    return response.data;
  }

  /**
   * Get event templates
   */
  async getEventTemplates(category?: string): Promise<{
    categories: string[];
    templates: Record<string, EventTemplate[]>;
    all: EventTemplate[];
  }> {
    const params = category ? `?category=${category}` : '';
    const response = await apiClient.get<{
      categories: string[];
      templates: Record<string, EventTemplate[]>;
      all: EventTemplate[];
    }>(`/events/templates${params}`);
    return response.data;
  }

  /**
   * Get a single template by ID
   */
  async getTemplateById(id: string): Promise<EventTemplate> {
    const response = await apiClient.get<EventTemplate>(`/events/templates?id=${id}`);
    return response.data;
  }

  /**
   * Search for venues using Google Places API
   */
  async searchVenues(query: string, location?: string, type?: string): Promise<VenueSuggestion[]> {
    const params = new URLSearchParams({ query });
    if (location) params.append('location', location);
    if (type) params.append('type', type);

    const response = await apiClient.get<{ success: boolean; venues: VenueSuggestion[]; count: number }>(
      `/events/venues/search?${params}`
    );
    return response.data.venues;
  }
}

export default new EventService();
