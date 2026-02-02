import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getMessageSuggestions,
  getEventIdeas,
  getConversationStarters,
  getRelationshipTip,
  submitFeedback,
  getUsageStats,
  getInsightHistory,
} from '../controllers/aiController';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * @route   POST /ai/message-suggestions
 * @desc    Get AI-generated message suggestions for reaching out to a contact
 * @access  Private
 * @body    { contactId, context? }
 * @context birthday | check-in | event-invite | holiday | congratulations | sympathy | thank-you | reconnect | general
 */
router.post('/message-suggestions', getMessageSuggestions);

/**
 * @route   POST /ai/event-ideas
 * @desc    Get AI-generated event/activity ideas based on parameters
 * @access  Private
 * @body    { budgetTier?, groupSize?, location?, interests?, restrictions? }
 * @budgetTier FREE | BUDGET | MODERATE | PREMIUM
 */
router.post('/event-ideas', getEventIdeas);

/**
 * @route   GET /ai/conversation-starters/:contactId
 * @desc    Get AI-generated conversation starters for a contact
 * @access  Private
 */
router.get('/conversation-starters/:contactId', getConversationStarters);

/**
 * @route   GET /ai/relationship-tip
 * @desc    Get a personalized AI-generated relationship tip
 * @access  Private
 */
router.get('/relationship-tip', getRelationshipTip);

/**
 * @route   POST /ai/feedback
 * @desc    Submit feedback for an AI insight (for improving suggestions)
 * @access  Private
 * @body    { insightId, wasUsed, feedback? }
 */
router.post('/feedback', submitFeedback);

/**
 * @route   GET /ai/usage
 * @desc    Get AI usage stats for the current user
 * @access  Private
 */
router.get('/usage', getUsageStats);

/**
 * @route   GET /ai/history
 * @desc    Get user's AI insights history
 * @access  Private
 * @query   type? - Filter by insight type
 * @query   contactId? - Filter by contact
 * @query   page? - Page number (default: 1)
 * @query   limit? - Items per page (default: 20)
 */
router.get('/history', getInsightHistory);

export default router;
