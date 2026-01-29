import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import contactService, { ContactFilters, CreateContactData, PaginatedResponse, Contact } from '../services/contactService';

export interface UseContactsOptions {
  filters?: ContactFilters;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

export function useContacts(options: UseContactsOptions = {}) {
  const queryClient = useQueryClient();
  const { filters, page = 1, limit = 20, enabled = true } = options;

  // Query for contacts list
  const query = useQuery({
    queryKey: ['contacts', filters, page, limit],
    queryFn: () => contactService.getContacts(filters, { page, limit }),
    enabled,
  });

  // Create contact mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateContactData) => contactService.createContact(data),
    onSuccess: () => {
      // Invalidate and refetch contacts list
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  // Delete contact mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => contactService.deleteContact(id),
    onSuccess: () => {
      // Invalidate and refetch contacts list
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact'] });
    },
  });

  // Import contacts mutation
  const importMutation = useMutation({
    mutationFn: (contacts: CreateContactData[]) => contactService.importFromPhone(contacts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  return {
    // Query data
    contacts: query.data?.data || [],
    pagination: query.data?.pagination,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    
    // Mutations
    createContact: createMutation.mutate,
    createContactAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    
    deleteContact: deleteMutation.mutate,
    deleteContactAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    
    importContacts: importMutation.mutate,
    importContactsAsync: importMutation.mutateAsync,
    isImporting: importMutation.isPending,
    importResult: importMutation.data,
  };
}
