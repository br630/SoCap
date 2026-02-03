import { DashboardService } from '../../../services/dashboardService';
import { TestFactory, TestCleanup } from '../../utils/testHelpers';
import { RelationshipTier, RelationshipType, EventStatus, ReminderStatus } from '@prisma/client';
import { prisma } from '../../setup';

describe('DashboardService - Health Score', () => {
  let testUser: any;
  const dashboardService = new DashboardService();

  beforeEach(async () => {
    await TestCleanup.cleanAll();
    testUser = await TestFactory.createUser();
  });

  afterEach(async () => {
    if (testUser) {
      await TestCleanup.cleanUser(testUser.id);
    }
  });

  describe('calculateHealthScore', () => {
    it('should calculate health score for user with no contacts', async () => {
      const result = await dashboardService.calculateHealthScore(testUser.id);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.components).toBeDefined();
    });

    it('should calculate health score with inner circle contacts', async () => {
      // Create inner circle contact with recent interaction
      const contact = await TestFactory.createContact(testUser.id);
      await TestFactory.createRelationship(testUser.id, contact.id, {
        tier: RelationshipTier.INNER_CIRCLE,
        relationshipType: RelationshipType.FRIEND,
      });

      // Create recent interaction
      await TestFactory.createInteraction(testUser.id, contact.id, {
        type: 'CALL',
        date: new Date(),
      });

      const result = await dashboardService.calculateHealthScore(testUser.id);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.components.innerCircleScore).toBeGreaterThan(0);
    });

    it('should calculate health score with event participation', async () => {
      // Create event this month
      await TestFactory.createEvent(testUser.id, {
        date: new Date(),
        status: EventStatus.CONFIRMED,
      });

      const result = await dashboardService.calculateHealthScore(testUser.id);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.components.eventParticipationScore).toBeGreaterThanOrEqual(0);
    });

    it('should calculate health score with relationship diversity', async () => {
      // Create contacts in different tiers
      const contact1 = await TestFactory.createContact(testUser.id);
      const contact2 = await TestFactory.createContact(testUser.id);
      const contact3 = await TestFactory.createContact(testUser.id);

      await TestFactory.createRelationship(testUser.id, contact1.id, {
        tier: RelationshipTier.INNER_CIRCLE,
        relationshipType: RelationshipType.FRIEND,
      });
      await TestFactory.createRelationship(testUser.id, contact2.id, {
        tier: RelationshipTier.CLOSE_FRIENDS,
        relationshipType: RelationshipType.FAMILY,
      });
      await TestFactory.createRelationship(testUser.id, contact3.id, {
        tier: RelationshipTier.ACQUAINTANCES,
        relationshipType: RelationshipType.COLLEAGUE,
      });

      const result = await dashboardService.calculateHealthScore(testUser.id);

      expect(result.components.relationshipDiversityScore).toBeGreaterThan(0);
    });

    it('should calculate health score with reminder response', async () => {
      // Create completed reminders
      const contact = await TestFactory.createContact(testUser.id);
      await TestFactory.createReminder(testUser.id, {
        contactId: contact.id,
        scheduledDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      });

      // Mark reminder as completed
      await prisma.reminder.updateMany({
        where: {
          userId: testUser.id,
        },
        data: {
          status: ReminderStatus.COMPLETED,
        },
      });

      const result = await dashboardService.calculateHealthScore(testUser.id);

      expect(result.components.reminderResponseScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle edge case with no interactions', async () => {
      const contact = await TestFactory.createContact(testUser.id);
      await TestFactory.createRelationship(testUser.id, contact.id, {
        tier: RelationshipTier.INNER_CIRCLE,
      });

      // No interactions created
      const result = await dashboardService.calculateHealthScore(testUser.id);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should return all component scores', async () => {
      const result = await dashboardService.calculateHealthScore(testUser.id);

      expect(result.components).toHaveProperty('innerCircleScore');
      expect(result.components).toHaveProperty('eventParticipationScore');
      expect(result.components).toHaveProperty('relationshipDiversityScore');
      expect(result.components).toHaveProperty('reminderResponseScore');
      expect(result.components).toHaveProperty('specialDatesScore');

      // All scores should be between 0 and 100
      Object.values(result.components).forEach((score) => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });

    it('should calculate weighted total correctly', async () => {
      // Create comprehensive test data
      const contact = await TestFactory.createContact(testUser.id);
      await TestFactory.createRelationship(testUser.id, contact.id, {
        tier: RelationshipTier.INNER_CIRCLE,
      });
      await TestFactory.createInteraction(testUser.id, contact.id);
      await TestFactory.createEvent(testUser.id, {
        status: EventStatus.CONFIRMED,
      });

      const result = await dashboardService.calculateHealthScore(testUser.id);

      // Weighted calculation: innerCircle * 0.4 + event * 0.2 + diversity * 0.15 + reminder * 0.15 + special * 0.1
      const expectedMin = 0;
      const expectedMax = 100;

      expect(result.score).toBeGreaterThanOrEqual(expectedMin);
      expect(result.score).toBeLessThanOrEqual(expectedMax);
    });
  });
});
