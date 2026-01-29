import { Router } from 'express';
import {
  getContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
  importContacts,
  updateRelationship,
  logInteraction,
  getInteractionHistory,
} from '../controllers/contactController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All contact routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /contacts
 * @desc    Get all contacts for the authenticated user
 * @access  Private
 * @query   page, limit, tier, search, sortBy, sortOrder
 */
router.get('/', getContacts);

/**
 * @route   POST /contacts
 * @desc    Create a new contact with relationship
 * @access  Private
 */
router.post('/', createContact);

/**
 * @route   POST /contacts/import
 * @desc    Bulk import contacts
 * @access  Private
 */
router.post('/import', importContacts);

/**
 * @route   GET /contacts/:id
 * @desc    Get a single contact by ID with full details
 * @access  Private
 */
router.get('/:id', getContactById);

/**
 * @route   PUT /contacts/:id
 * @desc    Update a contact
 * @access  Private
 */
router.put('/:id', updateContact);

/**
 * @route   DELETE /contacts/:id
 * @desc    Delete a contact (soft delete)
 * @access  Private
 */
router.delete('/:id', deleteContact);

/**
 * @route   PUT /contacts/:id/relationship
 * @desc    Update relationship settings for a contact
 * @access  Private
 */
router.put('/:id/relationship', updateRelationship);

/**
 * @route   POST /contacts/:id/interactions
 * @desc    Log an interaction with a contact
 * @access  Private
 */
router.post('/:id/interactions', logInteraction);

/**
 * @route   GET /contacts/:id/interactions
 * @desc    Get interaction history for a contact
 * @access  Private
 * @query   page, limit
 */
router.get('/:id/interactions', getInteractionHistory);

export default router;
