import { Prisma, Contact, ImportSource, RelationshipTier, RelationshipType, CommunicationFrequency } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { PaginationParams, PaginatedResponse, getPaginationParams, createPaginatedResponse } from '../types/pagination';
import { encryptContactFields, decryptContactFields } from '../middleware/encryption';

export interface CreateContactData {
  name: string;
  phone?: string;
  email?: string;
  profileImage?: string;
  bio?: string;
  birthday?: Date;
  anniversary?: Date;
  notes?: string;
  importSource: ImportSource;
}

export interface UpdateContactData {
  name?: string;
  phone?: string;
  email?: string;
  profileImage?: string;
  bio?: string;
  birthday?: Date;
  anniversary?: Date;
  notes?: string;
  importSource?: ImportSource;
}

export interface ContactFilters {
  isDeleted?: boolean;
  importSource?: ImportSource;
  search?: string;
  tier?: string;
}

export interface ImportSummary {
  created: number;
  skipped: number;
  duplicates: number;
  contacts: Contact[];
}

export class ContactService {
  /**
   * Create a new contact
   * Encrypts sensitive fields (phone, email, notes) before saving
   */
  static async createContact(userId: string, data: CreateContactData): Promise<Contact> {
    try {
      // Encrypt sensitive fields
      const encryptedData = encryptContactFields({
        ...data,
        userId,
        profileImage: data.profileImage,
        birthday: data.birthday,
        anniversary: data.anniversary,
        importSource: data.importSource,
      });

      const contact = await prisma.contact.create({
        data: {
          userId,
          name: encryptedData.name,
          phone: encryptedData.phone || null,
          email: encryptedData.email || null,
          profileImage: encryptedData.profileImage || null,
          birthday: encryptedData.birthday || null,
          anniversary: encryptedData.anniversary || null,
          notes: encryptedData.notes || null,
          importSource: encryptedData.importSource,
        },
      });

      // Decrypt before returning
      return decryptContactFields(contact) as Contact;
    } catch (error) {
      throw new Error(`Failed to create contact: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get contacts with filters and pagination
   */
  static async getContacts(
    userId: string,
    filters?: ContactFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Contact>> {
    try {
      const { skip, take } = getPaginationParams(pagination);

      const where: Prisma.ContactWhereInput = {
        userId,
        isDeleted: filters?.isDeleted ?? false,
        ...(filters?.importSource && { importSource: filters.importSource }),
        // Note: Search only by name since email/phone are encrypted
        // Encrypted fields cannot be searched directly in the database
        ...(filters?.search && {
          name: { contains: filters.search, mode: 'insensitive' },
        }),
      };

      const [contacts, total] = await Promise.all([
        prisma.contact.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.contact.count({ where }),
      ]);

      // Decrypt sensitive fields
      const decryptedContacts = contacts.map((contact) => decryptContactFields(contact) as Contact);

      return createPaginatedResponse(decryptedContacts, total, pagination);
    } catch (error) {
      throw new Error(`Failed to get contacts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get contact by ID
   * Decrypts sensitive fields before returning
   */
  static async getContactById(userId: string, contactId: string): Promise<Contact | null> {
    try {
      const contact = await prisma.contact.findFirst({
        where: {
          id: contactId,
          userId,
          isDeleted: false,
        },
      });

      if (!contact) {
        return null;
      }

      // Decrypt sensitive fields
      return decryptContactFields(contact) as Contact;
    } catch (error) {
      throw new Error(`Failed to get contact: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update contact
   */
  static async updateContact(
    userId: string,
    contactId: string,
    data: UpdateContactData
  ): Promise<Contact> {
    try {
      // Verify contact belongs to user
      const existingContact = await prisma.contact.findFirst({
        where: {
          id: contactId,
          userId,
          isDeleted: false,
        },
      });

      if (!existingContact) {
        throw new Error('Contact not found');
      }

      // Encrypt sensitive fields in update data
      const encryptedData = encryptContactFields(data as any);

      const contact = await prisma.contact.update({
        where: { id: contactId },
        data: {
          ...encryptedData,
          updatedAt: new Date(),
        },
      });

      // Decrypt before returning
      return decryptContactFields(contact) as Contact;
    } catch (error) {
      if (error instanceof Error && error.message === 'Contact not found') {
        throw error;
      }
      throw new Error(`Failed to update contact: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Soft delete contact
   */
  static async deleteContact(userId: string, contactId: string): Promise<Contact> {
    try {
      // Verify contact belongs to user
      const existingContact = await prisma.contact.findFirst({
        where: {
          id: contactId,
          userId,
          isDeleted: false,
        },
      });

      if (!existingContact) {
        throw new Error('Contact not found');
      }

      const contact = await prisma.contact.update({
        where: { id: contactId },
        data: {
          isDeleted: true,
          updatedAt: new Date(),
        },
      });

      // Decrypt before returning
      return decryptContactFields(contact) as Contact;
    } catch (error) {
      if (error instanceof Error && error.message === 'Contact not found') {
        throw error;
      }
      throw new Error(`Failed to delete contact: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create contact with default relationship
   */
  static async createContactWithRelationship(
    userId: string,
    data: CreateContactData
  ): Promise<Contact & { relationship?: any }> {
    try {
      // Encrypt sensitive fields
      const encryptedData = encryptContactFields({
        ...data,
        userId,
        profileImage: data.profileImage,
        birthday: data.birthday,
        anniversary: data.anniversary,
        importSource: data.importSource,
      });

      const contact = await prisma.contact.create({
        data: {
          userId,
          name: encryptedData.name,
          phone: encryptedData.phone || null,
          email: encryptedData.email || null,
          profileImage: encryptedData.profileImage || null,
          birthday: encryptedData.birthday || null,
          anniversary: encryptedData.anniversary || null,
          notes: encryptedData.notes || null,
          importSource: encryptedData.importSource,
        },
      });

      // Create default relationship
      const relationship = await prisma.relationship.create({
        data: {
          userId,
          contactId: contact.id,
          tier: RelationshipTier.ACQUAINTANCES,
          relationshipType: RelationshipType.OTHER,
          communicationFrequency: CommunicationFrequency.MONTHLY,
          healthScore: 50,
          sharedInterests: [],
          importantDates: [],
        },
      });

      // Decrypt contact fields before returning
      const decryptedContact = decryptContactFields(contact) as Contact;

      return {
        ...decryptedContact,
        relationship,
      };
    } catch (error) {
      throw new Error(`Failed to create contact: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get contacts with relationship info, supports sorting and tier filtering
   */
  static async getContactsWithRelationships(
    userId: string,
    filters?: ContactFilters & { tier?: string },
    pagination?: PaginationParams,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<PaginatedResponse<Contact & { relationship?: any }>> {
    try {
      const { skip, take } = getPaginationParams(pagination);

      const where: Prisma.ContactWhereInput = {
        userId,
        isDeleted: filters?.isDeleted ?? false,
        ...(filters?.importSource && { importSource: filters.importSource }),
        ...(filters?.search && {
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { email: { contains: filters.search, mode: 'insensitive' } },
            { phone: { contains: filters.search, mode: 'insensitive' } },
          ],
        }),
        ...(filters?.tier && {
          relationships: {
            some: {
              tier: filters.tier as any,
            },
          },
        }),
      };

      const orderBy: Prisma.ContactOrderByWithRelationInput =
        sortBy === 'name'
          ? { name: sortOrder }
          : sortBy === 'lastContactDate'
          ? { relationships: { _count: sortOrder } }
          : { createdAt: sortOrder };

      const [contacts, total] = await Promise.all([
        prisma.contact.findMany({
          where,
          skip,
          take,
          orderBy,
          include: {
            relationships: {
              take: 1,
            },
          },
        }),
        prisma.contact.count({ where }),
      ]);

      // Decrypt sensitive fields and attach relationships
      const contactsWithRelationships = contacts.map((contact) => {
        const decrypted = decryptContactFields(contact) as Contact;
        return {
          ...decrypted,
          relationship: contact.relationships[0] || null,
        };
      });

      return createPaginatedResponse(contactsWithRelationships, total, pagination);
    } catch (error) {
      throw new Error(`Failed to get contacts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get contact with full relationship details and recent interactions
   */
  static async getContactWithDetails(
    userId: string,
    contactId: string
  ): Promise<(Contact & { relationship?: any; recentInteractions?: any[] }) | null> {
    try {
      const contact = await prisma.contact.findFirst({
        where: {
          id: contactId,
          userId,
          isDeleted: false,
        },
        include: {
          relationships: {
            include: {
              interactions: {
                orderBy: { date: 'desc' },
                take: 10,
              },
            },
          },
        },
      });

      if (!contact) {
        return null;
      }

      // Decrypt sensitive fields
      const decryptedContact = decryptContactFields(contact) as Contact;

      return {
        ...decryptedContact,
        relationship: contact.relationships[0] || null,
        recentInteractions: contact.relationships[0]?.interactions || [],
      };
    } catch (error) {
      throw new Error(`Failed to get contact: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Import multiple contacts with duplicate handling
   */
  static async importContacts(
    userId: string,
    contacts: CreateContactData[]
  ): Promise<ImportSummary> {
    try {
      const created: Contact[] = [];
      const skipped: string[] = [];
      const duplicates: string[] = [];

      for (const contactData of contacts) {
        // Check for duplicates by phone or email
        // Since fields are encrypted, we need to encrypt the search values first
        let existingContact = null;
        
        if (contactData.phone || contactData.email) {
          // Encrypt the values we're searching for
          const encryptedPhone = contactData.phone ? encryptContactFields({ phone: contactData.phone }).phone : null;
          const encryptedEmail = contactData.email ? encryptContactFields({ email: contactData.email }).email : null;

          existingContact = await prisma.contact.findFirst({
            where: {
              userId,
              isDeleted: false,
              OR: [
                ...(encryptedPhone ? [{ phone: encryptedPhone }] : []),
                ...(encryptedEmail ? [{ email: encryptedEmail }] : []),
              ],
            },
          });
        }

        if (existingContact) {
          duplicates.push(contactData.name);
          continue;
        }

        // Skip if no phone or email
        if (!contactData.phone && !contactData.email) {
          skipped.push(contactData.name);
          continue;
        }

        try {
          // Encrypt sensitive fields
          const encryptedData = encryptContactFields(contactData);

          const contact = await prisma.contact.create({
            data: {
              userId,
              name: encryptedData.name,
              phone: encryptedData.phone || null,
              email: encryptedData.email || null,
              profileImage: encryptedData.profileImage || null,
              birthday: encryptedData.birthday || null,
              anniversary: encryptedData.anniversary || null,
              notes: encryptedData.notes || null,
              importSource: encryptedData.importSource || ImportSource.PHONE,
            },
          });

          // Create default relationship
          await prisma.relationship.create({
            data: {
              userId,
              contactId: contact.id,
              tier: RelationshipTier.ACQUAINTANCES,
              relationshipType: RelationshipType.OTHER,
              communicationFrequency: CommunicationFrequency.MONTHLY,
              healthScore: 50,
              sharedInterests: [],
              importantDates: [],
            },
          });

          // Decrypt before adding to created array
          created.push(decryptContactFields(contact) as Contact);
        } catch (error) {
          skipped.push(contactData.name);
        }
      }

      return {
        created: created.length,
        skipped: skipped.length,
        duplicates: duplicates.length,
        contacts: created,
      };
    } catch (error) {
      throw new Error(`Failed to import contacts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search contacts
   */
  static async searchContacts(
    userId: string,
    query: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Contact>> {
    try {
      const { skip, take } = getPaginationParams(pagination);

      // Note: Search only by name since email/phone are encrypted
      // Encrypted fields cannot be searched directly in the database
      const where: Prisma.ContactWhereInput = {
        userId,
        isDeleted: false,
        name: { contains: query, mode: 'insensitive' },
      };

      const [contacts, total] = await Promise.all([
        prisma.contact.findMany({
          where,
          skip,
          take,
          orderBy: { name: 'asc' },
        }),
        prisma.contact.count({ where }),
      ]);

      // Decrypt sensitive fields
      const decryptedContacts = contacts.map((contact) => decryptContactFields(contact) as Contact);

      return createPaginatedResponse(decryptedContacts, total, pagination);
    } catch (error) {
      throw new Error(`Failed to search contacts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
