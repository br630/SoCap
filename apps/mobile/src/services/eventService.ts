import { apiClient } from '../config/api';

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
  budgetTier: 'FREE' | 'BUDGET' | 'MODERATE' | 'PREMIUM';
  status: 'DRAFT' | 'PLANNING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  isRecurring: boolean;
  recurringPattern?: any;
  linkedSavingsGoalId?: string | null;
  calendarEventId?: string | null;
  createdAt: string;
  updatedAt: string;
  attendees?: EventAttendee[];
}

export interface EventAttendee {
  id: string;
  eventId: string;
  contactId: string;
  rsvpStatus: 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'MAYBE';
  rsvpDate?: string | null;
  plusOnes: number;
  dietaryRestrictions?: string | null;
  notes?: string | null;
  contact?: {
    id: string;
    name: string;
    profileImage?: string | null;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface EventFilters {
  status?: 'DRAFT' | 'PLANNING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  eventType?: string;
  dateFrom?: string;
  dateTo?: string;
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
  budgetTier: 'FREE' | 'BUDGET' | 'MODERATE' | 'PREMIUM';
  status?: 'DRAFT' | 'PLANNING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  isRecurring?: boolean;
  linkedSavingsGoalId?: string;
  calendarEventId?: string;
}

export interface UpdateEventData {
  title?: string;
  description?: string;
  eventType?: string;
  date?: string;
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
  budgetTier?: 'FREE' | 'BUDGET' | 'MODERATE' | 'PREMIUM';
  status?: 'DRAFT' | 'PLANNING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  isRecurring?: boolean;
  linkedSavingsGoalId?: string;
  calendarEventId?: string;
}

class EventService {
  /**
   * Get all events
   */
  async getEvents(
    filters?: EventFilters,
    page = 1,
    limit = 20
  ): Promise<PaginatedResponse<Event>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.eventType && { eventType: filters.eventType }),
      ...(filters?.dateFrom && { dateFrom: filters.dateFrom }),
      ...(filters?.dateTo && { dateTo: filters.dateTo }),
    });

    const response = await apiClient.get<PaginatedResponse<Event>>(`/events?${params}`);
    return response.data;
  }

  /**
   * Get a single event by ID
   */
  async getEventById(id: string): Promise<Event> {
    const response = await apiClient.get<Event>(`/events/${id}`);
    return response.data;
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
   * Delete an event
   */
  async deleteEvent(id: string): Promise<void> {
    await apiClient.delete(`/events/${id}`);
  }
}

export default new EventService();
