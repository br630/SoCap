import request from 'supertest';
import { createTestApp } from '../utils/testApp';
import { TestFactory, TestCleanup } from '../utils/testHelpers';
import { EventService } from '../../services/eventService';
import * as firebase from '../../config/firebase';
import { EventStatus, BudgetTier } from '@prisma/client';

// Mock Firebase
jest.mock('../../config/firebase');
const mockFirebase = firebase as jest.Mocked<typeof firebase>;

describe('Events API Integration Tests', () => {
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

  describe('POST /api/events', () => {
    it('should create a new event', async () => {
      const eventData = {
        title: 'Test Event',
        description: 'Test description',
        eventType: 'SOCIAL',
        date: new Date().toISOString(),
        startTime: '10:00',
        endTime: '12:00',
        timezone: 'UTC',
        estimatedCost: 100,
        budgetTier: BudgetTier.MODERATE,
      };

      const response = await request(app)
        .post('/api/events')
        .set('Authorization', authToken)
        .send(eventData);

      expect(response.status).toBe(201);
      expect(response.body.event).toBeDefined();
      expect(response.body.event.title).toBe('Test Event');
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/events')
        .set('Authorization', authToken)
        .send({
          title: 'Test Event',
          // Missing required fields
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/events', () => {
    beforeEach(async () => {
      await TestFactory.createEvent(testUser.id, {
        title: 'Event 1',
        status: EventStatus.PLANNED,
      });
      await TestFactory.createEvent(testUser.id, {
        title: 'Event 2',
        status: EventStatus.CONFIRMED,
      });
    });

    it('should retrieve all events', async () => {
      const response = await request(app)
        .get('/api/events')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.events).toBeDefined();
      expect(response.body.events.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter events by status', async () => {
      const response = await request(app)
        .get('/api/events?status=PLANNED')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.events.data.every((e: any) => e.status === 'PLANNED')).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/events?page=1&limit=1')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.events.data.length).toBeLessThanOrEqual(1);
    });
  });

  describe('GET /api/events/:id', () => {
    let testEvent: any;

    beforeEach(async () => {
      testEvent = await TestFactory.createEvent(testUser.id, {
        title: 'Test Event',
      });
    });

    it('should retrieve event by ID', async () => {
      const response = await request(app)
        .get(`/api/events/${testEvent.id}`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.event).toBeDefined();
      expect(response.body.event.id).toBe(testEvent.id);
    });

    it('should return 404 for non-existent event', async () => {
      const response = await request(app)
        .get('/api/events/non-existent-id')
        .set('Authorization', authToken);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/events/:id', () => {
    let testEvent: any;

    beforeEach(async () => {
      testEvent = await TestFactory.createEvent(testUser.id, {
        title: 'Original Title',
      });
    });

    it('should update event', async () => {
      const response = await request(app)
        .put(`/api/events/${testEvent.id}`)
        .set('Authorization', authToken)
        .send({
          title: 'Updated Title',
          description: 'Updated description',
        });

      expect(response.status).toBe(200);
      expect(response.body.event.title).toBe('Updated Title');
      expect(response.body.event.description).toBe('Updated description');
    });

    it('should return 404 for non-existent event', async () => {
      const response = await request(app)
        .put('/api/events/non-existent-id')
        .set('Authorization', authToken)
        .send({
          title: 'Updated',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/events/:id/attendees', () => {
    let testEvent: any;
    let testContact1: any;
    let testContact2: any;

    beforeEach(async () => {
      testEvent = await TestFactory.createEvent(testUser.id);
      testContact1 = await TestFactory.createContact(testUser.id);
      testContact2 = await TestFactory.createContact(testUser.id);
    });

    it('should add attendees to event', async () => {
      const response = await request(app)
        .post(`/api/events/${testEvent.id}/attendees`)
        .set('Authorization', authToken)
        .send({
          contactIds: [testContact1.id, testContact2.id],
        });

      expect(response.status).toBe(200);
      expect(response.body.attendees).toBeDefined();
      expect(response.body.attendees.length).toBe(2);
    });

    it('should return 404 for non-existent event', async () => {
      const response = await request(app)
        .post('/api/events/non-existent-id/attendees')
        .set('Authorization', authToken)
        .send({
          contactIds: [testContact1.id],
        });

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/events/:id/attendees/:attendeeId/rsvp', () => {
    let testEvent: any;
    let testContact: any;
    let attendee: any;

    beforeEach(async () => {
      testEvent = await TestFactory.createEvent(testUser.id);
      testContact = await TestFactory.createContact(testUser.id);
      
      // Add attendee
      const addResponse = await EventService.addAttendees(
        testUser.id,
        testEvent.id,
        [testContact.id]
      );
      attendee = addResponse[0];
    });

    it('should update RSVP status', async () => {
      const response = await request(app)
        .put(`/api/events/${testEvent.id}/attendees/${attendee.id}/rsvp`)
        .set('Authorization', authToken)
        .send({
          status: 'CONFIRMED',
          plusOnes: 1,
        });

      expect(response.status).toBe(200);
      expect(response.body.attendee.rsvpStatus).toBe('CONFIRMED');
      expect(response.body.attendee.plusOnes).toBe(1);
    });
  });

  describe('DELETE /api/events/:id', () => {
    let testEvent: any;

    beforeEach(async () => {
      testEvent = await TestFactory.createEvent(testUser.id);
    });

    it('should cancel event', async () => {
      const response = await request(app)
        .delete(`/api/events/${testEvent.id}`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify event is cancelled
      const getResponse = await request(app)
        .get(`/api/events/${testEvent.id}`)
        .set('Authorization', authToken);

      expect(getResponse.body.event.status).toBe(EventStatus.CANCELLED);
    });
  });
});
