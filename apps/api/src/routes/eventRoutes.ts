import { Router } from 'express';
import {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
} from '../controllers/eventController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All event routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /events
 * @desc    Get all events for the authenticated user
 * @access  Private
 */
router.get('/', getEvents);

/**
 * @route   GET /events/:id
 * @desc    Get a single event by ID
 * @access  Private
 */
router.get('/:id', getEventById);

/**
 * @route   POST /events
 * @desc    Create a new event
 * @access  Private
 */
router.post('/', createEvent);

/**
 * @route   PUT /events/:id
 * @desc    Update an event
 * @access  Private
 */
router.put('/:id', updateEvent);

/**
 * @route   DELETE /events/:id
 * @desc    Delete an event
 * @access  Private
 */
router.delete('/:id', deleteEvent);

export default router;
