import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useContacts } from '../../hooks/useContacts';
import * as contactService from '../../services/contactService';

jest.mock('../../services/contactService');

const mockContactService = contactService as jest.Mocked<typeof contactService>;

describe('useContacts', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('fetches contacts successfully', async () => {
    const mockContacts = {
      data: [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
        },
        {
          id: '2',
          name: 'Jane Smith',
          email: 'jane@example.com',
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      },
    };

    mockContactService.getContacts.mockResolvedValue(mockContacts);

    const { result } = renderHook(() => useContacts(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.contacts).toEqual(mockContacts.data);
    expect(result.current.pagination).toEqual(mockContacts.pagination);
  });

  it('handles pagination', async () => {
    const mockContacts = {
      data: [{ id: '1', name: 'John Doe' }],
      pagination: {
        page: 2,
        limit: 20,
        total: 21,
        totalPages: 2,
      },
    };

    mockContactService.getContacts.mockResolvedValue(mockContacts);

    const { result } = renderHook(() => useContacts({ page: 2, limit: 20 }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.pagination?.page).toBe(2);
  });

  it('creates contact successfully', async () => {
    const newContact = {
      id: '3',
      name: 'New Contact',
      email: 'new@example.com',
    };

    mockContactService.createContact.mockResolvedValue(newContact);
    mockContactService.getContacts.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    const { result } = renderHook(() => useContacts(), { wrapper });

    await waitFor(async () => {
      await result.current.createContactAsync({
        name: 'New Contact',
        email: 'new@example.com',
        importSource: 'MANUAL',
      });
    });

    expect(mockContactService.createContact).toHaveBeenCalledWith({
      name: 'New Contact',
      email: 'new@example.com',
      importSource: 'MANUAL',
    });
  });

  it('deletes contact successfully', async () => {
    mockContactService.deleteContact.mockResolvedValue(undefined);
    mockContactService.getContacts.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    const { result } = renderHook(() => useContacts(), { wrapper });

    await waitFor(async () => {
      await result.current.deleteContactAsync('contact-id');
    });

    expect(mockContactService.deleteContact).toHaveBeenCalledWith('contact-id');
  });

  it('handles error state', async () => {
    mockContactService.getContacts.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useContacts(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeTruthy();
  });

  it('supports filters', async () => {
    const mockContacts = {
      data: [{ id: '1', name: 'John Doe' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };

    mockContactService.getContacts.mockResolvedValue(mockContacts);

    const { result } = renderHook(
      () => useContacts({ filters: { tier: 'CLOSE_FRIENDS' } }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockContactService.getContacts).toHaveBeenCalledWith(
      { tier: 'CLOSE_FRIENDS' },
      expect.any(Object)
    );
  });
});
