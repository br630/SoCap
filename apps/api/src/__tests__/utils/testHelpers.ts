import { PrismaClient, User, Contact, Event, RelationshipTier, RelationshipType, EventStatus, BudgetTier } from '@prisma/client';
import { prisma } from '../setup';
import bcrypt from 'bcryptjs';

/**
 * Test data factories
 */
export class TestFactory {
  /**
   * Create a test user
   */
  static async createUser(overrides?: Partial<User>): Promise<User> {
    const defaultUser = {
      email: `test-${Date.now()}@example.com`,
      passwordHash: await bcrypt.hash('Test123!@#', 10),
      firstName: 'Test',
      lastName: 'User',
      timezone: 'UTC',
      isVerified: true,
      isActive: true,
      notificationPreferences: {
        email: true,
        push: true,
        sms: false,
      },
      ...overrides,
    };

    return prisma.user.create({
      data: defaultUser,
    });
  }

  /**
   * Create a test contact
   */
  static async createContact(userId: string, overrides?: Partial<Contact>): Promise<Contact> {
    const defaultContact = {
      userId,
      name: `Test Contact ${Date.now()}`,
      phone: '+1234567890',
      email: `contact-${Date.now()}@example.com`,
      importSource: 'MANUAL' as const,
      isDeleted: false,
      ...overrides,
    };

    return prisma.contact.create({
      data: defaultContact,
    });
  }

  /**
   * Create a test relationship
   */
  static async createRelationship(
    userId: string,
    contactId: string,
    overrides?: {
      tier?: RelationshipTier;
      relationshipType?: RelationshipType;
    }
  ) {
    return prisma.relationship.create({
      data: {
        userId,
        contactId,
        tier: overrides?.tier || RelationshipTier.CLOSE_FRIENDS,
        relationshipType: overrides?.relationshipType || RelationshipType.FRIEND,
        communicationFrequency: 'WEEKLY',
        healthScore: 75,
        ...overrides,
      },
    });
  }

  /**
   * Create a test event
   */
  static async createEvent(userId: string, overrides?: Partial<Event>): Promise<Event> {
    const defaultEvent = {
      userId,
      title: `Test Event ${Date.now()}`,
      eventType: 'SOCIAL',
      date: new Date(),
      startTime: '10:00',
      endTime: '12:00',
      timezone: 'UTC',
      estimatedCost: 100,
      budgetTier: BudgetTier.MODERATE,
      status: EventStatus.PLANNED,
      ...overrides,
    };

    return prisma.event.create({
      data: defaultEvent,
    });
  }

  /**
   * Create a test interaction
   */
  static async createInteraction(
    userId: string,
    contactId: string,
    overrides?: {
      type?: string;
      date?: Date;
    }
  ) {
    return prisma.interaction.create({
      data: {
        userId,
        contactId,
        type: overrides?.type || 'CALL',
        date: overrides?.date || new Date(),
        notes: 'Test interaction',
      },
    });
  }

  /**
   * Create a test reminder
   */
  static async createReminder(
    userId: string,
    overrides?: {
      contactId?: string;
      eventId?: string;
      scheduledDate?: Date;
    }
  ) {
    return prisma.reminder.create({
      data: {
        userId,
        contactId: overrides?.contactId || null,
        eventId: overrides?.eventId || null,
        type: 'FOLLOW_UP',
        title: 'Test Reminder',
        message: 'Test reminder message',
        scheduledDate: overrides?.scheduledDate || new Date(),
        status: 'PENDING',
      },
    });
  }
}

/**
 * Database cleanup utilities
 */
export class TestCleanup {
  /**
   * Clean all test data
   */
  static async cleanAll() {
    // Delete in order to respect foreign key constraints
    await prisma.eventAttendee.deleteMany({});
    await prisma.interaction.deleteMany({});
    await prisma.reminder.deleteMany({});
    await prisma.relationship.deleteMany({});
    await prisma.savingsGoal.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.contact.deleteMany({});
    await prisma.calendarCredential.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.user.deleteMany({});
  }

  /**
   * Clean user and related data
   */
  static async cleanUser(userId: string) {
    await prisma.eventAttendee.deleteMany({
      where: {
        event: { userId },
      },
    });
    await prisma.interaction.deleteMany({ where: { userId } });
    await prisma.reminder.deleteMany({ where: { userId } });
    await prisma.relationship.deleteMany({ where: { userId } });
    await prisma.savingsGoal.deleteMany({ where: { userId } });
    await prisma.event.deleteMany({ where: { userId } });
    await prisma.contact.deleteMany({ where: { userId } });
    await prisma.calendarCredential.deleteMany({ where: { userId } });
    await prisma.auditLog.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
  }
}

/**
 * Mock utilities
 */
export class MockHelpers {
  /**
   * Mock Firebase Admin
   */
  static mockFirebaseAdmin() {
    return {
      auth: () => ({
        verifyIdToken: jest.fn().mockResolvedValue({
          uid: 'test-uid',
          email: 'test@example.com',
        }),
        createCustomToken: jest.fn().mockResolvedValue('mock-custom-token'),
      }),
    };
  }

  /**
   * Mock OpenAI responses
   */
  static mockOpenAI() {
    return {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: 'Mock AI response',
                },
              },
            ],
          }),
        },
      },
    };
  }

  /**
   * Mock Google Calendar API
   */
  static mockGoogleCalendar() {
    return {
      calendar: {
        v3: {
          calendars: {
            list: jest.fn().mockResolvedValue({
              data: {
                items: [
                  {
                    id: 'primary',
                    summary: 'Primary Calendar',
                  },
                ],
              },
            }),
          },
          events: {
            list: jest.fn().mockResolvedValue({
              data: {
                items: [],
              },
            }),
            insert: jest.fn().mockResolvedValue({
              data: {
                id: 'event-id',
                summary: 'Test Event',
              },
            }),
            update: jest.fn().mockResolvedValue({
              data: {
                id: 'event-id',
                summary: 'Updated Event',
              },
            }),
            delete: jest.fn().mockResolvedValue({}),
            freebusy: {
              query: jest.fn().mockResolvedValue({
                data: {
                  calendars: {
                    primary: {
                      busy: [],
                    },
                  },
                },
              }),
            },
          },
        },
      },
    };
  }
}
