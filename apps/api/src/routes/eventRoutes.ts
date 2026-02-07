import { Router } from 'express';
import {
  getEvents,
  getEventById,
  getEventsByContact,
  createEvent,
  updateEvent,
  deleteEvent,
  cancelEvent,
  addAttendees,
  removeAttendee,
  updateRSVP,
  sendRSVPReminders,
  getEventTemplatesHandler,
  searchVenues,
} from '../controllers/eventController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All event routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /events
 * @desc    Get all events for the authenticated user
 * @query   status, startDate, endDate, page, limit, view (list|calendar), year, month
 * @access  Private
 */
router.get('/', getEvents);

/**
 * @route   POST /events
 * @desc    Create a new event with optional linked savings goal
 * @body    title, description, eventType, date, startTime, endTime,
 *          location, estimatedCost, budgetTier, isRecurring, recurringPattern,
 *          createSavingsGoal, savingsGoalName
 * @access  Private
 */
router.post('/', createEvent);

/**
 * @route   GET /events/templates
 * @desc    Get pre-defined event templates
 * @query   category (optional), id (optional)
 * @access  Private
 */
router.get('/templates', getEventTemplatesHandler);

/**
 * @route   GET /events/venues/search
 * @desc    Search for venues using Google Places API
 * @query   query (required), location, type
 * @access  Private
 */
router.get('/venues/search', searchVenues);

/**
 * @route   GET /events/contact/:contactId
 * @desc    Get all events where a contact is an attendee
 * @access  Private
 */
router.get('/contact/:contactId', getEventsByContact);

/**
 * @route   GET /events/:id
 * @desc    Get a single event by ID with full attendee list and details
 * @access  Private
 */
router.get('/:id', getEventById);

/**
 * @route   PUT /events/:id
 * @desc    Update an event (handles recurring event updates)
 * @body    any event fields, updateFutureOccurrences (for recurring events)
 * @access  Private
 */
router.put('/:id', updateEvent);

/**
 * @route   DELETE /events/:id
 * @desc    Cancel or delete an event (sets status to CANCELLED, sends notifications)
 * @query   force=true for permanent delete
 * @access  Private
 */
router.delete('/:id', deleteEvent);

/**
 * @route   POST /events/:id/cancel
 * @desc    Cancel an event (alternative to DELETE)
 * @access  Private
 */
router.post('/:id/cancel', cancelEvent);

/**
 * @route   POST /events/:id/attendees
 * @desc    Add contacts as attendees with PENDING status
 * @body    { contactIds: string[] }
 * @access  Private
 */
router.post('/:id/attendees', addAttendees);

/**
 * @route   DELETE /events/:id/attendees/:attendeeId
 * @desc    Remove an attendee from an event
 * @access  Private
 */
router.delete('/:id/attendees/:attendeeId', removeAttendee);

/**
 * @route   PUT /events/:id/attendees/:attendeeId/rsvp
 * @desc    Update an attendee's RSVP status
 * @body    { status: RSVPStatus, plusOnes?: number, dietaryRestrictions?: string }
 * @access  Private
 */
router.put('/:id/attendees/:attendeeId/rsvp', updateRSVP);

/**
 * @route   POST /events/:id/send-rsvp-reminders
 * @desc    Send RSVP reminders to attendees who haven't responded
 * @access  Private
 */
router.post('/:id/send-rsvp-reminders', sendRSVPReminders);

export default router;
