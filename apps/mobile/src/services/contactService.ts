import { apiClient } from '../config/api';
import * as Contacts from 'expo-contacts';

export interface Contact {
  id: string;
  userId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  profileImage?: string | null;
  bio?: string | null;
  birthday?: string | null;
  anniversary?: string | null;
  notes?: string | null;
  importSource: 'PHONE' | 'MANUAL' | 'SOCIAL';
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  relationship?: Relationship;
}

export interface Relationship {
  id: string;
  tier: 'INNER_CIRCLE' | 'CLOSE_FRIENDS' | 'FRIENDS' | 'ACQUAINTANCES' | 'PROFESSIONAL';
  customLabel?: string | null;
  relationshipType: 'FAMILY' | 'FRIEND' | 'COLLEAGUE' | 'ROMANTIC' | 'OTHER';
  communicationFrequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY';
  lastContactDate?: string | null;
  healthScore: number;
  sharedInterests?: string[];
  importantDates?: any[];
}

export interface Interaction {
  id: string;
  type: 'CALL' | 'TEXT' | 'VIDEO_CALL' | 'IN_PERSON' | 'EVENT';
  date: string;
  duration?: number | null;
  notes?: string | null;
  sentiment?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | null;
  createdAt: string;
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

export interface ContactFilters {
  search?: string;
  tier?: 'INNER_CIRCLE' | 'CLOSE_FRIENDS' | 'FRIENDS' | 'ACQUAINTANCES' | 'PROFESSIONAL';
  importSource?: 'PHONE' | 'MANUAL' | 'SOCIAL';
  sortBy?: 'name' | 'createdAt' | 'lastContactDate';
  sortOrder?: 'asc' | 'desc';
}

export interface ImportantEvent {
  name: string;
  date: string;
}

export interface CreateContactData {
  name: string;
  phone?: string;
  email?: string;
  profileImage?: string;
  bio?: string;
  birthday?: string;
  anniversary?: string;
  notes?: string;
  importantEvents?: ImportantEvent[];
  importSource: 'PHONE' | 'MANUAL' | 'SOCIAL';
}

export interface UpdateContactData {
  name?: string;
  phone?: string;
  email?: string;
  profileImage?: string;
  bio?: string;
  birthday?: string;
  anniversary?: string;
  notes?: string;
  importantEvents?: ImportantEvent[];
  importSource?: 'PHONE' | 'MANUAL' | 'SOCIAL';
}

export interface UpdateRelationshipData {
  tier?: 'INNER_CIRCLE' | 'CLOSE_FRIENDS' | 'FRIENDS' | 'ACQUAINTANCES' | 'PROFESSIONAL';
  customLabel?: string;
  relationshipType?: 'FAMILY' | 'FRIEND' | 'COLLEAGUE' | 'ROMANTIC' | 'OTHER';
  communicationFrequency?: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY';
  sharedInterests?: string[];
  importantDates?: any[];
}

export interface LogInteractionData {
  type: 'CALL' | 'TEXT' | 'VIDEO_CALL' | 'IN_PERSON' | 'EVENT';
  date: string;
  duration?: number;
  notes?: string;
  sentiment?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
}

export interface ImportSummary {
  created: number;
  skipped: number;
  duplicates: number;
  contacts: Contact[];
}

class ContactService {
  /**
   * Get all contacts with filters and pagination
   */
  async getContacts(
    filters?: ContactFilters,
    pagination?: { page?: number; limit?: number }
  ): Promise<PaginatedResponse<Contact>> {
    const params = new URLSearchParams();
    
    if (pagination?.page) params.append('page', pagination.page.toString());
    if (pagination?.limit) params.append('limit', pagination.limit.toString());
    if (filters?.search) params.append('search', filters.search);
    if (filters?.tier) params.append('tier', filters.tier);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

    const response = await apiClient.get<PaginatedResponse<Contact>>(`/contacts?${params}`);
    return response.data;
  }

  /**
   * Get a single contact by ID with full details
   */
  async getContact(id: string): Promise<Contact & { recentInteractions?: Interaction[] }> {
    const response = await apiClient.get<Contact & { recentInteractions?: Interaction[] }>(`/contacts/${id}`);
    return response.data;
  }

  /**
   * Create a new contact
   */
  async createContact(data: CreateContactData): Promise<Contact> {
    const response = await apiClient.post<Contact>('/contacts', data);
    return response.data;
  }

  /**
   * Update a contact
   */
  async updateContact(id: string, data: UpdateContactData): Promise<Contact> {
    const response = await apiClient.put<Contact>(`/contacts/${id}`, data);
    return response.data;
  }

  /**
   * Delete a contact
   */
  async deleteContact(id: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/contacts/${id}`);
    return response.data;
  }

  /**
   * Import contacts from phone
   */
  async importFromPhone(contacts: CreateContactData[]): Promise<ImportSummary> {
    const response = await apiClient.post<{ success: boolean; summary: ImportSummary }>('/contacts/import', {
      contacts,
    });
    return response.data.summary;
  }

  /**
   * Update relationship settings for a contact
   */
  async updateRelationship(id: string, data: UpdateRelationshipData): Promise<{ success: boolean; relationship: Relationship }> {
    const response = await apiClient.put<{ success: boolean; relationship: Relationship }>(
      `/contacts/${id}/relationship`,
      data
    );
    return response.data;
  }

  /**
   * Log an interaction with a contact
   */
  async logInteraction(id: string, data: LogInteractionData): Promise<{ success: boolean; interaction: Interaction }> {
    const response = await apiClient.post<{ success: boolean; interaction: Interaction }>(
      `/contacts/${id}/interactions`,
      data
    );
    return response.data;
  }

  /**
   * Get interaction history for a contact
   */
  async getInteractionHistory(
    id: string,
    pagination?: { page?: number; limit?: number }
  ): Promise<PaginatedResponse<Interaction>> {
    const params = new URLSearchParams();
    if (pagination?.page) params.append('page', pagination.page.toString());
    if (pagination?.limit) params.append('limit', pagination.limit.toString());

    const response = await apiClient.get<PaginatedResponse<Interaction>>(
      `/contacts/${id}/interactions?${params}`
    );
    return response.data;
  }

  /**
   * Request contacts permission and fetch phone contacts
   */
  async requestPhoneContacts(): Promise<Contacts.Contact[]> {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Contacts permission denied');
    }

    const { data } = await Contacts.getContactsAsync({
      fields: [
        Contacts.Fields.Name,
        Contacts.Fields.PhoneNumbers,
        Contacts.Fields.Emails,
        Contacts.Fields.Image,
        Contacts.Fields.Birthday,
      ],
    });

    return data;
  }

  /**
   * Convert phone contacts to CreateContactData format
   */
  convertPhoneContacts(phoneContacts: Contacts.Contact[]): CreateContactData[] {
    return phoneContacts
      .filter((contact) => contact.name)
      .map((contact) => ({
        name: contact.name || 'Unknown',
        phone: contact.phoneNumbers?.[0]?.number || undefined,
        email: contact.emails?.[0]?.email || undefined,
        profileImage: contact.imageUri || undefined,
        birthday: contact.birthday
          ? new Date(
              contact.birthday.year || new Date().getFullYear(),
              (contact.birthday.month || 1) - 1,
              contact.birthday.day || 1
            ).toISOString()
          : undefined,
        importSource: 'PHONE' as const,
      }));
  }
}

export default new ContactService();
