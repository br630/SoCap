import { prisma } from '../lib/prisma';
import { NotificationService } from './notificationService';
import { ReminderService } from './reminderService';
import { ContactService } from './contactService';
import { RelationshipService } from './relationshipService';
import { EventService } from './eventService';
import { ReminderType, ReminderStatus } from '@prisma/client';

export class ReminderProcessor {
  /**
   * Process all due reminders and send notifications
   * Called every 15 minutes
   */
  static async processDueReminders(): Promise<void> {
    try {
      const now = new Date();
      const dueReminders = await prisma.reminder.findMany({
        where: {
          status: ReminderStatus.PENDING,
          scheduledDate: {
            lte: now,
          },
        },
        include: {
          user: true,
          contact: true,
          event: true,
        },
      });

      for (const reminder of dueReminders) {
        try {
          // Check user's notification preferences
          const prefs = reminder.user.notificationPreferences as any;
          if (prefs?.enabled === false) {
            await prisma.reminder.update({
              where: { id: reminder.id },
              data: { status: ReminderStatus.DISMISSED },
            });
            continue;
          }

          // Check quiet hours
          if (this.isQuietHours(now, prefs?.quietHours)) {
            // Reschedule for later
            const nextCheck = new Date(now);
            nextCheck.setHours(prefs?.quietHours?.endHour || 9, 0, 0, 0);
            await prisma.reminder.update({
              where: { id: reminder.id },
              data: { scheduledDate: nextCheck },
            });
            continue;
          }

          // Send notification
          await NotificationService.sendPushNotification(
            reminder.userId,
            reminder.title,
            reminder.message,
            {
              type: 'reminder',
              reminderId: reminder.id,
              reminderType: reminder.type,
              contactId: reminder.contactId || '',
              eventId: reminder.eventId || '',
            }
          );

          // Update reminder status
          await prisma.reminder.update({
            where: { id: reminder.id },
            data: {
              status: ReminderStatus.SENT,
              sentAt: now,
            },
          });

          // Handle recurring reminders
          if (reminder.isRecurring && reminder.recurringPattern) {
            await this.scheduleNextRecurrence(reminder);
          }
        } catch (error) {
          console.error(`Failed to process reminder ${reminder.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Process due reminders error:', error);
      throw error;
    }
  }

  /**
   * Generate reach-out reminders for contacts needing attention
   */
  static async generateReachOutReminders(userId: string): Promise<void> {
    try {
      const contacts = await ContactService.getContactsWithRelationships(userId, {}, { page: 1, limit: 1000 });

      for (const contact of contacts.data) {
        if (!contact.relationship) continue;

        const lastContactDate = contact.relationship.lastContactDate
          ? new Date(contact.relationship.lastContactDate)
          : null;

        const daysSinceLastContact = lastContactDate
          ? Math.floor((Date.now() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24))
          : Infinity;

        // Determine expected frequency based on tier
        const expectedDays: Record<string, number> = {
          INNER_CIRCLE: 7,
          CLOSE_FRIENDS: 14,
          FRIENDS: 30,
          ACQUAINTANCES: 60,
          PROFESSIONAL: 90,
        };

        const expectedFrequency = expectedDays[contact.relationship.tier] || 30;

        // Check if we need to remind
        if (daysSinceLastContact >= expectedFrequency) {
          // Check if reminder already exists
          const existing = await prisma.reminder.findFirst({
            where: {
              userId,
              contactId: contact.id,
              type: ReminderType.REACH_OUT,
              status: ReminderStatus.PENDING,
            },
          });

          if (!existing) {
          await ReminderService.createReminder(userId, {
            contactId: contact.id,
            type: ReminderType.REACH_OUT,
            title: `Time to reach out to ${contact.name}`,
            message: `You haven't contacted ${contact.name} in ${daysSinceLastContact} days. Consider reaching out!`,
            scheduledDate: new Date(),
          });
          }
        }
      }
    } catch (error) {
      console.error('Generate reach-out reminders error:', error);
      throw error;
    }
  }

  /**
   * Generate birthday reminders (7 days and 1 day before)
   */
  static async generateBirthdayReminders(userId: string): Promise<void> {
    try {
      const contacts = await ContactService.getContacts(userId, {}, { page: 1, limit: 1000 });

      for (const contact of contacts.data) {
        if (!contact.birthday) continue;

        const birthday = new Date(contact.birthday);
        const today = new Date();
        const thisYear = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
        const nextYear = new Date(today.getFullYear() + 1, birthday.getMonth(), birthday.getDate());

        const upcomingBirthday = thisYear >= today ? thisYear : nextYear;
        const daysUntil = Math.floor((upcomingBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Create reminders for 7 days and 1 day before
        for (const daysBefore of [7, 1]) {
          if (daysUntil === daysBefore) {
            const existing = await prisma.reminder.findFirst({
              where: {
                userId,
                contactId: contact.id,
                type: ReminderType.BIRTHDAY,
                scheduledDate: {
                  gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
                  lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
                },
              },
            });

            if (!existing) {
              await ReminderService.createReminder(userId, {
                contactId: contact.id,
                type: ReminderType.BIRTHDAY,
                title: `${contact.name}'s birthday is ${daysBefore === 7 ? 'in a week' : 'tomorrow'}!`,
                message: `${contact.name}'s birthday is coming up. Don't forget to wish them!`,
                scheduledDate: new Date(),
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Generate birthday reminders error:', error);
      throw error;
    }
  }

  /**
   * Generate event reminders based on event settings
   */
  static async generateEventReminders(userId: string): Promise<void> {
    try {
      const events = await EventService.getEvents(userId, { page: 1, limit: 1000 });

      for (const event of events.data) {
        if (event.status !== 'CONFIRMED' && event.status !== 'PLANNING') continue;
        if (!event.startDate) continue;

        const eventDate = new Date(event.startDate);
        const today = new Date();
        const daysUntil = Math.floor((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Default reminder days (can be customized per event)
        const reminderDays = [7, 1, 0]; // 1 week, 1 day, day of

        for (const daysBefore of reminderDays) {
          if (daysUntil === daysBefore) {
            const existing = await prisma.reminder.findFirst({
              where: {
                userId,
                eventId: event.id,
                type: ReminderType.EVENT,
                scheduledDate: {
                  gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
                  lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
                },
              },
            });

            if (!existing) {
              await ReminderService.createReminder(userId, {
                eventId: event.id,
                type: ReminderType.EVENT,
                title: daysBefore === 0 ? `Event: ${event.title} is today!` : `Event reminder: ${event.title}`,
                message: `${event.title} is ${daysBefore === 0 ? 'today' : `in ${daysBefore} day${daysBefore > 1 ? 's' : ''}`}`,
                scheduledDate: new Date(),
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Generate event reminders error:', error);
      throw error;
    }
  }

  /**
   * Generate weekly summary (Sunday morning)
   */
  static async generateWeeklySummary(userId: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return;

      const prefs = user.notificationPreferences as any;
      if (prefs?.weeklySummary === false) return;

      // Get stats for the week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const [contactsCount, eventsCount, interactionsCount] = await Promise.all([
        prisma.contact.count({ where: { userId, isDeleted: false } }),
        prisma.event.count({
          where: {
            userId,
            startDate: { gte: weekAgo },
          },
        }),
        prisma.interaction.count({
          where: {
            relationship: { userId },
            date: { gte: weekAgo },
          },
        }),
      ]);

      await NotificationService.sendPushNotification(
        userId,
        'Weekly Summary',
        `You have ${contactsCount} contacts, ${eventsCount} upcoming events, and logged ${interactionsCount} interactions this week.`,
        {
          type: 'weekly_summary',
        }
      );
    } catch (error) {
      console.error('Generate weekly summary error:', error);
      throw error;
    }
  }

  /**
   * Check if current time is within quiet hours
   */
  private static isQuietHours(now: Date, quietHours?: { startHour?: number; endHour?: number }): boolean {
    if (!quietHours || !quietHours.startHour || !quietHours.endHour) return false;

    const hour = now.getHours();
    if (quietHours.startHour < quietHours.endHour) {
      return hour >= quietHours.startHour && hour < quietHours.endHour;
    } else {
      // Overnight quiet hours (e.g., 22:00 - 08:00)
      return hour >= quietHours.startHour || hour < quietHours.endHour;
    }
  }

  /**
   * Schedule next occurrence for recurring reminder
   */
  private static async scheduleNextRecurrence(reminder: any): Promise<void> {
    const pattern = reminder.recurringPattern as any;
    if (!pattern || !pattern.frequency) return;

    const nextDate = new Date(reminder.scheduledDate);
    switch (pattern.frequency) {
      case 'DAILY':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'WEEKLY':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'MONTHLY':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      default:
        return;
    }

    await prisma.reminder.create({
      data: {
        userId: reminder.userId,
        contactId: reminder.contactId,
        eventId: reminder.eventId,
        type: reminder.type,
        title: reminder.title,
        message: reminder.message,
        scheduledDate: nextDate,
        isRecurring: true,
        recurringPattern: pattern,
        status: ReminderStatus.PENDING,
      },
    });
  }
}
