import { Prisma, Reminder, ReminderType, ReminderStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface CreateReminderData {
  contactId?: string;
  eventId?: string;
  type: ReminderType;
  title: string;
  message: string;
  scheduledDate: Date;
  isRecurring?: boolean;
  recurringPattern?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
  status?: ReminderStatus;
}

export interface UpdateReminderData {
  title?: string;
  message?: string;
  scheduledDate?: Date;
  isRecurring?: boolean;
  recurringPattern?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
  status?: ReminderStatus;
}

export interface ReminderFilters {
  type?: ReminderType;
  status?: ReminderStatus;
  contactId?: string;
  eventId?: string;
  dueBefore?: Date;
  dueAfter?: Date;
}

export class ReminderService {
  /**
   * Create a new reminder
   */
  static async createReminder(userId: string, data: CreateReminderData): Promise<Reminder> {
    try {
      // Verify contact belongs to user if provided
      if (data.contactId) {
        const contact = await prisma.contact.findFirst({
          where: {
            id: data.contactId,
            userId,
            isDeleted: false,
          },
        });

        if (!contact) {
          throw new Error('Contact not found');
        }
      }

      // Verify event belongs to user if provided
      if (data.eventId) {
        const event = await prisma.event.findFirst({
          where: {
            id: data.eventId,
            userId,
          },
        });

        if (!event) {
          throw new Error('Event not found');
        }
      }

      const reminder = await prisma.reminder.create({
        data: {
          userId,
          contactId: data.contactId,
          eventId: data.eventId,
          type: data.type,
          title: data.title,
          message: data.message,
          scheduledDate: data.scheduledDate,
          isRecurring: data.isRecurring ?? false,
          recurringPattern: data.recurringPattern,
          status: data.status ?? 'PENDING',
        },
      });

      return reminder;
    } catch (error) {
      if (error instanceof Error && (error.message === 'Contact not found' || error.message === 'Event not found')) {
        throw error;
      }
      throw new Error(`Failed to create reminder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get reminders with filters
   */
  static async getReminders(userId: string, filters?: ReminderFilters): Promise<Reminder[]> {
    try {
      const where: Prisma.ReminderWhereInput = {
        userId,
        ...(filters?.type && { type: filters.type }),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.contactId && { contactId: filters.contactId }),
        ...(filters?.eventId && { eventId: filters.eventId }),
        ...(filters?.dueBefore || filters?.dueAfter
          ? {
              scheduledDate: {
                ...(filters.dueAfter && { gte: filters.dueAfter }),
                ...(filters.dueBefore && { lte: filters.dueBefore }),
              },
            }
          : {}),
      };

      const reminders = await prisma.reminder.findMany({
        where,
        include: {
          contact: true,
          event: true,
        },
        orderBy: { scheduledDate: 'asc' },
      });

      return reminders;
    } catch (error) {
      throw new Error(`Failed to get reminders: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update reminder
   */
  static async updateReminder(reminderId: string, data: UpdateReminderData): Promise<Reminder> {
    try {
      const reminder = await prisma.reminder.update({
        where: { id: reminderId },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });

      return reminder;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new Error('Reminder not found');
        }
      }
      throw new Error(`Failed to update reminder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Dismiss reminder (set status to DISMISSED)
   */
  static async dismissReminder(reminderId: string): Promise<Reminder> {
    try {
      const reminder = await prisma.reminder.update({
        where: { id: reminderId },
        data: {
          status: 'DISMISSED',
          updatedAt: new Date(),
        },
      });

      return reminder;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new Error('Reminder not found');
        }
      }
      throw new Error(`Failed to dismiss reminder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get due reminders (for cron job)
   */
  static async getDueReminders(now: Date = new Date()): Promise<Reminder[]> {
    try {
      const reminders = await prisma.reminder.findMany({
        where: {
          status: 'PENDING',
          scheduledDate: {
            lte: now,
          },
        },
        include: {
          user: true,
          contact: true,
          event: true,
        },
        orderBy: { scheduledDate: 'asc' },
      });

      return reminders;
    } catch (error) {
      throw new Error(`Failed to get due reminders: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Mark reminder as sent
   */
  static async markAsSent(reminderId: string): Promise<Reminder> {
    try {
      const reminder = await prisma.reminder.update({
        where: { id: reminderId },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return reminder;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new Error('Reminder not found');
        }
      }
      throw new Error(`Failed to mark reminder as sent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
