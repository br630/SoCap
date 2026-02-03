import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import eventService, {
  Event,
  CalendarEvent,
  EventFilters,
  CreateEventData,
  UpdateEventData,
  UpdateRSVPData,
  EventTemplate,
  VenueSuggestion,
} from '../services/eventService';

// ============ useEvents Hook ============
export interface UseEventsOptions {
  filters?: EventFilters;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

export function useEvents(options: UseEventsOptions = {}) {
  const queryClient = useQueryClient();
  const { filters, page = 1, limit = 20, enabled = true } = options;

  const query = useQuery({
    queryKey: ['events', filters, page, limit],
    queryFn: () => eventService.getEvents(filters, page, limit),
    enabled,
  });

  return {
    events: query.data?.data || [],
    pagination: query.data?.pagination,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ============ useCalendarEvents Hook ============
export function useCalendarEvents(year: number, month: number) {
  const query = useQuery({
    queryKey: ['calendarEvents', year, month],
    queryFn: () => eventService.getCalendarEvents(year, month),
  });

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};
    (query.data || []).forEach((event) => {
      const dateKey = event.date.split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });
    return grouped;
  }, [query.data]);

  return {
    events: query.data || [],
    eventsByDate,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ============ useEvent Hook ============
export function useEvent(id: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventService.getEventById(id!),
    enabled: !!id,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['event', id] });
    queryClient.invalidateQueries({ queryKey: ['events'] });
    queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
  }, [queryClient, id]);

  return {
    event: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    invalidate,
  };
}

// ============ useEventMutations Hook ============
export function useEventMutations() {
  const queryClient = useQueryClient();

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['events'] });
    queryClient.invalidateQueries({ queryKey: ['event'] });
    queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
  }, [queryClient]);

  // Create event
  const createMutation = useMutation({
    mutationFn: (data: CreateEventData) => eventService.createEvent(data),
    onSuccess: invalidateAll,
  });

  // Update event
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEventData }) =>
      eventService.updateEvent(id, data),
    onSuccess: invalidateAll,
  });

  // Cancel event
  const cancelMutation = useMutation({
    mutationFn: (id: string) => eventService.cancelEvent(id),
    onSuccess: invalidateAll,
  });

  // Delete event
  const deleteMutation = useMutation({
    mutationFn: (id: string) => eventService.deleteEvent(id),
    onSuccess: invalidateAll,
  });

  // Add attendees
  const addAttendeesMutation = useMutation({
    mutationFn: ({ eventId, contactIds }: { eventId: string; contactIds: string[] }) =>
      eventService.addAttendees(eventId, contactIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['event', variables.eventId] });
    },
  });

  // Remove attendee
  const removeAttendeeMutation = useMutation({
    mutationFn: ({ eventId, attendeeId }: { eventId: string; attendeeId: string }) =>
      eventService.removeAttendee(eventId, attendeeId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['event', variables.eventId] });
    },
  });

  // Update RSVP
  const updateRSVPMutation = useMutation({
    mutationFn: ({
      eventId,
      attendeeId,
      data,
    }: {
      eventId: string;
      attendeeId: string;
      data: UpdateRSVPData;
    }) => eventService.updateRSVP(eventId, attendeeId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['event', variables.eventId] });
    },
  });

  return {
    // Create
    createEvent: createMutation.mutate,
    createEventAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error,

    // Update
    updateEvent: updateMutation.mutate,
    updateEventAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,

    // Cancel
    cancelEvent: cancelMutation.mutate,
    cancelEventAsync: cancelMutation.mutateAsync,
    isCancelling: cancelMutation.isPending,

    // Delete
    deleteEvent: deleteMutation.mutate,
    deleteEventAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,

    // Attendees
    addAttendees: addAttendeesMutation.mutate,
    addAttendeesAsync: addAttendeesMutation.mutateAsync,
    isAddingAttendees: addAttendeesMutation.isPending,

    removeAttendee: removeAttendeeMutation.mutate,
    removeAttendeeAsync: removeAttendeeMutation.mutateAsync,
    isRemovingAttendee: removeAttendeeMutation.isPending,

    updateRSVP: updateRSVPMutation.mutate,
    updateRSVPAsync: updateRSVPMutation.mutateAsync,
    isUpdatingRSVP: updateRSVPMutation.isPending,
  };
}

// ============ useEventTemplates Hook ============
export function useEventTemplates(category?: string) {
  const query = useQuery({
    queryKey: ['eventTemplates', category],
    queryFn: () => eventService.getEventTemplates(category),
  });

  return {
    templates: query.data?.all || [],
    templatesByCategory: query.data?.templates || {},
    categories: query.data?.categories || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

// ============ useVenueSearch Hook (with debounce) ============
export function useVenueSearch(query: string, location?: string, debounceMs = 500) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [venues, setVenues] = useState<VenueSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Debounce the query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  // Search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setVenues([]);
      return;
    }

    const searchVenues = async () => {
      setIsSearching(true);
      setError(null);
      try {
        const results = await eventService.searchVenues(debouncedQuery, location);
        setVenues(results);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to search venues'));
        setVenues([]);
      } finally {
        setIsSearching(false);
      }
    };

    searchVenues();
  }, [debouncedQuery, location]);

  const clearResults = useCallback(() => {
    setVenues([]);
    setError(null);
  }, []);

  return {
    venues,
    isSearching,
    error,
    clearResults,
  };
}
