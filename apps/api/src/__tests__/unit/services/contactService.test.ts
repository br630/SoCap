import { ContactService } from '../../../services/contactService';
import { TestFactory, TestCleanup } from '../../utils/testHelpers';
import { ImportSource } from '@prisma/client';

describe('ContactService', () => {
  let testUser: any;
  let testContact: any;

  beforeEach(async () => {
    await TestCleanup.cleanAll();
    testUser = await TestFactory.createUser();
  });

  afterEach(async () => {
    if (testUser) {
      await TestCleanup.cleanUser(testUser.id);
    }
  });

  describe('createContact', () => {
    it('should create a new contact successfully', async () => {
      const contactData = {
        name: 'John Doe',
        phone: '+1234567890',
        email: 'john@example.com',
        importSource: ImportSource.MANUAL,
      };

      testContact = await ContactService.createContact(testUser.id, contactData);

      expect(testContact).toBeDefined();
      expect(testContact.name).toBe(contactData.name);
      expect(testContact.userId).toBe(testUser.id);
      expect(testContact.importSource).toBe(ImportSource.MANUAL);
    });

    it('should create contact with minimal data', async () => {
      testContact = await ContactService.createContact(testUser.id, {
        name: 'Jane Doe',
        importSource: ImportSource.MANUAL,
      });

      expect(testContact.name).toBe('Jane Doe');
      expect(testContact.phone).toBeNull();
      expect(testContact.email).toBeNull();
    });
  });

  describe('getContacts', () => {
    beforeEach(async () => {
      // Create multiple contacts
      await ContactService.createContact(testUser.id, {
        name: 'Contact 1',
        importSource: ImportSource.MANUAL,
      });
      await ContactService.createContact(testUser.id, {
        name: 'Contact 2',
        importSource: ImportSource.MANUAL,
      });
      await ContactService.createContact(testUser.id, {
        name: 'Contact 3',
        importSource: ImportSource.CONTACTS_APP,
      });
    });

    it('should retrieve all contacts for user', async () => {
      const result = await ContactService.getContacts(testUser.id);

      expect(result.data.length).toBeGreaterThanOrEqual(3);
      expect(result.total).toBeGreaterThanOrEqual(3);
    });

    it('should filter contacts by import source', async () => {
      const result = await ContactService.getContacts(testUser.id, {
        importSource: ImportSource.CONTACTS_APP,
      });

      expect(result.data.every((c) => c.importSource === ImportSource.CONTACTS_APP)).toBe(true);
    });

    it('should paginate contacts', async () => {
      const result = await ContactService.getContacts(testUser.id, undefined, {
        page: 1,
        limit: 2,
      });

      expect(result.data.length).toBeLessThanOrEqual(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(2);
    });

    it('should search contacts by name', async () => {
      const result = await ContactService.getContacts(testUser.id, {
        search: 'Contact 1',
      });

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0].name).toContain('Contact 1');
    });
  });

  describe('getContactById', () => {
    it('should retrieve contact by ID', async () => {
      testContact = await ContactService.createContact(testUser.id, {
        name: 'Test Contact',
        importSource: ImportSource.MANUAL,
      });

      const retrieved = await ContactService.getContactById(testUser.id, testContact.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(testContact.id);
      expect(retrieved?.name).toBe('Test Contact');
    });

    it('should return null for non-existent contact', async () => {
      const contact = await ContactService.getContactById(testUser.id, 'non-existent-id');
      expect(contact).toBeNull();
    });

    it('should not return contact belonging to another user', async () => {
      const otherUser = await TestFactory.createUser();
      testContact = await ContactService.createContact(otherUser.id, {
        name: 'Other User Contact',
        importSource: ImportSource.MANUAL,
      });

      const contact = await ContactService.getContactById(testUser.id, testContact.id);
      expect(contact).toBeNull();

      await TestCleanup.cleanUser(otherUser.id);
    });
  });

  describe('updateContact', () => {
    it('should update contact successfully', async () => {
      testContact = await ContactService.createContact(testUser.id, {
        name: 'Original Name',
        importSource: ImportSource.MANUAL,
      });

      const updated = await ContactService.updateContact(testUser.id, testContact.id, {
        name: 'Updated Name',
        phone: '+9876543210',
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.phone).toBe('+9876543210');
    });

    it('should throw error when contact not found', async () => {
      await expect(
        ContactService.updateContact(testUser.id, 'non-existent-id', {
          name: 'Updated',
        })
      ).rejects.toThrow('Contact not found');
    });
  });

  describe('deleteContact', () => {
    it('should soft delete contact', async () => {
      testContact = await ContactService.createContact(testUser.id, {
        name: 'To Delete',
        importSource: ImportSource.MANUAL,
      });

      const deleted = await ContactService.deleteContact(testUser.id, testContact.id);

      expect(deleted.isDeleted).toBe(true);

      // Verify contact still exists but is deleted
      const contact = await ContactService.getContactById(testUser.id, testContact.id);
      expect(contact).toBeNull(); // Should not return deleted contacts by default
    });
  });

  describe('importContacts', () => {
    it('should import multiple contacts', async () => {
      const contactsToImport = [
        {
          name: 'Imported 1',
          phone: '+1111111111',
          email: 'import1@example.com',
        },
        {
          name: 'Imported 2',
          phone: '+2222222222',
          email: 'import2@example.com',
        },
      ];

      const result = await ContactService.importContacts(
        testUser.id,
        contactsToImport,
        ImportSource.CONTACTS_APP
      );

      expect(result.created).toBe(2);
      expect(result.contacts.length).toBe(2);
    });

    it('should detect and skip duplicates', async () => {
      // Create existing contact
      await ContactService.createContact(testUser.id, {
        name: 'Existing Contact',
        phone: '+1234567890',
        importSource: ImportSource.MANUAL,
      });

      const contactsToImport = [
        {
          name: 'Existing Contact',
          phone: '+1234567890',
        },
        {
          name: 'New Contact',
          phone: '+9876543210',
        },
      ];

      const result = await ContactService.importContacts(
        testUser.id,
        contactsToImport,
        ImportSource.CONTACTS_APP
      );

      expect(result.created).toBe(1);
      expect(result.duplicates).toBe(1);
      expect(result.skipped).toBe(1);
    });
  });
});
