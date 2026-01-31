import cron from 'node-cron';
import { ReminderProcessor } from '../services/reminderProcessor';
import { prisma } from '../lib/prisma';

/**
 * Initialize and start all reminder cron jobs
 */
export function startReminderCronJobs(): void {
  // Process due reminders every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    try {
      console.log('[Cron] Processing due reminders...');
      await ReminderProcessor.processDueReminders();
      console.log('[Cron] Due reminders processed');
    } catch (error) {
      console.error('[Cron] Error processing due reminders:', error);
    }
  });

  // Generate new reminders daily at 8 AM
  cron.schedule('0 8 * * *', async () => {
    try {
      console.log('[Cron] Generating daily reminders...');
      const users = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true },
      });

      for (const user of users) {
        try {
          await ReminderProcessor.generateReachOutReminders(user.id);
          await ReminderProcessor.generateBirthdayReminders(user.id);
          await ReminderProcessor.generateEventReminders(user.id);
        } catch (error) {
          console.error(`[Cron] Error generating reminders for user ${user.id}:`, error);
        }
      }

      console.log('[Cron] Daily reminders generated');
    } catch (error) {
      console.error('[Cron] Error generating daily reminders:', error);
    }
  });

  // Generate weekly summaries on Sunday at 9 AM
  cron.schedule('0 9 * * 0', async () => {
    try {
      console.log('[Cron] Generating weekly summaries...');
      const users = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true },
      });

      for (const user of users) {
        try {
          await ReminderProcessor.generateWeeklySummary(user.id);
        } catch (error) {
          console.error(`[Cron] Error generating weekly summary for user ${user.id}:`, error);
        }
      }

      console.log('[Cron] Weekly summaries generated');
    } catch (error) {
      console.error('[Cron] Error generating weekly summaries:', error);
    }
  });

  console.log('✅ Reminder cron jobs started');
}
