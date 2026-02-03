import { Contact, CreateContactData, PaginatedResponse } from '../../services/contactService';
import { User } from '../../services/authService';

/**
 * Mock API responses for testing
 */

export const mockContacts: Contact[] = [
  {
    id: 'contact-1',
    userId: 'user-1',
    name: 'John Doe',
    phone: '+1234567890',
    email: 'john@example.com',
    profileImage: null,
    birthday: null,
    anniversary: null,
    notes: null,
    importSource: 'MANUAL',
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    relationship: {
      id: 'rel-1',
      tier: 'CLOSE_FRIENDS',
      relationshipType: 'FRIEND',
      communicationFrequency: 'WEEKLY',
      lastContactDate: new Date().toISOString(),
      healthScore: 75,
      sharedInterests: [],
      importantDates: [],
    },
  },
  {
    id: 'contact-2',
    userId: 'user-1',
    name: 'Jane Smith',
    phone: '+0987654321',
    email: 'jane@example.com',
    profileImage: null,
    birthday: null,
    anniversary: null,
    notes: null,
    importSource: 'PHONE',
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const mockUser: User = {
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

export const mockPaginatedContacts: PaginatedResponse<Contact> = {
  data: mockContacts,
  pagination: {
    page: 1,
    limit: 20,
    total: 2,
    totalPages: 1,
  },
};

/**
 * Mock service implementations
 */
export const createMockContactService = () => ({
  getContacts: jest.fn().mockResolvedValue(mockPaginatedContacts),
  getContactById: jest.fn().mockResolvedValue(mockContacts[0]),
  createContact: jest.fn().mockResolvedValue(mockContacts[0]),
  updateContact: jest.fn().mockResolvedValue(mockContacts[0]),
  deleteContact: jest.fn().mockResolvedValue(undefined),
  importFromPhone: jest.fn().mockResolvedValue({
    created: 1,
    skipped: 0,
    duplicates: 0,
    contacts: [mockContacts[0]],
  }),
});

export const createMockAuthService = () => ({
  login: jest.fn().mockResolvedValue({
    user: mockUser,
    token: 'mock-access-token',
  }),
  register: jest.fn().mockResolvedValue({
    user: mockUser,
    token: 'mock-access-token',
  }),
  logout: jest.fn().mockResolvedValue(undefined),
  refreshToken: jest.fn().mockResolvedValue('new-access-token'),
  getCurrentUser: jest.fn().mockResolvedValue(mockUser),
});
