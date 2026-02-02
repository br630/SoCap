import { Request, Response } from 'express';
import { ReminderService } from '../services/reminderService';
import { ReminderType, ReminderStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

/**
 * Get reminders with filters and pagination
 * GET /reminders
 */
export const getReminders = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const {
      type,
      status,
      contactId,
      eventId,
      page = '1',
      limit = '20',
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {
      userId,
      ...(type && { type: type as ReminderType }),
      ...(status && { status: status as ReminderStatus }),
      ...(contactId && { contactId: contactId as string }),
      ...(eventId && { eventId: eventId as string }),
    };

    const [reminders, total] = await Promise.all([
      prisma.reminder.findMany({
        where,
        include: {
          contact: {
            select: {
              id: true,
              name: true,
              profileImage: true,
            },
          },
          event: {
            select: {
              id: true,
              title: true,
              startDate: true,
            },
          },
        },
        orderBy: { scheduledDate: 'asc' },
        skip,
        take: limitNum,
      }),
      prisma.reminder.count({ where }),
    ]);

    res.json({
      success: true,
      data: reminders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get reminders error:', error);
    res.status(500).json({
      error: 'Failed to get reminders',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get a single reminder by ID
 * GET /reminders/:id
 */
export const getReminder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const reminder = await prisma.reminder.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        contact: true,
        event: true,
      },
    });

    if (!reminder) {
      res.status(404).json({ error: 'Reminder not found' });
      return;
    }

    res.json({
      success: true,
      data: reminder,
    });
  } catch (error) {
    console.error('Get reminder error:', error);
    res.status(500).json({
      error: 'Failed to get reminder',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Create a custom reminder
 * POST /reminders
 */
export const createReminder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const {
      contactId,
      eventId,
      type,
      title,
      message,
      scheduledDate,
      isRecurring,
      recurringPattern,
    } = req.body;

    // Validate required fields
    if (!type || !title || !message || !scheduledDate) {
      res.status(400).json({
        error: 'Missing required fields',
        message: 'type, title, message, and scheduledDate are required',
      });
      return;
    }

    // Validate type
    if (!Object.values(ReminderType).includes(type)) {
      res.status(400).json({
        error: 'Invalid reminder type',
        message: `Type must be one of: ${Object.values(ReminderType).join(', ')}`,
      });
      return;
    }

    const reminder = await ReminderService.createReminder(userId, {
      contactId,
      eventId,
      type,
      title,
      message,
      scheduledDate: new Date(scheduledDate),
      isRecurring: isRecurring ?? false,
      recurringPattern,
    });

    res.status(201).json({
      success: true,
      data: reminder,
    });
  } catch (error) {
    console.error('Create reminder error:', error);
    res.status(500).json({
      error: 'Failed to create reminder',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Update a reminder
 * PUT /reminders/:id
 */
export const updateReminder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { title, message, scheduledDate, isRecurring, recurringPattern, status } = req.body;

    // Verify reminder belongs to user
    const existing = await prisma.reminder.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Reminder not found' });
      return;
    }

    const reminder = await ReminderService.updateReminder(id, {
      ...(title && { title }),
      ...(message && { message }),
      ...(scheduledDate && { scheduledDate: new Date(scheduledDate) }),
      ...(isRecurring !== undefined && { isRecurring }),
      ...(recurringPattern && { recurringPattern }),
      ...(status && { status }),
    });

    res.json({
      success: true,
      data: reminder,
    });
  } catch (error) {
    console.error('Update reminder error:', error);
    res.status(500).json({
      error: 'Failed to update reminder',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Dismiss a reminder
 * POST /reminders/:id/dismiss
 */
export const dismissReminder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    // Verify reminder belongs to user
    const existing = await prisma.reminder.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Reminder not found' });
      return;
    }

    const reminder = await ReminderService.dismissReminder(id);

    res.json({
      success: true,
      data: reminder,
    });
  } catch (error) {
    console.error('Dismiss reminder error:', error);
    res.status(500).json({
      error: 'Failed to dismiss reminder',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Snooze a reminder
 * POST /reminders/:id/snooze
 */
export const snoozeReminder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { duration } = req.body; // Duration in minutes

    if (!duration || typeof duration !== 'number' || duration <= 0) {
      res.status(400).json({
        error: 'Invalid duration',
        message: 'Duration must be a positive number (in minutes)',
      });
      return;
    }

    // Verify reminder belongs to user
    const existing = await prisma.reminder.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Reminder not found' });
      return;
    }

    // Calculate new scheduled date
    const newScheduledDate = new Date();
    newScheduledDate.setMinutes(newScheduledDate.getMinutes() + duration);

    const reminder = await ReminderService.updateReminder(id, {
      scheduledDate: newScheduledDate,
      status: ReminderStatus.PENDING,
    });

    res.json({
      success: true,
      data: reminder,
    });
  } catch (error) {
    console.error('Snooze reminder error:', error);
    res.status(500).json({
      error: 'Failed to snooze reminder',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Mark reminder as acted on
 * POST /reminders/:id/acted
 */
export const markAsActedOn = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    // Verify reminder belongs to user
    const existing = await prisma.reminder.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Reminder not found' });
      return;
    }

    const reminder = await prisma.reminder.update({
      where: { id },
      data: {
        status: ReminderStatus.COMPLETED,
        actedOnAt: new Date(),
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: reminder,
    });
  } catch (error) {
    console.error('Mark as acted on error:', error);
    res.status(500).json({
      error: 'Failed to mark reminder as acted on',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Delete a reminder
 * DELETE /reminders/:id
 */
export const deleteReminder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    // Verify reminder belongs to user
    const existing = await prisma.reminder.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Reminder not found' });
      return;
    }

    await prisma.reminder.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Reminder deleted successfully',
    });
  } catch (error) {
    console.error('Delete reminder error:', error);
    res.status(500).json({
      error: 'Failed to delete reminder',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get reminder stats
 * GET /reminders/stats
 */
export const getReminderStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const [pending, sent, dismissed, completed, byType] = await Promise.all([
      prisma.reminder.count({ where: { userId, status: ReminderStatus.PENDING } }),
      prisma.reminder.count({ where: { userId, status: ReminderStatus.SENT } }),
      prisma.reminder.count({ where: { userId, status: ReminderStatus.DISMISSED } }),
      prisma.reminder.count({ where: { userId, status: ReminderStatus.COMPLETED } }),
      prisma.reminder.groupBy({
        by: ['type'],
        where: { userId },
        _count: { type: true },
      }),
    ]);

    const typeStats = byType.reduce((acc, item) => {
      acc[item.type] = item._count.type;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      success: true,
      data: {
        byStatus: {
          pending,
          sent,
          dismissed,
          completed,
        },
        byType: typeStats,
        total: pending + sent + dismissed + completed,
      },
    });
  } catch (error) {
    console.error('Get reminder stats error:', error);
    res.status(500).json({
      error: 'Failed to get reminder stats',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
