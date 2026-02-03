import React from 'react';
import React from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

/**
 * Create a test QueryClient with default options
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Custom render function that includes all providers
 */
export function renderWithProviders(
  ui: React.ReactElement,
  {
    queryClient = createTestQueryClient(),
    ...renderOptions
  }: RenderOptions & { queryClient?: QueryClient } = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <PaperProvider>
            <NavigationContainer>
              {children}
            </NavigationContainer>
          </PaperProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

/**
 * Mock contact data factory
 */
export const mockContact = {
  id: 'contact-1',
  name: 'John Doe',
  phone: '+1234567890',
  email: 'john@example.com',
  profileImage: null,
  birthday: null,
  anniversary: null,
  notes: null,
  importSource: 'MANUAL' as const,
  isDeleted: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  userId: 'user-1',
  relationship: {
    id: 'rel-1',
    tier: 'CLOSE_FRIENDS' as const,
    relationshipType: 'FRIEND' as const,
    communicationFrequency: 'WEEKLY' as const,
    lastContactDate: new Date().toISOString(),
    healthScore: 75,
    sharedInterests: [],
    importantDates: [],
  },
};

/**
 * Mock event data factory
 */
export const mockEvent = {
  id: 'event-1',
  title: 'Test Event',
  description: 'Test description',
  eventType: 'SOCIAL',
  date: new Date().toISOString(),
  startTime: '10:00',
  endTime: '12:00',
  timezone: 'UTC',
  locationName: 'Test Location',
  locationAddress: null,
  locationPlaceId: null,
  locationLat: null,
  locationLng: null,
  estimatedCost: 100,
  actualCost: null,
  budgetTier: 'MODERATE' as const,
  status: 'PLANNED' as const,
  isRecurring: false,
  recurringPattern: null,
  linkedSavingsGoalId: null,
  calendarEventId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  userId: 'user-1',
};

/**
 * Mock user data factory
 */
export const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  profileImage: null,
  timezone: 'UTC',
  isVerified: true,
  isActive: true,
  notificationPreferences: {
    email: true,
    push: true,
    sms: false,
  },
};

// Re-export everything from testing library
export * from '@testing-library/react-native';
