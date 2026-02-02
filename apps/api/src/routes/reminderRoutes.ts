import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getReminders,
  getReminder,
  createReminder,
  updateReminder,
  dismissReminder,
  snoozeReminder,
  markAsActedOn,
  deleteReminder,
  getReminderStats,
} from '../controllers/reminderController';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /reminders/stats
 * @desc    Get reminder statistics
 * @access  Private
 */
router.get('/stats', getReminderStats);

/**
 * @route   GET /reminders
 * @desc    Get all reminders with filters and pagination
 * @access  Private
 * @query   type - Filter by reminder type (REACH_OUT, BIRTHDAY, EVENT, etc.)
 * @query   status - Filter by status (PENDING, SENT, DISMISSED, COMPLETED)
 * @query   contactId - Filter by contact
 * @query   eventId - Filter by event
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 20)
 */
router.get('/', getReminders);

/**
 * @route   GET /reminders/:id
 * @desc    Get a single reminder by ID
 * @access  Private
 */
router.get('/:id', getReminder);

/**
 * @route   POST /reminders
 * @desc    Create a custom reminder
 * @access  Private
 * @body    { type, title, message, scheduledDate, contactId?, eventId?, isRecurring?, recurringPattern? }
 */
router.post('/', createReminder);

/**
 * @route   PUT /reminders/:id
 * @desc    Update a reminder
 * @access  Private
 * @body    { title?, message?, scheduledDate?, isRecurring?, recurringPattern?, status? }
 */
router.put('/:id', updateReminder);

/**
 * @route   POST /reminders/:id/dismiss
 * @desc    Dismiss a reminder
 * @access  Private
 */
router.post('/:id/dismiss', dismissReminder);

/**
 * @route   POST /reminders/:id/snooze
 * @desc    Snooze a reminder for a specified duration
 * @access  Private
 * @body    { duration } - Duration in minutes
 */
router.post('/:id/snooze', snoozeReminder);

/**
 * @route   POST /reminders/:id/acted
 * @desc    Mark a reminder as acted on (completed)
 * @access  Private
 */
router.post('/:id/acted', markAsActedOn);

/**
 * @route   DELETE /reminders/:id
 * @desc    Delete a reminder
 * @access  Private
 */
router.delete('/:id', deleteReminder);

export default router;
