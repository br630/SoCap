import request from 'supertest';
import { createTestApp } from '../utils/testApp';
import { TestFactory, TestCleanup } from '../utils/testHelpers';
import { ContactService } from '../../services/contactService';
import * as firebase from '../../config/firebase';

// Mock Firebase
jest.mock('../../config/firebase');
const mockFirebase = firebase as jest.Mocked<typeof firebase>;

describe('Contacts API Integration Tests', () => {
  const app = createTestApp();
  let testUser: any;
  let authToken: string;

  beforeEach(async () => {
    await TestCleanup.cleanAll();
    testUser = await TestFactory.createUser();
    authToken = 'Bearer test-token';

    mockFirebase.verifyIdToken.mockResolvedValue({
      uid: 'firebase-uid',
      email: testUser.email,
      email_verified: true,
    } as any);
  });

  afterEach(async () => {
    if (testUser) {
      await TestCleanup.cleanUser(testUser.id);
    }
  });

  describe('POST /api/contacts', () => {
    it('should create a new contact', async () => {
      const response = await request(app)
        .post('/api/contacts')
        .set('Authorization', authToken)
        .send({
          name: 'John Doe',
          phone: '+1234567890',
          email: 'john@example.com',
          importSource: 'MANUAL',
        });

      expect(response.status).toBe(201);
      expect(response.body.contact).toBeDefined();
      expect(response.body.contact.name).toBe('John Doe');
    });

    it('should return 400 if name is missing', async () => {
      const response = await request(app)
        .post('/api/contacts')
        .set('Authorization', authToken)
        .send({
          phone: '+1234567890',
          importSource: 'MANUAL',
        });

      expect(response.status).toBe(400);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/contacts')
        .send({
          name: 'John Doe',
          importSource: 'MANUAL',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/contacts', () => {
    beforeEach(async () => {
      await ContactService.createContact(testUser.id, {
        name: 'Contact 1',
        importSource: 'MANUAL',
      });
      await ContactService.createContact(testUser.id, {
        name: 'Contact 2',
        importSource: 'MANUAL',
      });
    });

    it('should retrieve all contacts', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.contacts).toBeDefined();
      expect(response.body.contacts.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/contacts?page=1&limit=1')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.contacts.data.length).toBeLessThanOrEqual(1);
      expect(response.body.contacts.pagination.page).toBe(1);
    });

    it('should filter contacts by search query', async () => {
      const response = await request(app)
        .get('/api/contacts?search=Contact 1')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.contacts.data.length).toBeGreaterThan(0);
      expect(response.body.contacts.data[0].name).toContain('Contact 1');
    });
  });

  describe('GET /api/contacts/:id', () => {
    let testContact: any;

    beforeEach(async () => {
      testContact = await ContactService.createContact(testUser.id, {
        name: 'Test Contact',
        importSource: 'MANUAL',
      });
    });

    it('should retrieve contact by ID', async () => {
      const response = await request(app)
        .get(`/api/contacts/${testContact.id}`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.contact).toBeDefined();
      expect(response.body.contact.id).toBe(testContact.id);
    });

    it('should return 404 for non-existent contact', async () => {
      const response = await request(app)
        .get('/api/contacts/non-existent-id')
        .set('Authorization', authToken);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/contacts/:id', () => {
    let testContact: any;

    beforeEach(async () => {
      testContact = await ContactService.createContact(testUser.id, {
        name: 'Original Name',
        importSource: 'MANUAL',
      });
    });

    it('should update contact', async () => {
      const response = await request(app)
        .put(`/api/contacts/${testContact.id}`)
        .set('Authorization', authToken)
        .send({
          name: 'Updated Name',
          phone: '+9876543210',
        });

      expect(response.status).toBe(200);
      expect(response.body.contact.name).toBe('Updated Name');
      expect(response.body.contact.phone).toBe('+9876543210');
    });

    it('should return 404 for non-existent contact', async () => {
      const response = await request(app)
        .put('/api/contacts/non-existent-id')
        .set('Authorization', authToken)
        .send({
          name: 'Updated',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/contacts/:id', () => {
    let testContact: any;

    beforeEach(async () => {
      testContact = await ContactService.createContact(testUser.id, {
        name: 'To Delete',
        importSource: 'MANUAL',
      });
    });

    it('should delete contact', async () => {
      const response = await request(app)
        .delete(`/api/contacts/${testContact.id}`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify contact is soft deleted
      const getResponse = await request(app)
        .get(`/api/contacts/${testContact.id}`)
        .set('Authorization', authToken);

      expect(getResponse.status).toBe(404);
    });
  });

  describe('POST /api/contacts/import', () => {
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

      const response = await request(app)
        .post('/api/contacts/import')
        .set('Authorization', authToken)
        .send({
          contacts: contactsToImport,
          importSource: 'CONTACTS_APP',
        });

      expect(response.status).toBe(200);
      expect(response.body.summary.created).toBe(2);
      expect(response.body.contacts.length).toBe(2);
    });

    it('should handle duplicate detection', async () => {
      // Create existing contact
      await ContactService.createContact(testUser.id, {
        name: 'Existing',
        phone: '+1234567890',
        importSource: 'MANUAL',
      });

      const response = await request(app)
        .post('/api/contacts/import')
        .set('Authorization', authToken)
        .send({
          contacts: [
            {
              name: 'Existing',
              phone: '+1234567890',
            },
            {
              name: 'New Contact',
              phone: '+9876543210',
            },
          ],
          importSource: 'CONTACTS_APP',
        });

      expect(response.status).toBe(200);
      expect(response.body.summary.duplicates).toBeGreaterThan(0);
    });
  });
});
