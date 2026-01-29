import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import contactService, {
  UpdateContactData,
  UpdateRelationshipData,
  LogInteractionData,
  Contact,
  Interaction,
} from '../services/contactService';

export function useContact(id: string, enabled = true) {
  const queryClient = useQueryClient();

  // Query for single contact
  const query = useQuery({
    queryKey: ['contact', id],
    queryFn: () => contactService.getContact(id),
    enabled: enabled && !!id,
  });

  // Update contact mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdateContactData) => contactService.updateContact(id, data),
    onSuccess: (data) => {
      // Update the contact in cache
      queryClient.setQueryData(['contact', id], data);
      // Invalidate contacts list to refresh
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  // Delete contact mutation
  const deleteMutation = useMutation({
    mutationFn: () => contactService.deleteContact(id),
    onSuccess: () => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['contact', id] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  // Update relationship mutation
  const updateRelationshipMutation = useMutation({
    mutationFn: (data: UpdateRelationshipData) => contactService.updateRelationship(id, data),
    onSuccess: () => {
      // Refetch contact to get updated relationship
      queryClient.invalidateQueries({ queryKey: ['contact', id] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  // Log interaction mutation
  const logInteractionMutation = useMutation({
    mutationFn: (data: LogInteractionData) => contactService.logInteraction(id, data),
    onSuccess: () => {
      // Refetch contact to get updated interactions
      queryClient.invalidateQueries({ queryKey: ['contact', id] });
      queryClient.invalidateQueries({ queryKey: ['interactions', id] });
    },
  });

  return {
    // Query data
    contact: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,

    // Mutations
    updateContact: updateMutation.mutate,
    updateContactAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,

    deleteContact: deleteMutation.mutate,
    deleteContactAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,

    updateRelationship: updateRelationshipMutation.mutate,
    updateRelationshipAsync: updateRelationshipMutation.mutateAsync,
    isUpdatingRelationship: updateRelationshipMutation.isPending,

    logInteraction: logInteractionMutation.mutate,
    logInteractionAsync: logInteractionMutation.mutateAsync,
    isLoggingInteraction: logInteractionMutation.isPending,
  };
}

export function useInteractionHistory(id: string, page = 1, limit = 20) {
  const query = useQuery({
    queryKey: ['interactions', id, page, limit],
    queryFn: () => contactService.getInteractionHistory(id, { page, limit }),
    enabled: !!id,
  });

  return {
    interactions: query.data?.data || [],
    pagination: query.data?.pagination,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
